# Phased Roadmap

Feature numbers below reference [`features.md`](./features.md). Each phase ships behind a feature flag and must clear the verification bar in the README.

## Phase 0 — Spike (Weeks 1–4)

Prove the grid + formula engine + persistence work end-to-end. Goal: open a CSV, edit cells, see formulas recalc, save/reload from Postgres.

- **Features:** 1, 2, 3, 16, 26 (CSV/XLSX subset)
- **Critical paths:**
  - `apps/web/src/grid/` — canvas grid renderer
  - `packages/calc/` — HyperFormula wrapper
  - `services/api/` — workbook persistence
- **Exit criteria:** 100k-row CSV opens in <2s; edit a cell, formulas recalc, reload preserves state.

## Phase 1 — MVP (Months 2–5)

A usable web spreadsheet with the most magical AI features. Goal: an FP&A analyst can replace Google Sheets for 70% of tasks.

- **Features:** 1–17, 26, 36–37, 43–46, 51–55, 60, 61–62, 71, 73, 79, 80
- **Hard cuts:** no Python/SQL cells yet, no enterprise SSO, only CSV/XLSX/Postgres connectors
- **Critical paths:**
  - `apps/web/src/ai/sidepanel/` — Claude chat panel
  - `services/agent/` — Claude Agent SDK runtime
  - `packages/calc/functions/ai/` — `=AI`, `=CLASSIFY`, `=EXTRACT`, `=SUMMARIZE`, `=TRANSLATE`, `=FORMULA`
- **Exit criteria:** "build me a P&L from this CSV" works end-to-end via plan-and-apply; two browsers can edit live.

## Phase 2 — V1 (Months 6–9)

Become genuinely competitive with Sheets+Gemini and Excel+Copilot for power users.

- **Features:** 18–25, 27–35, 38–42, 47–50, 56–59, 63–70, 72, 74–78, 81–85
- **Adds:** Python/SQL/JS cells (Pyodide + DuckDB-WASM + sandboxed JS), full connector library, dashboards, agent MCP tool use, forecasting
- **Exit criteria:** ≥75% on SpreadsheetBench; 10 native connectors live; dashboards embeddable.

## Phase 3 — V2 (Months 10–14)

Platform & enterprise. Goal: pass enterprise procurement and start moving teams off Excel.

- **Features:** 86–100
- **Adds:** workflows, marketplace, SSO/SCIM, audit, DLP, BYOK, Excel two-way sync
- **Exit criteria:** SOC2 Type II audit kicked off; first 3 enterprise design partners signed; `.xlsx` round-trip preserves 99% of formulas in test corpus.

## Cross-cutting tracks (run in parallel)

- **Performance:** target 60fps scroll on 1M rows by end of Phase 1; recalc <500ms for 100K formulas by end of Phase 2.
- **Eval & quality:** SpreadsheetBench score tracked weekly from Phase 1 onward; golden-workbook suite (P&L model, CRM extract, marketing dashboard) added to CI.
- **Security:** threat model from Phase 1; pen test before Phase 3 GA.
