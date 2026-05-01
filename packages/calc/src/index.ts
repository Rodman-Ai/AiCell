import { HyperFormula, type RawCellContent } from "hyperformula";
import type { Sheet, CellValue } from "@aicell/shared";

export type CellComputed = {
  value: CellValue;
  error?: string;
};

/**
 * Thin wrapper around HyperFormula for a single workbook.
 * Phase 0: in-memory only, single sheet at a time per engine instance is fine.
 */
export class CalcEngine {
  private hf: HyperFormula;
  private sheetIdByName = new Map<string, number>();

  constructor() {
    this.hf = HyperFormula.buildEmpty({
      licenseKey: "gpl-v3",
    });
  }

  loadSheet(sheet: Sheet): void {
    if (this.sheetIdByName.has(sheet.name)) {
      const id = this.sheetIdByName.get(sheet.name)!;
      this.hf.clearSheet(id);
    } else {
      this.hf.addSheet(sheet.name);
      const id = this.hf.getSheetId(sheet.name);
      if (id === undefined) throw new Error(`Failed to add sheet ${sheet.name}`);
      this.sheetIdByName.set(sheet.name, id);
    }
    const sheetId = this.sheetIdByName.get(sheet.name)!;

    const data: RawCellContent[][] = [];
    for (let r = 0; r < sheet.rowCount; r++) {
      const row: RawCellContent[] = [];
      for (let c = 0; c < sheet.colCount; c++) {
        const cell = sheet.cells[`${r},${c}`];
        row.push(cell ? cell.raw : null);
      }
      data.push(row);
    }
    this.hf.setSheetContent(sheetId, data);
  }

  setCell(sheetName: string, row: number, col: number, raw: string): void {
    const sheetId = this.sheetIdByName.get(sheetName);
    if (sheetId === undefined) throw new Error(`Unknown sheet ${sheetName}`);
    this.hf.setCellContents({ sheet: sheetId, row, col }, raw === "" ? null : raw);
  }

  getValue(sheetName: string, row: number, col: number): CellComputed {
    const sheetId = this.sheetIdByName.get(sheetName);
    if (sheetId === undefined) return { value: null };
    const v = this.hf.getCellValue({ sheet: sheetId, row, col });
    if (v === null || v === undefined) return { value: null };
    if (typeof v === "object" && "type" in v) {
      // DetailedCellError
      return { value: null, error: String((v as { value?: unknown }).value ?? v) };
    }
    return { value: v as CellValue };
  }

  destroy(): void {
    this.hf.destroy();
  }
}
