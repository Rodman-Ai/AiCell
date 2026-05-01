import Papa from "papaparse";
import { type Sheet, cellKey } from "@aicell/shared";

export async function importCsvFile(file: File): Promise<Sheet> {
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: false,
  });
  const rows = parsed.data;
  const cells: Sheet["cells"] = {};
  let maxCol = 0;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const v = row[c] ?? "";
      if (v !== "") {
        cells[cellKey(r, c)] = { raw: v };
        if (c + 1 > maxCol) maxCol = c + 1;
      }
    }
  }
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return {
    id: `sheet-${Date.now()}`,
    name: baseName.slice(0, 31) || "Sheet1",
    cells,
    rowCount: Math.max(rows.length, 1000),
    colCount: Math.max(maxCol, 26),
  };
}
