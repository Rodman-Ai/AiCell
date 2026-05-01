export type SheetId = string;
export type WorkbookId = string;

export type CellAddress = {
  sheet: SheetId;
  row: number;
  col: number;
};

export type CellValue = string | number | boolean | null;

export type Cell = {
  /** Raw user input — formulas start with "=" */
  raw: string;
};

export type Sheet = {
  id: SheetId;
  name: string;
  /** Sparse map of "row,col" -> Cell */
  cells: Record<string, Cell>;
  rowCount: number;
  colCount: number;
};

export type Workbook = {
  id: WorkbookId;
  name: string;
  sheets: Sheet[];
};

export const cellKey = (row: number, col: number): string => `${row},${col}`;

export const colLetters = (col: number): string => {
  let n = col;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
};

export const a1 = (row: number, col: number): string =>
  `${colLetters(col)}${row + 1}`;
