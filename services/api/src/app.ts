import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Workbook } from "@aicell/shared";
import { FileStore, type WorkbookStore } from "./storage";
import type { ClaudeClient } from "./ai/client";
import { runCellFn, type CellRequest, type CellFn } from "./ai/cell";
import { runChat, type ChatRequest } from "./ai/chat";

export type AppDeps = {
  store: WorkbookStore;
  /** Optional — if absent, AI endpoints return 503. */
  claude?: ClaudeClient | null;
};

const VALID_FNS: ReadonlySet<string> = new Set([
  "AI",
  "CLASSIFY",
  "EXTRACT",
  "SUMMARIZE",
  "TRANSLATE",
  "SENTIMENT",
  "FORMULA",
]);

export function createApp(deps: AppDeps) {
  const app = new Hono();

  app.use("*", cors({ origin: (origin) => origin ?? "*" }));

  app.get("/health", (c) =>
    c.json({ ok: true, ai: !!deps.claude })
  );

  app.get("/workbooks", async (c) => {
    const list = await deps.store.list();
    return c.json({ workbooks: list });
  });

  app.get("/workbooks/:id", async (c) => {
    const id = c.req.param("id");
    const wb = await deps.store.get(id);
    if (!wb) return c.json({ error: "not_found" }, 404);
    return c.json({ workbook: wb });
  });

  app.put("/workbooks/:id", async (c) => {
    const id = c.req.param("id");
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const wb = (body as { workbook?: Workbook }).workbook;
    if (!wb || wb.id !== id) {
      return c.json({ error: "id_mismatch" }, 400);
    }
    const meta = await deps.store.save(wb);
    return c.json({ ok: true, updatedAt: meta.updatedAt });
  });

  app.post("/ai/cell", async (c) => {
    if (!deps.claude) return c.json({ error: "ai_disabled" }, 503);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const req = body as Partial<CellRequest>;
    if (!req.fn || !VALID_FNS.has(req.fn)) {
      return c.json({ error: "invalid_fn" }, 400);
    }
    if (typeof req.prompt !== "string" || req.prompt.length === 0) {
      return c.json({ error: "invalid_prompt" }, 400);
    }
    if (req.prompt.length > 8000) {
      return c.json({ error: "prompt_too_long" }, 413);
    }
    try {
      const out = await runCellFn(req as CellRequest, deps.claude);
      return c.json(out);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: "ai_failed", message: msg }, 502);
    }
  });

  app.post("/ai/chat", async (c) => {
    if (!deps.claude) return c.json({ error: "ai_disabled" }, 503);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const req = body as Partial<ChatRequest>;
    if (!Array.isArray(req.messages) || req.messages.length === 0) {
      return c.json({ error: "invalid_messages" }, 400);
    }
    try {
      const out = await runChat(req as ChatRequest, deps.claude);
      return c.json(out);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: "ai_failed", message: msg }, 502);
    }
  });

  return app;
}

export { FileStore };
export type { CellFn };
