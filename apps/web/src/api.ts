import type { Workbook } from "@aicell/shared";
import type { CellFn } from "@aicell/calc";

/**
 * Build-time API base. Default `/api` works in dev (proxied to localhost:3000)
 * and any deploy that fronts the API at the same origin. To deploy a static-only
 * build (e.g., to GitHub Pages with no backend), build with VITE_API_BASE="" —
 * the app then runs in demo mode with no persistence and no AI calls.
 */
const RAW_BASE = import.meta.env.VITE_API_BASE;
const BASE = RAW_BASE === undefined ? "/api" : RAW_BASE;
export const isOffline = BASE === "";

export type WorkbookSummary = { id: string; name: string; updatedAt: number };

export async function listWorkbooks(): Promise<WorkbookSummary[]> {
  const res = await fetch(`${BASE}/workbooks`);
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const body = (await res.json()) as { workbooks: WorkbookSummary[] };
  return body.workbooks;
}

export async function loadWorkbook(id: string): Promise<Workbook | null> {
  const res = await fetch(`${BASE}/workbooks/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`load failed: ${res.status}`);
  const body = (await res.json()) as { workbook: Workbook };
  return body.workbook;
}

export async function saveWorkbook(workbook: Workbook): Promise<{ updatedAt: number }> {
  const res = await fetch(`${BASE}/workbooks/${encodeURIComponent(workbook.id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workbook }),
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
  return (await res.json()) as { updatedAt: number };
}

export async function getHealth(): Promise<{ ok: boolean; ai: boolean }> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`health failed: ${res.status}`);
  return (await res.json()) as { ok: boolean; ai: boolean };
}

export async function callAiCell(req: {
  fn: CellFn;
  prompt: string;
  args?: string[];
}): Promise<string> {
  const res = await fetch(`${BASE}/ai/cell`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (res.status === 503) throw new Error("AI is not configured (no API key)");
  if (!res.ok) throw new Error(`ai/cell failed: ${res.status}`);
  const body = (await res.json()) as { value: string };
  return body.value;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function callAiChat(req: {
  messages: ChatTurn[];
  workbook?: Workbook;
}): Promise<string> {
  const res = await fetch(`${BASE}/ai/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (res.status === 503) throw new Error("AI is not configured (no API key)");
  if (!res.ok) throw new Error(`ai/chat failed: ${res.status}`);
  const body = (await res.json()) as { reply: string };
  return body.reply;
}

export type ChartType = "bar" | "line" | "area" | "pie" | "scatter";

export type PlanStep =
  | { tool: "set_cell"; args: { sheet: string; row: number; col: number; raw: string } }
  | { tool: "add_sheet"; args: { name: string } }
  | {
      tool: "create_chart";
      args: { sheet: string; title: string; type: ChartType; range: string };
    };

export type AgentResult = {
  reply: string;
  plan: PlanStep[];
};

export async function callAiAgent(req: {
  messages: ChatTurn[];
  workbook?: Workbook;
}): Promise<AgentResult> {
  const res = await fetch(`${BASE}/ai/agent`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (res.status === 503) throw new Error("AI is not configured (no API key)");
  if (!res.ok) throw new Error(`ai/agent failed: ${res.status}`);
  return (await res.json()) as AgentResult;
}
