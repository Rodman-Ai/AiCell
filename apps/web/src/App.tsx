import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { a1, type Workbook } from "@aicell/shared";
import { useWorkbook, newBlankWorkbook } from "./useWorkbook";
import { Grid } from "./Grid";
import { SidePanel } from "./SidePanel";
import { SheetTabs } from "./SheetTabs";
import { ChartStrip } from "./ChartStrip";
import { importSpreadsheetFile } from "./csv";
import { listWorkbooks, loadWorkbook, saveWorkbook, getHealth, isOffline } from "./api";

const AUTOSAVE_DEBOUNCE_MS = 800;

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

export function App() {
  const api = useWorkbook();
  const [selection, setSelection] = useState({ row: 0, col: 0 });
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [aiEnabled, setAiEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Boot: probe AI availability + load most-recent workbook ---
  // In demo mode (VITE_API_BASE empty, e.g., GitHub Pages), skip every API
  // call and run with an in-memory workbook.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    if (isOffline) return;
    (async () => {
      try {
        const health = await getHealth();
        setAiEnabled(health.ai);
        const list = await listWorkbooks();
        if (list.length > 0) {
          const wb = await loadWorkbook(list[0]!.id);
          if (wb) {
            api.replaceWorkbook(wb);
            return;
          }
        }
        const seed = newBlankWorkbook("wb-default");
        await saveWorkbook(seed);
        api.replaceWorkbook(seed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setBootError(`Could not reach API at /api: ${msg}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Autosave with debounce ---
  const lastSavedRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (bootError || isOffline) return;
    const serialized = JSON.stringify(api.workbook);
    if (lastSavedRef.current === serialized) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist(api.workbook, serialized);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.workbook, bootError]);

  async function persist(wb: Workbook, serialized: string): Promise<void> {
    setSaveState({ kind: "saving" });
    try {
      const meta = await saveWorkbook(wb);
      lastSavedRef.current = serialized;
      setSaveState({ kind: "saved", at: meta.updatedAt });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveState({ kind: "error", message: msg });
    }
  }

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const t0 = performance.now();
      const sheets = await importSpreadsheetFile(file);
      // First sheet replaces; remaining sheets are added
      const [first, ...rest] = sheets;
      if (first) api.loadSheet(first);
      for (const s of rest) api.loadSheet(s);
      const ms = (performance.now() - t0).toFixed(0);
      console.info(`Imported ${file.name} (${sheets.length} sheet${sheets.length === 1 ? "" : "s"}) in ${ms}ms`);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selRaw = api.getRaw(selection.row, selection.col);
  const selComputed = api.getComputed(selection.row, selection.col);
  const baseStatus = `${api.activeSheet.name} · ${api.activeSheet.rowCount.toLocaleString()} rows × ${api.activeSheet.colCount} cols`;
  const status = bootError
    ? bootError
    : busy
      ? "Importing…"
      : isOffline
        ? `Demo mode (no backend) · ${baseStatus}`
        : baseStatus;

  return (
    <div className={`app${panelOpen ? " with-panel" : ""}`}>
      <div className="toolbar">
        <h1>AiCell</h1>
        <label>
          Import
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onPickFile}
          />
        </label>
        <button
          className="ask-claude"
          onClick={() => setPanelOpen((v) => !v)}
          title={aiEnabled ? "Ask Claude" : "AI is not configured"}
        >
          {panelOpen ? "Close panel" : "Ask Claude"}
        </button>
        <SaveIndicator state={saveState} />
        <span className="status">{status}</span>
      </div>
      <div className="formula-bar">
        <span className="addr">{a1(selection.row, selection.col)}</span>
        <input
          value={selRaw}
          onChange={(e) =>
            api.setCell(selection.row, selection.col, e.target.value)
          }
          placeholder={
            selComputed.error
              ? selComputed.error
              : selComputed.value !== null
                ? String(selComputed.value)
                : ""
          }
        />
      </div>
      <div className="main-area">
        <div className="grid-wrapper">
          <Grid api={api} selection={selection} onSelect={setSelection} />
          <ChartStrip
            sheet={api.activeSheet}
            onRemove={(chartId) => api.removeChart(api.activeSheet.name, chartId)}
          />
          <SheetTabs
            sheets={api.workbook.sheets}
            activeId={api.activeSheet.id}
            onSelect={api.setActiveSheet}
            onAdd={api.addSheet}
          />
        </div>
        {panelOpen && (
          <SidePanel
            workbook={api.workbook}
            aiEnabled={aiEnabled}
            onClose={() => setPanelOpen(false)}
            onApplySetCell={api.setCellOnSheet}
            onApplyAddSheet={api.addSheetByName}
            onApplyAddChart={api.addChart}
          />
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  let text = "";
  let color = "var(--aicell-header-fg)";
  if (state.kind === "saving") text = "Saving…";
  else if (state.kind === "saved") text = `Saved ${formatTime(state.at)}`;
  else if (state.kind === "error") {
    text = `Save failed`;
    color = "var(--aicell-error)";
  }
  if (!text) return null;
  return (
    <span style={{ fontSize: 12, color }} title={state.kind === "error" ? state.message : undefined}>
      {text}
    </span>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}
