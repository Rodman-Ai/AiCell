# Top 50 features — what to build next, why, and from whom

A focused build plan: which 50 features carry the most weight given the competitive landscape, ordered by ship-priority. Pairs with [`features.md`](./features.md) (the 100-item backlog) and [`competitor-analysis.md`](./competitor-analysis.md) (the qualitative landscape).

## How this list is built

For each candidate feature we ask:
1. **Do users notice when it's missing?** — table-stakes vs. nice-to-have.
2. **Who already has it?** — Excel + Copilot, Sheets + Gemini, Quadratic, Sourcetable, Numerous, Rows.
3. **Does it support our differentiation thesis?** — Claude-native plan-then-apply agent · code cells · MCP connectors · real-time collab · in-cell AI.
4. **What's the build cost?** — S (≤ 1 day) · M (≤ 1 week) · L (≤ 2 weeks) · XL (multi-week).

We then group into four shipping tiers. Higher tier = ship first.

## Competitor feature matrix (what they have, where we stand)

Y = solid · ~ = partial / weak · — = absent. AiCell column reflects what's on `main` after the menubar / function-picker / undo-redo PR (commit `4296b06`).

| Capability | Excel+Copilot | Sheets+Gemini | Quadratic | Sourcetable | Numerous | AiCell today |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Conventional menus | Y (ribbon) | Y | ~ (palette-led) | ~ | n/a (plug-in) | Y |
| Undo / redo | Y | Y | Y | Y | n/a | Y |
| Copy / paste / TSV expand | Y | Y | Y | Y | Y | Y (single-cell selection) |
| Multi-cell drag selection | Y | Y | Y | Y | n/a | — |
| Cell formatting (bold/colors/number) | Y | Y | Y | Y | n/a | — |
| Conditional formatting | Y | Y | ~ | Y | n/a | — |
| Find & replace | Y | Y | Y | Y | n/a | — |
| Freeze panes | Y | Y | Y | Y | n/a | — |
| Tables (auto-expand, headers) | Y | ~ | ~ | Y | n/a | — |
| Pivot tables | Y | Y | ~ | Y | n/a | — |
| Charts (bar/line/pie/etc.) | Y | Y | Y | Y | n/a | ~ (basic, AI-driven) |
| 500+ formulas | Y | Y | Y | Y | n/a | Y (HF built-ins) |
| LAMBDA / LET / named functions | Y | Y | Y | ~ | n/a | Y (HF) |
| Python cells | — | — | Y | ~ | — | — |
| SQL cells | — | — | Y | Y | — | — |
| `=AI()` / agent in cell | Y | Y | Y | Y | Y | Y |
| Plan-then-apply chat agent | Y | Y | Y | ~ | — | Y |
| MCP connector support | — | — | Y | — | — | — |
| Real-time multi-cursor | ~ | Y | ~ | Y | n/a | — |
| Comments / @mentions | Y | Y | Y | Y | n/a | — |
| Version history | Y | Y | Y | Y | n/a | — |
| CSV / XLSX import | Y | Y | Y | Y | Y | Y |
| CSV / XLSX export | Y | Y | Y | Y | n/a | Y |
| DB connectors (Postgres/BQ/etc.) | ~ | ~ | Y | Y | — | — |
| REST / webhook connectors | ~ | ~ | Y | Y | ~ | — |
| Public embed / read-only share | — | Y | ~ | Y | — | — |
| SSO / SAML / SCIM | Y | Y | ~ | Y | — | — |
| Audit log | Y | Y | ~ | Y | — | — |
| Data validation rules | Y | Y | ~ | Y | n/a | — |

The matrix shows the obvious truth: AiCell ships menus, undo/redo, formulas, exports, and plan-then-apply AI — but is missing the rest of the **Phase-1 grid UX** that any spreadsheet user reflexively reaches for (selection ranges, formatting, filter, freeze, find/replace). That's where most of the P0 list goes.

## Tier P0 — Ship next (10 features)

These are the missing-ness moments — the things users hit in the first 60 seconds and assume are broken if they don't work.

