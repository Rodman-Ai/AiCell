import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { createApp, FileStore } from "./app";

const PORT = Number(process.env.PORT ?? 3000);
const DATA_DIR = resolve(process.env.AICELL_DATA_DIR ?? ".aicell-data");

const store = new FileStore(DATA_DIR);
const app = createApp({ store });

serve({ fetch: app.fetch, port: PORT });
console.log(`AiCell API listening on http://localhost:${PORT} (data: ${DATA_DIR})`);
