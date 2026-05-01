# AiCell

An AI-forward, browser-first spreadsheet — a Microsoft Excel clone built around Claude from day one.

## What this repo currently contains

This is the **planning** stage of the project. The repo currently contains the product strategy and feature backlog only — no application code yet.

- [`docs/competitor-analysis.md`](docs/competitor-analysis.md) — survey of Excel+Copilot, Sheets+Gemini, Quadratic, Sourcetable, Rows, Numerous, Bricks, Endex, Shortcut, Kuse, GPTExcel
- [`docs/features.md`](docs/features.md) — the 100-feature backlog organized by category
- [`docs/roadmap.md`](docs/roadmap.md) — phased delivery plan (Phase 0 spike → Phase 3 enterprise)
- [`docs/tech-stack.md`](docs/tech-stack.md) — recommended tech stack and architecture

## Differentiation thesis

Claude-native agent that **plans → diffs → applies** edits with full undo, paired with a code-cell grid (Python/SQL/JS), MCP connectors as a first-class primitive, and the cleanest collab UX in the category.

## Targets

- **Form factor:** Web app (browser-first)
- **AI:** Anthropic Claude (Sonnet 4.6 default, Opus 4.7 for plans, Haiku 4.5 for in-cell)
- **Phase 1 user:** an FP&A analyst who can replace Google Sheets for 70% of tasks
- **Phase 2 quality bar:** ≥75% on SpreadsheetBench