| # | Feature | Why now | Effort |
|---|---|---|---|
| 1 | Multi-cell drag-selection (rectangular + shift-click + Cmd-click columns) | Unblocks copy/paste, sort, formatting; everyone has it. | M |
| 2 | Cell formatting model — bold / italic / color / background / number format | The single biggest visible gap; needed before pivot, conditional fmt, charts feel real. | L |
| 3 | Find & replace (current sheet + all sheets, plain + regex) | One-click in every competitor; we expose the menu item but it's a stub. | M |
| 4 | Freeze rows / columns + split view | First thing you do on imported data over 50 rows. | S |
| 5 | Column / row resize + auto-fit | Default 100px columns hide imported data; users assume the import broke. | S |
| 6 | Conditional formatting (rules + AI rule generation) | Excel/Sheets parity; pairs naturally with our agent ("highlight outliers"). | L |
| 7 | Data validation (lists, ranges, custom formulas) | Required for any shared workbook used as a form. | M |
| 8 | Comments + @mentions on cells | Collab signal; cheap to ship vs. value. | M |
| 9 | Native column sort + filter UI (header chevrons) | Our Data menu has a stub; users expect spreadsheet headers. | M |
| 10 | Keyboard shortcuts for the rest of Excel — Cmd+B, Cmd+I, Cmd+1, F2, Ctrl+; etc. | Power users instantly notice when shortcuts they have in muscle memory don't fire. | S |

## Tier P1 — Differentiator (15 features)

Where AiCell can leapfrog. These are the reasons someone would switch from Sheets, not the reasons they'd accept switching.

| # | Feature | Competitor reference | Effort |
|---|---|---|---|
| 11 | **MCP connectors as a first-class tool surface** — same connector library for the user and the Claude agent | Quadratic has it for code cells; nobody else | L |
| 12 | **Plan diffs, not just plan steps** — show before / after for every cell the agent will touch, with side-by-side preview | Excel Copilot plan mode is the closest, weaker | M |
| 13 | **Per-workbook + per-user agent memory** — conventions, named ranges, formatting preferences | None ship this well | M |
| 14 | **`=AI(prompt, range)` with prompt caching** + cache hit indicator | We have `=AI()`; competitors don't expose caching | S |
| 15 | **`=FORMULA("show me last week's revenue by region")`** — natural language → formula text the user inserts | GPTExcel/Ajelix do this badly | S |
| 16 | **Smart Fill from examples** (Flash Fill on steroids) — type 2 examples in column B, AI fills the rest | Excel has Flash Fill; ours uses Claude few-shot | M |
| 17 | **`=EMBED()` + `=SIMILAR()`** — vector embeddings + semantic match in-cell | Numerous/Quadratic don't | M |
| 18 | **Audit my formulas** — agent flags broken refs, type errors, perf hot spots | None ship this | M |
| 19 | **One-click clean** — dates, names, addresses, phone, email, currency | Excel data prep is manual; Sheets weak | M |
| 20 | **Auto fuzzy-join** — agent suggests join key with confidence | Sourcetable does basic; we can be cleaner | M |
| 21 | **Schema inference + "table-from-mess"** — turn a copy/pasted blob into a normalized table | None | M |
| 22 | **Forecasting (`=FORECAST(range, periods)`)** with confidence bands | Sheets has FORECAST.ETS; we add LLM ensemble | L |
| 23 | **Anomaly detection on scheduled refresh** with email/Slack alerts | None ship this on grid data | L |
| 24 | **Voice input + spoken summaries** in the agent panel | Excel Copilot has spoken responses on mobile | M |
| 25 | **One-click PPTX exec summary deck** from a sheet | Bricks/Endex do narrow versions | L |

## Tier P2 — Power features (15)

What advanced users and analysts switch for. These compound over time and lock in users with workflows.

