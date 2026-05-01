import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CalcEngine, type CellComputed } from "@aicell/calc";
import {
  type Workbook,
  type Sheet,
  cellKey,
} from "@aicell/shared";

export type WorkbookApi = {
  workbook: Workbook;
  activeSheet: Sheet;
  /** Bumped on every recalc so the grid re-renders */
  version: number;
  setActiveSheet: (id: string) => void;
  setCell: (row: number, col: number, raw: string) => void;
  getRaw: (row: number, col: number) => string;
  getComputed: (row: number, col: number) => CellComputed;
  loadSheet: (sheet: Sheet) => void;
};

const newBlankSheet = (): Sheet => ({
  id: "sheet-1",
  name: "Sheet1",
  cells: {},
  rowCount: 1000,
  colCount: 26,
});

export function useWorkbook(): WorkbookApi {
  const engineRef = useRef<CalcEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new CalcEngine();
  }
  const engine = engineRef.current;

  const [workbook, setWorkbook] = useState<Workbook>(() => ({
    id: "wb-1",
    name: "Untitled",
    sheets: [newBlankSheet()],
  }));
  const [activeSheetId, setActiveSheetId] = useState<string>("sheet-1");
  const [version, setVersion] = useState(0);

  const activeSheet = useMemo(
    () => workbook.sheets.find((s) => s.id === activeSheetId) ?? workbook.sheets[0]!,
    [workbook, activeSheetId]
  );

  // Initial load
  const initLoadedRef = useRef(false);
  useEffect(() => {
    if (initLoadedRef.current) return;
    initLoadedRef.current = true;
    engine.loadSheet(activeSheet);
    setVersion((v) => v + 1);
  }, [engine, activeSheet]);

  useEffect(() => {
    return () => {
      engine.destroy();
    };
  }, [engine]);

  const setCell = useCallback(
    (row: number, col: number, raw: string) => {
      const key = cellKey(row, col);
      setWorkbook((wb) => {
        const sheets = wb.sheets.map((s) => {
          if (s.id !== activeSheetId) return s;
          const cells = { ...s.cells };
          if (raw === "") delete cells[key];
          else cells[key] = { raw };
          return {
            ...s,
            cells,
            rowCount: Math.max(s.rowCount, row + 1),
            colCount: Math.max(s.colCount, col + 1),
          };
        });
        return { ...wb, sheets };
      });
      const sheetName = activeSheet.name;
      engine.setCell(sheetName, row, col, raw);
      setVersion((v) => v + 1);
    },
    [activeSheetId, activeSheet.name, engine]
  );

  const getRaw = useCallback(
    (row: number, col: number): string => {
      const cell = activeSheet.cells[cellKey(row, col)];
      return cell ? cell.raw : "";
    },
    [activeSheet]
  );

  const getComputed = useCallback(
    (row: number, col: number): CellComputed => {
      // version is read so React knows to re-call after recalc
      void version;
      return engine.getValue(activeSheet.name, row, col);
    },
    [engine, activeSheet.name, version]
  );

  const loadSheet = useCallback(
    (sheet: Sheet) => {
      engine.loadSheet(sheet);
      setWorkbook((wb) => {
        const exists = wb.sheets.some((s) => s.id === sheet.id);
        const sheets = exists
          ? wb.sheets.map((s) => (s.id === sheet.id ? sheet : s))
          : [...wb.sheets, sheet];
        return { ...wb, sheets };
      });
      setActiveSheetId(sheet.id);
      setVersion((v) => v + 1);
    },
    [engine]
  );

  return {
    workbook,
    activeSheet,
    version,
    setActiveSheet: setActiveSheetId,
    setCell,
    getRaw,
    getComputed,
    loadSheet,
  };
}
