import Anthropic from "@anthropic-ai/sdk";
import type { Workbook } from "@aicell/shared";
import { renderWorkbookContext } from "./chat";
import { auditFormulas, forecastFromWorkbook } from "./tools";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** A pending edit recorded by the agent. The user reviews & applies on the client. */
export type PlanStep =
  | { tool: "set_cell"; args: { sheet: string; row: number; col: number; raw: string } }
  | { tool: "add_sheet"; args: { name: string } }
  | {
      tool: "create_chart";
      args: {
        sheet: string;
        title: string;
        type: "bar" | "line" | "area" | "pie" | "scatter";
        range: string;
      };
    };

export type AgentResult = {
  reply: string;
  plan: PlanStep[];
};

export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "set_cell",
    description:
      "Set the value or formula of a single cell. Pending — applied only after the user approves the plan. Formulas start with '='.",
    input_schema: {
      type: "object",
      properties: {
        sheet: { type: "string", description: "Sheet name" },
        row: { type: "integer", description: "Zero-indexed row", minimum: 0 },
        col: { type: "integer", description: "Zero-indexed column", minimum: 0 },
        raw: { type: "string", description: "Cell value or formula" },
      },
      required: ["sheet", "row", "col", "raw"],
    },
  },
  {
    name: "add_sheet",
    description: "Create a new sheet in the workbook. Pending — applied only after user approval.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string", description: "Sheet name" } },
      required: ["name"],
    },
  },
  {
    name: "create_chart",
    description:
      "Create a chart over a range of cells. Pending — applied only after user approval.",
    input_schema: {
      type: "object",
      properties: {
        sheet: { type: "string" },
        title: { type: "string" },
        type: { type: "string", enum: ["bar", "line", "area", "pie", "scatter"] },
        range: { type: "string", description: "A1-style range like A1:B10" },
      },
      required: ["sheet", "title", "type", "range"],
    },
  },
  {
    name: "audit_formulas",
    description:
      "Audit formulas in the workbook. Returns out-of-range refs, self-references, and other issues. Read-only.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "forecast",
    description:
      "Forecast N future values from a numeric range using least-squares linear regression. Returns predictions, slope, intercept, R². Read-only.",
    input_schema: {
      type: "object",
      properties: {
        sheet: { type: "string" },
        range: { type: "string", description: "A1-style range, e.g. B2:B12" },
        periods: { type: "integer", minimum: 1, maximum: 100 },
      },
      required: ["sheet", "range", "periods"],
    },
  },
];

const MUTATING_TOOLS = new Set(["set_cell", "add_sheet", "create_chart"]);

const AGENT_SYSTEM = [
  "You are AiCell, an agentic spreadsheet assistant. You see a snapshot of the user's workbook.",
  "Plan and execute changes through the provided tools.",
  "",
  "Tool semantics:",
  "- set_cell / add_sheet / create_chart record PENDING edits that the user must approve before they apply. Use them freely; the user sees a plan and can reject any step.",
  "- audit_formulas and forecast execute immediately and return results you can use to inform the plan.",
  "",
  "Style:",
  "- Be concise. After proposing a plan, summarize what you queued in 1-2 sentences.",
  "- Prefer Excel-compatible formulas. Use =SUM, =AVERAGE, =VLOOKUP, etc.",
  "- For 'audit my workbook' type requests, run audit_formulas first, then propose set_cell fixes.",
  "- For forecasting, run forecast with the right range, then write predictions back via set_cell.",
].join("\n");

/**
 * Adapter so tests can drive the agent loop without a real API key.
 * Real impl wraps the Anthropic SDK; tests provide a fake.
 */
export interface AgentLLM {
  step(req: {
    system: Anthropic.TextBlockParam[];
    messages: Anthropic.MessageParam[];
    tools: Anthropic.Tool[];
  }): Promise<Anthropic.Message>;
}

export class AnthropicAgentLLM implements AgentLLM {
  constructor(private readonly sdk: Anthropic) {}

  async step(req: {
    system: Anthropic.TextBlockParam[];
    messages: Anthropic.MessageParam[];
    tools: Anthropic.Tool[];
  }): Promise<Anthropic.Message> {
    return this.sdk.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 8192,
      system: req.system,
      messages: req.messages,
      tools: req.tools,
      thinking: { type: "adaptive" },
    });
  }
}

export async function runAgent(
  llm: AgentLLM,
  req: { messages: ChatTurn[]; workbook?: Workbook }
): Promise<AgentResult> {
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: AGENT_SYSTEM, cache_control: { type: "ephemeral" } },
  ];
  if (req.workbook) {
    system.push({
      type: "text",
      text: `Current workbook:\n${renderWorkbookContext(req.workbook)}`,
      cache_control: { type: "ephemeral" },
    });
  }

  const messages: Anthropic.MessageParam[] = req.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const plan: PlanStep[] = [];
  let finalReply = "";

  for (let iter = 0; iter < 10; iter++) {
    const response = await llm.step({ system, messages, tools: TOOL_DEFS });
    messages.push({ role: "assistant", content: response.content });

    // Always pull text out — last text block before end_turn becomes the reply
    let turnText = "";
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        turnText += block.text;
      } else if (block.type === "tool_use") {
        const args = block.input as Record<string, unknown>;
        if (MUTATING_TOOLS.has(block.name)) {
          plan.push({ tool: block.name, args } as PlanStep);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "Recorded as plan step. The user will review and apply.",
          });
        } else if (block.name === "audit_formulas") {
          const issues = req.workbook ? auditFormulas(req.workbook) : [];
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({ issues }),
          });
        } else if (block.name === "forecast") {
          if (!req.workbook) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: "No workbook attached.",
              is_error: true,
            });
          } else {
            const result = forecastFromWorkbook(
              req.workbook,
              args as { sheet: string; range: string; periods: number }
            );
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
              is_error: "error" in result,
            });
          }
        } else {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Unknown tool: ${block.name}`,
            is_error: true,
          });
        }
      }
    }

    if (turnText) finalReply = turnText;

    if (response.stop_reason === "end_turn" || toolResults.length === 0) break;
    messages.push({ role: "user", content: toolResults });
  }

  return { reply: finalReply.trim(), plan };
}
