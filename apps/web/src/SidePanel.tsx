import { useState, useRef, useEffect, type FormEvent } from "react";
import type { Workbook, ChartSpec } from "@aicell/shared";
import { callAiAgent, type ChatTurn, type PlanStep } from "./api";

type Props = {
  workbook: Workbook;
  aiEnabled: boolean;
  onClose: () => void;
  onApplySetCell: (sheet: string, row: number, col: number, raw: string) => void;
  onApplyAddSheet: (name: string) => void;
  onApplyAddChart: (sheet: string, spec: Omit<ChartSpec, "id">) => void;
};

type Turn =
  | { kind: "user"; content: string }
  | { kind: "assistant"; content: string; plan?: PlanStep[]; planApplied?: boolean };

export function SidePanel({
  workbook,
  aiEnabled,
  onClose,
  onApplySetCell,
  onApplyAddSheet,
  onApplyAddChart,
}: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, busy]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError(null);

    const userTurn: Turn = { kind: "user", content: text };
    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setInput("");
    setBusy(true);

    const transcript: ChatTurn[] = nextTurns.map((t) => ({
      role: t.kind === "user" ? "user" : "assistant",
      content: t.content,
    }));

    try {
      const result = await callAiAgent({ messages: transcript, workbook });
      setTurns((cur) => [
        ...cur,
        {
          kind: "assistant",
          content: result.reply,
          plan: result.plan.length > 0 ? result.plan : undefined,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const applyPlan = (turnIdx: number, selectedIdx: Set<number>) => {
    setTurns((cur) => {
      const turn = cur[turnIdx];
      if (!turn || turn.kind !== "assistant" || !turn.plan) return cur;
      for (let i = 0; i < turn.plan.length; i++) {
        if (!selectedIdx.has(i)) continue;
        const step = turn.plan[i]!;
        if (step.tool === "add_sheet") {
          onApplyAddSheet(step.args.name);
        } else if (step.tool === "set_cell") {
          onApplySetCell(step.args.sheet, step.args.row, step.args.col, step.args.raw);
        } else if (step.tool === "create_chart") {
          onApplyAddChart(step.args.sheet, {
            title: step.args.title,
            type: step.args.type,
            range: step.args.range,
          });
        }
      }
      const updated = [...cur];
      updated[turnIdx] = { ...turn, planApplied: true };
      return updated;
    });
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
        {turns.length === 0 && aiEnabled && (
          <div className="side-panel-empty">
            <p>Hi — I can see your workbook. Try:</p>
            <ul>
              <li>"Add a Total column that sums each row"</li>
              <li>"Audit my formulas for issues"</li>
              <li>"Forecast the next 3 periods of column B"</li>
              <li>"Create a bar chart of A1:B10"</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              I'll propose a plan; you review and apply.
            </p>
          </div>
        )}
        {turns.map((t, i) =>
          t.kind === "user" ? (
            <UserMsg key={i} content={t.content} />
          ) : (
            <AssistantMsg
              key={i}
              turn={t}
              onApply={(selected) => applyPlan(i, selected)}
            />
          )
        )}
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

function UserMsg({ content }: { content: string }) {
  return (
    <div className="chat-msg chat-msg-user">
      <div className="chat-msg-role">You</div>
      <div className="chat-msg-body">{content}</div>
    </div>
  );
}

function AssistantMsg({
  turn,
  onApply,
}: {
  turn: Extract<Turn, { kind: "assistant" }>;
  onApply: (selected: Set<number>) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set((turn.plan ?? []).map((_, i) => i))
  );

  const toggle = (i: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="chat-msg chat-msg-assistant">
      <div className="chat-msg-role">Claude</div>
      {turn.content && <div className="chat-msg-body">{turn.content}</div>}
      {turn.plan && turn.plan.length > 0 && (
        <div className="plan-card">
          <div className="plan-card-title">
            Plan ({turn.plan.length} step{turn.plan.length === 1 ? "" : "s"})
            {turn.planApplied && " — applied"}
          </div>
          {turn.plan.map((step, i) => (
            <label key={i} className="plan-step">
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggle(i)}
                disabled={turn.planApplied}
              />
              <span>
                <span className="plan-step-tool">{step.tool}</span>{" "}
                {describeStep(step)}
              </span>
            </label>
          ))}
          {!turn.planApplied && (
            <div className="plan-actions">
              <button
                className="primary"
                disabled={selected.size === 0}
                onClick={() => onApply(selected)}
              >
                Apply ({selected.size})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function describeStep(step: PlanStep): string {
  if (step.tool === "set_cell") {
    const { sheet, row, col, raw } = step.args;
    return `${sheet} · ${columnLetters(col)}${row + 1} = ${truncate(raw, 60)}`;
  }
  if (step.tool === "add_sheet") {
    return `"${step.args.name}"`;
  }
  return `${step.args.type} chart "${step.args.title}" of ${step.args.sheet}!${step.args.range}`;
}

function columnLetters(col: number): string {
  let n = col;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
