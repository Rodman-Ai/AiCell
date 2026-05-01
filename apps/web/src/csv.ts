import Papa from "papaparse";
import * as XLSX from "xlsx";
import { type Sheet, cellKey } from "@aicell/shared";

function rowsToSheet(rows: unknown[][], baseName: string, idSuffix: string): Sheet {
  const cells: Sheet["cells"] = {};
  let maxCol = 0;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      const s = v == null ? "" : String(v);
      if (s !== "") {
        cells[cellKey(r, c)] = { raw: s };
        if (c + 1 > maxCol) maxCol = c + 1;
      }
    }
  }
  return {
    id: `sheet-${idSuffix}`,
    name: baseName.slice(0, 31) || "Sheet1",
    cells,
    rowCount: Math.max(rows.length, 1000),
    colCount: Math.max(maxCol, 26),
  };
}

async function importCsv(file: File): Promise<Sheet[]> {
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return [rowsToSheet(parsed.data, baseName, String(Date.now()))];
}

async function importXlsx(file: File): Promise<Sheet[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const out: Sheet[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: false,
      blankrows: true,
    });
    const sheet = rowsToSheet(rows, name, `${Date.now()}-${out.length}`);
    out.push(sheet);
  }
  if (out.length === 0) {
    out.push(rowsToSheet([], file.name.replace(/\.[^.]+$/, ""), String(Date.now())));
  }
  return out;
}

/**
 * Import a CSV or XLSX file. Returns one Sheet per source sheet
 * (always one for CSV/TSV; one-or-more for XLSX).
 */
export async function importSpreadsheetFile(file: File): Promise<Sheet[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return importXlsx(file);
  return importCsv(file);
}