| # | Feature | Competitor reference | Effort |
|---|---|---|---|
| 26 | Python cells (Pyodide in browser, server runtime for heavy jobs) | Quadratic flagship | XL |
| 27 | SQL cells (DuckDB-WASM against in-sheet tables + remote DBs) | Quadratic, Sourcetable | L |
| 28 | JavaScript/TypeScript cells with sandbox | Quadratic | L |
| 29 | Pivot tables with drill-down + AI-generated pivot from prompt | Excel/Sheets | L |
| 30 | Tables (auto-expand, header row, totals row, structured refs `Table[Col]`) | Excel | M |
| 31 | Native Postgres / MySQL / Snowflake / BigQuery connectors | Quadratic, Sourcetable | XL |
| 32 | REST API connector with OAuth / API-key / header auth + caching | Quadratic, Sourcetable | L |
| 33 | Inbound webhooks → append rows | Rows had this | M |
| 34 | Scheduled refresh with diff notifications | Excel/Sheets via Power Automate | M |
| 35 | Geo maps with auto-geocoding + choropleth | Sheets weak, none great | L |
| 36 | 30+ chart types incl. heatmap, treemap, sankey, candlestick | Excel/Sheets | L |
| 37 | Dashboard builder — drag charts to a canvas with cross-filters | Rows-style | XL |
| 38 | Public embed: read-only dashboard URLs + iframes | Rows, Sheets | M |
| 39 | Real-time multi-cursor editing (Yjs CRDT) + presence + follow-mode | Sheets, Quadratic | XL |
| 40 | Version history with named snapshots and visual diff | Sheets, Excel | L |

## Tier P3 — Enterprise & moat (10)

The features that close 5-figure deals and prevent customer churn at scale.

| # | Feature | Competitor reference | Effort |
|---|---|---|---|
| 41 | SSO / SAML / SCIM provisioning + MFA | Excel, Sheets, Sourcetable | L |
| 42 | RBAC with cell- and column-level permissions | Excel partial | L |
| 43 | Audit log with Claude-summarized activity digests | Excel/Sheets enterprise | M |
| 44 | Data residency selection (US / EU / regional) | Excel, Sheets | L |
| 45 | PII / DLP policies enforced at edit-time and on AI calls | Excel Copilot has framework | L |
| 46 | Workbook approval workflows (lock + sign-off + Slack inline approval) | None integrated | L |
| 47 | Encryption at rest, per-workspace KMS, BYOK | Excel/Sheets enterprise | L |
| 48 | Two-way Excel/Sheets sync — open `.xlsx`, edit, save back without lossy round-trip | None reliable | XL |
| 49 | Workbook PR-style change requests with AI code review | None | L |
| 50 | Granular sharing — workbook / sheet / range / cell with link & permission | Sheets has range, no cell | M |

## Recommended sequencing

1. **Sprint 1 (this week)** — P0 #1, #4, #5, #10. Multi-cell selection unlocks half the others; freeze + auto-fit + shortcuts are 1–2 days each. Net effect: the product feels like a spreadsheet.
2. **Sprint 2** — P0 #2, #3, #9. Cell formatting, find/replace, sort/filter UI. Spreadsheet parity.
3. **Sprint 3** — P0 #6, #7, #8 + P1 #11, #14, #15. Conditional formatting, validation, comments alongside MCP connectors and the AI formula picks. First "why we're different" demo.
4. **Sprint 4+** — switch to differentiators. Pick four from P1 (#12, #16, #18, #19 are the best demo-to-effort ratios), then start tackling Python/SQL cells (P2 #26–28).

## What we deliberately don't do

- **Match Excel's ribbon** — too heavy for our user base, conflicts with the Ask-Claude-first thesis. The 6-menu bar shipped on `main` is the deliberate ceiling for chrome.
- **Build a marketplace before product-market fit** — feature #91 in `features.md` (smart templates marketplace) is gated until enterprise tier ships.
- **Ship every chart type up front** — start with bar/line/area/pie/scatter (already there) + heatmap, treemap, sankey, candlestick (P2 #36); leave the long tail for community plug-ins.
- **Reinvent formula syntax** — HyperFormula gives us 400+ Excel-compatible functions for free; we only add custom ones that are genuinely AI-flavored or platform-specific (`=AI`, `=FETCH`, `=SIMILAR`).
