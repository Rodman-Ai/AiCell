import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, FileStore } from "./app";
import type { Workbook } from "@aicell/shared";

const sampleWorkbook = (id = "wb-test"): Workbook => ({
  id,
  name: "Untitled",
  sheets: [
    {
      id: "sheet-1",
      name: "Sheet1",
      cells: { "0,0": { raw: "42" }, "0,1": { raw: "=A1+1" } },
      rowCount: 100,
      colCount: 26,
    },
  ],
});

describe("API", () => {
  let dir: string;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "aicell-test-"));
    app = createApp({ store: new FileStore(dir) });
  });

  it("GET /health returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("GET /workbooks returns empty list initially", async () => {
    const res = await app.request("/workbooks");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ workbooks: [] });
  });

  it("GET unknown workbook returns 404", async () => {
    const res = await app.request("/workbooks/wb-test");
    expect(res.status).toBe(404);
  });

  it("PUT then GET round-trips a workbook", async () => {
    const wb = sampleWorkbook();
    const put = await app.request(`/workbooks/${wb.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workbook: wb }),
    });
    expect(put.status).toBe(200);
    const putBody = (await put.json()) as { ok: boolean; updatedAt: number };
    expect(putBody.ok).toBe(true);
    expect(typeof putBody.updatedAt).toBe("number");

    const get = await app.request(`/workbooks/${wb.id}`);
    expect(get.status).toBe(200);
    const getBody = (await get.json()) as { workbook: Workbook };
    expect(getBody.workbook.id).toBe(wb.id);
    expect(getBody.workbook.sheets[0]?.cells["0,0"]?.raw).toBe("42");
  });

  it("PUT with mismatched id returns 400", async () => {
    const wb = sampleWorkbook("wb-a");
    const res = await app.request("/workbooks/wb-b", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workbook: wb }),
    });
    expect(res.status).toBe(400);
  });

  it("listing reflects saved workbooks", async () => {
    await app.request("/workbooks/wb-1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workbook: sampleWorkbook("wb-1") }),
    });
    const res = await app.request("/workbooks");
    const body = (await res.json()) as { workbooks: Array<{ id: string }> };
    expect(body.workbooks.map((w) => w.id)).toContain("wb-1");
  });

  it("rejects unsafe workbook ids", async () => {
    const res = await app.request("/workbooks/..%2Fevil", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workbook: { ...sampleWorkbook("..%2Fevil") } }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // cleanup
  it.runIf(true)("cleans up tmp dir", async () => {
    await rm(dir, { recursive: true, force: true });
  });
});
