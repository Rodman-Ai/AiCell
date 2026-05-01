import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { createApp, FileStore } from "./app";
import { createClaudeClient } from "./ai/client";

const PORT = Number(process.env.PORT ?? 3000);
const DATA_DIR = resolve(process.env.AICELL_DATA_DIR ?? ".aicell-data");

const store = new FileStore(DATA_DIR);
const claude = createClaudeClient();
const app = createApp({ store, claude });

serve({ fetch: app.fetch, port: PORT });
const aiStatus = claude ? "enabled" : "disabled (set ANTHROPIC_API_KEY)";
console.log(
  `AiCell API listening on http://localhost:${PORT} (data: ${DATA_DIR}, ai: ${aiStatus})`
);
