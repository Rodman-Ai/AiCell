import { useState, useRef, useEffect, type FormEvent } from "react";
import type { Workbook } from "@aicell/shared";
import { callAiChat, type ChatTurn } from "./api";

type Props = {
  workbook: Workbook;
  aiEnabled: boolean;
  onClose: () => void;
};

export function SidePanel({ workbook, aiEnabled, onClose }: Props) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    const next: ChatTurn[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const reply = await callAiChat({ messages: next, workbook });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="side-panel">
      <header className="side-panel-header">
        <span>Ask Claude</span>
        <button onClick={onClose} aria-label="Close panel">×</button>
      </header>
      <div className="side-panel-messages" ref={scrollRef}>
        {!aiEnabled && (
          <div className="side-panel-notice">
            AI is not configured. Set <code>ANTHROPIC_API_KEY</code> in the API service environment to enable.
          </div>
        )}
        {messages.length === 0 && aiEnabled && (
          <div className="side-panel-empty">
            <p>Hi — I can see your workbook. Try:</p>
            <ul>
              <li>"Summarize this sheet"</li>
              <li>"Which row has the highest value in column B?"</li>
              <li>"Suggest a formula to total column C"</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role}`}>
            <div className="chat-msg-role">{m.role === "user" ? "You" : "Claude"}</div>
            <div className="chat-msg-body">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-role">Claude</div>
            <div className="chat-msg-body chat-typing">…</div>
          </div>
        )}
        {error && <div className="side-panel-error">{error}</div>}
      </div>
      <form className="side-panel-input" onSubmit={onSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={aiEnabled ? "Ask anything…" : "AI disabled"}
          disabled={!aiEnabled || busy}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSubmit(e as unknown as FormEvent);
            }
          }}
        />
        <button type="submit" disabled={!aiEnabled || busy || !input.trim()}>
          Send
        </button>
      </form>
    </aside>
  );
}
