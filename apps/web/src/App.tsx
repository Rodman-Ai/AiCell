import { useState, useRef, type ChangeEvent } from "react";
import { a1 } from "@aicell/shared";
import { useWorkbook } from "./useWorkbook";
import { Grid } from "./Grid";
import { importCsvFile } from "./csv";

export function App() {
  const api = useWorkbook();
  const [selection, setSelection] = useState({ row: 0, col: 0 });
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selRaw = api.getRaw(selection.row, selection.col);
  const selComputed = api.getComputed(selection.row, selection.col);

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const t0 = performance.now();
      const sheet = await importCsvFile(file);
      api.loadSheet(sheet);
      const ms = (performance.now() - t0).toFixed(0);
      console.info(`Imported ${file.name} in ${ms}ms`);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const status = busy
    ? "Importing…"
    : `${api.activeSheet.name} · ${api.activeSheet.rowCount.toLocaleString()} rows × ${api.activeSheet.colCount} cols`;

  return (
    <div className="app">
      <div className="toolbar">
        <h1>AiCell</h1>
        <label>
          Import CSV
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            onChange={onPickFile}
          />
        </label>
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
      <Grid api={api} selection={selection} onSelect={setSelection} />
    </div>
  );
}
