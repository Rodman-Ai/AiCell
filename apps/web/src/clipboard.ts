import type { Sheet } from "@aicell/shared";
import { cellKey } from "@aicell/shared";

/** Serialize a single cell's raw value as plain text for the clipboard. */
export function serializeCell(sheet: Sheet, row: number, col: number): string {
  return sheet.cells[cellKey(row, col)]?.raw ?? "";
}

/**
 * Parse clipboard text as TSV. Excel/Sheets put tabs between columns and
 * newlines between rows when copying a range. A single value still parses
 * as a 1×1 grid. CRLF is normalized to LF.
 */
export function parseTSV(text: string): string[][] {
  if (text === "") return [[""]];
  const normalized = text.replace(/\r\n?/g, "\n");
  // Drop a single trailing newline (Excel adds one) so we don't get a phantom empty row.
  const trimmed = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  const lines = trimmed.split("\n");
  return lines.map((line) => line.split("\t"));
}
