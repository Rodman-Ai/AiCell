import type { Sheet } from "@aicell/shared";
import { cellKey } from "@aicell/shared";

export type Range = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

export function normalizeRange(r: Range): Range {
  return {
    startRow: Math.min(r.startRow, r.endRow),
    endRow: Math.max(r.startRow, r.endRow),
    startCol: Math.min(r.startCol, r.endCol),
    endCol: Math.max(r.startCol, r.endCol),
  };
}

export function rangeContains(r: Range, row: number, col: number): boolean {
  const n = normalizeRange(r);
  return row >= n.startRow && row <= n.endRow && col >= n.startCol && col <= n.endCol;
}

export function rangeCellCount(r: Range): number {
  const n = normalizeRange(r);
  return (n.endRow - n.startRow + 1) * (n.endCol - n.startCol + 1);
}

/** Serialize a single cell's raw value as plain text for the clipboard. */
export function serializeCell(sheet: Sheet, row: number, col: number): string {
  return sheet.cells[cellKey(row, col)]?.raw ?? "";
}

/** Serialize a rectangular range as TSV. */
export function serializeRange(sheet: Sheet, r: Range): string {
  const n = normalizeRange(r);
  const rows: string[] = [];
  for (let row = n.startRow; row <= n.endRow; row++) {
    const cells: string[] = [];
    for (let col = n.startCol; col <= n.endCol; col++) {
      cells.push(sheet.cells[cellKey(row, col)]?.raw ?? "");
    }
    rows.push(cells.join("\t"));
  }
  return rows.join("\n");
}

/**
 * Parse clipboard text as TSV. Excel/Sheets put tabs between columns and
 * newlines between rows when copying a range. A single value still parses
 * as a 1×1 grid. CRLF is normalized to LF.
 */
export function parseTSV(text: string): string[][] {
  if (text === "") return [[""]];
  const normalized = text.replace(/\r\n?/g, "\n");
  const trimmed = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  const lines = trimmed.split("\n");
  return lines.map((line) => line.split("\t"));
}
