"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { sendAgentMessage } from "@/app/agent/actions";
import { buyNow } from "@/app/buy-now-actions";
import type { ProposePurchaseResult } from "@/lib/agent-tools";
import type { ToolCallLogEntry } from "@/lib/agent";

type BuyOutcome =
  | { status: "confirming" }
  | { status: "success"; orderId: string; totalPrice: number; remainingBalance: number };

type DisplayMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "error"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      toolLog: ToolCallLogEntry[];
      proposal: ProposePurchaseResult | null;
      buyOutcome: BuyOutcome | null;
    };

function newId() {
  return Math.random().toString(36).slice(2);
}

export default function AgentChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ChatCompletionMessageParam[]>([]);
  const [input, setInput] = useState("");
  const [isSending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((prev) => [...prev, { id: newId(), role: "user", text }]);

    startTransition(async () => {
      const result = await sendAgentMessage(history, text);
      if ("error" in result) {
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "error", text: result.error },
        ]);
        return;
      }
      setHistory(result.history);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          text: result.assistantText,
          toolLog: result.toolLog,
          proposal: result.proposal,
          buyOutcome: null,
        },
      ]);
    });
  }

  function handleConfirmPurchase(messageId: string, proposal: ProposePurchaseResult) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.role === "assistant"
          ? { ...m, buyOutcome: { status: "confirming" } }
          : m
      )
    );

    startTransition(async () => {
      const result = await buyNow(proposal.itemId, proposal.unitPrice, proposal.quantity);

      if ("error" in result) {
        // Don't show the raw error — clear the proposal card and let the
        // agent explain what happened, in plain language, in a new turn.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.role === "assistant"
              ? { ...m, proposal: null, buyOutcome: null }
              : m
          )
        );

        const note = `(The purchase attempt for ${proposal.name} x${proposal.quantity} failed: ${result.error}) Explain this to the user in plain, friendly language and suggest a concrete alternative — do not show or repeat the raw error text.`;
        const explanation = await sendAgentMessage(history, note);
        if ("error" in explanation) {
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              text: "That purchase didn't go through, and I'm having trouble reaching the assistant to explain further — please try again in a moment.",
              toolLog: [],
              proposal: null,
              buyOutcome: null,
            },
          ]);
          return;
        }
        setHistory(explanation.history);
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            text: explanation.assistantText,
            toolLog: explanation.toolLog,
            proposal: explanation.proposal,
            buyOutcome: null,
          },
        ]);
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.role === "assistant"
            ? {
                ...m,
                buyOutcome: {
                  status: "success",
                  orderId: result.orderId,
                  totalPrice: result.totalPrice,
                  remainingBalance: result.remainingBalance,
                },
              }
            : m
        )
      );

      router.refresh();
      // Let future turns know what actually happened — the model never
      // saw this purchase happen, since it can't place orders itself.
      setHistory((prev) => [
        ...prev,
        {
          role: "user",
          content: `(I confirmed the proposed purchase.) Order placed: ${proposal.name} x${proposal.quantity}, $${result.totalPrice} charged, new balance $${result.remainingBalance}.`,
        },
      ]);
    });
  }

  function handleCancelPurchase(messageId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.role === "assistant"
          ? { ...m, proposal: null }
          : m
      )
    );
    setHistory((prev) => [
      ...prev,
      { role: "user", content: "(I don't want to buy that.)" },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">No messages yet — try asking something below.</p>
        )}
        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.id} className="self-end max-w-[85%] bg-black text-white rounded-lg px-3 py-2 text-sm">
                {message.text}
              </div>
            );
          }
          if (message.role === "error") {
            return (
              <p
                key={message.id}
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2"
              >
                {message.text}
              </p>
            );
          }
          return (
            <div key={message.id} className="flex flex-col gap-2 max-w-[85%]">
              <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
                {message.text}
              </div>

              {message.toolLog.length > 0 && (
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer select-none">
                    {message.toolLog.length} tool call
                    {message.toolLog.length > 1 ? "s" : ""}
                  </summary>
                  <ul className="mt-1 flex flex-col gap-1">
                    {message.toolLog.map((entry, i) => (
                      <li key={i}>
                        <code>{entry.name}</code>({JSON.stringify(entry.args)})
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {message.proposal && (
                <div className="border border-gray-300 rounded-lg p-3 text-sm flex flex-col gap-2">
                  <p>
                    Proposed: <span className="font-medium">{message.proposal.name}</span>{" "}
                    x{message.proposal.quantity} — $
                    {message.proposal.totalPrice.toLocaleString()}
                    {message.proposal.reason && (
                      <span className="text-gray-500"> ({message.proposal.reason})</span>
                    )}
                  </p>

                  {(!message.buyOutcome ||
                    message.buyOutcome.status === "confirming") && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirmPurchase(message.id, message.proposal!)}
                        disabled={message.buyOutcome?.status === "confirming"}
                        className="bg-black text-white rounded px-3 py-1.5 text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
                      >
                        {message.buyOutcome?.status === "confirming"
                          ? "Buying…"
                          : "Confirm & buy"}
                      </button>
                      <button
                        onClick={() => handleCancelPurchase(message.id)}
                        disabled={message.buyOutcome?.status === "confirming"}
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {message.buyOutcome?.status === "success" && (
                    <p className="text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5">
                      Order placed (#{message.buyOutcome.orderId.slice(0, 8)}) — $
                      {message.buyOutcome.totalPrice.toLocaleString()} charged. New
                      balance: ${message.buyOutcome.remainingBalance.toLocaleString()}.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {isSending && <p className="text-sm text-gray-400">Thinking…</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about furniture, prices, or your balance…"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="bg-black text-white rounded px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
}
