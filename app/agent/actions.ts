"use server";

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getSession } from "@/lib/session";
import { runAgentTurn, type ToolCallLogEntry } from "@/lib/agent";
import type { ProposePurchaseResult } from "@/lib/agent-tools";

export type SendAgentMessageResult =
  | { error: string }
  | {
      history: ChatCompletionMessageParam[];
      assistantText: string;
      proposal: ProposePurchaseResult | null;
      toolLog: ToolCallLogEntry[];
    };

export async function sendAgentMessage(
  history: ChatCompletionMessageParam[],
  userMessage: string
): Promise<SendAgentMessageResult> {
  const session = await getSession();
  if (!session.userId) {
    return { error: "You need to be logged in to use the assistant." };
  }

  const trimmed = userMessage.trim();
  if (!trimmed) {
    return { error: "Type a message first." };
  }

  try {
    return await runAgentTurn(history, trimmed);
  } catch (err) {
    console.error("Agent turn failed:", err);
    return {
      error: "Couldn't reach the assistant right now — try again in a moment.",
    };
  }
}
