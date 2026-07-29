import type {
  ChatCompletionFunctionTool,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { createAzureOpenAiClient } from "@/lib/azure-openai-client";
import { azureOpenAiDeployment } from "@/lib/env";
import { chatAgentTools, type ProposePurchaseResult } from "@/lib/agent-tools";

const MAX_TOOL_ROUNDS = 5;

const SYSTEM_PROMPT = `You are a shopping assistant for a furniture catalogue. You have three real tools — search_catalogue, get_product, check_balance — plus propose_purchase, which is NOT a real purchase.

Tool honesty:
- search_catalogue's category/keyword/colour filters are literal, case-insensitive substring matches — not fuzzy, not semantic. Its price filters (minPrice/maxPrice) are exact numeric bounds.
- It does NOT understand subjective or vague criteria: "cheap", "nice", "modern", "cozy", a loosely-described colour, or "vibe" have no meaning to the tool. Never put words like that into a tool parameter expecting it to understand them.
- Instead, when the request includes subjective/fuzzy criteria, call search_catalogue with only the concrete parts (e.g. a category or an exact keyword, maybe a literal colour word if one was given), look at the actual prices/names/colours in the plain results you get back, and apply your OWN judgment to pick or rank what best fits — e.g. for "cheap", identify the lower-priced items among the real results yourself, don't expect a "cheap" filter to exist.
- If results seem too narrow or empty, try a broader or different concrete term rather than giving up immediately, but don't loop indefinitely.

Purchase safety — read carefully:
- You cannot place a real order. There is no tool for it available to you.
- If the user clearly wants to buy/order/get a specific item, call propose_purchase with the exact item_id, name, and unitPrice you have (from search_catalogue or get_product) and then STOP — write a short message presenting it and wait. A human confirmation step outside this conversation is what actually completes the purchase, never you.
- Never call propose_purchase speculatively, for browsing/comparison requests, or for more than one item at a time.
- Never claim or imply that a purchase has happened, that you "bought" something, or that a proposal is the same as a completed order.
- Don't assume a later message is confirmation unless it clearly and unambiguously is.

General:
- Be concise and concrete: reference actual product names, prices, and categories from tool results. Never invent a product, item_id, or price.
- If affordability is relevant to the question, call check_balance — and before proposing something, if you already have a balance figure, consider whether it's actually affordable.

If a purchase attempt failed (insufficient balance or the item no longer existing):
- Never show or repeat raw error text, codes, or technical details.
- Explain in plain, friendly language what happened (e.g. "that's a bit more than your remaining balance" or "that item doesn't seem to be available anymore").
- Always suggest a concrete next step: a cheaper alternative (search for one), buying fewer, or picking a different item — don't just state the failure and stop.`;

export type ToolCallLogEntry = {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
};

export type AgentTurnResult = {
  history: ChatCompletionMessageParam[];
  assistantText: string;
  proposal: ProposePurchaseResult | null;
  toolLog: ToolCallLogEntry[];
};

const toolsByName = new Map(chatAgentTools.map((tool) => [tool.name, tool]));

const openAiTools: ChatCompletionFunctionTool[] = chatAgentTools.map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}));

function isProposeResult(
  name: string,
  result: unknown
): result is ProposePurchaseResult {
  return (
    name === "propose_purchase" &&
    typeof result === "object" &&
    result !== null &&
    !("error" in result)
  );
}

// Runs one user turn through a tool-calling loop against Azure OpenAI.
// `history` is the full prior conversation (excluding the system prompt,
// which is re-added fresh each call) — the caller (a server action) persists
// whatever this returns and passes it back in on the next turn.
export async function runAgentTurn(
  history: ChatCompletionMessageParam[],
  userMessage: string
): Promise<AgentTurnResult> {
  const client = createAzureOpenAiClient();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage },
  ];

  const toolLog: ToolCallLogEntry[] = [];
  let proposal: ProposePurchaseResult | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.chat.completions.create({
      model: azureOpenAiDeployment!,
      messages,
      tools: openAiTools,
      tool_choice: "auto",
    });

    const choice = response.choices[0]?.message;
    if (!choice) {
      throw new Error("Azure OpenAI returned no response.");
    }

    messages.push(choice);

    const toolCalls = (choice.tool_calls ?? []).filter(
      (call) => call.type === "function"
    );

    if (toolCalls.length === 0) {
      return {
        history: messages.slice(1),
        assistantText: choice.content ?? "",
        proposal,
        toolLog,
      };
    }

    for (const call of toolCalls) {
      const tool = toolsByName.get(call.function.name);
      let args: Record<string, unknown> = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        // malformed args — tool execution below will just get {} and likely
        // fail its own validation, which is fine, that becomes tool output.
      }

      let result: unknown;
      if (!tool) {
        result = { error: `Unknown tool: ${call.function.name}` };
      } else {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await tool.execute(args as any);
        } catch (err) {
          console.error(`Agent tool "${call.function.name}" failed:`, err);
          result = {
            error: "This tool failed unexpectedly. Try a different approach.",
          };
        }
      }

      toolLog.push({ name: call.function.name, args, result });
      if (isProposeResult(call.function.name, result)) {
        proposal = result;
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    history: messages.slice(1),
    assistantText:
      "I wasn't able to finish that within a reasonable number of steps — try rephrasing or breaking it into a smaller request.",
    proposal,
    toolLog,
  };
}
