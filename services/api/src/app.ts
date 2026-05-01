import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Workbook } from "@aicell/shared";
import { FileStore, type WorkbookStore } from "./storage";

export type AppDeps = {
  store: WorkbookStore;
};

export function createApp(deps: AppDeps) {
  const app = new Hono();

  app.use("*", cors({ origin: (origin) => origin ?? "*" }));

  app.get("/health", (c) => c.json({ ok: true }));

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

  return app;
}

export { FileStore };
