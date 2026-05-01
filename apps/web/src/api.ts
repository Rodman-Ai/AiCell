import type { Workbook } from "@aicell/shared";

const BASE = "/api";

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
