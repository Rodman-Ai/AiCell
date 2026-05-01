import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CalcEngine, aiRegistry, type CellComputed } from "@aicell/calc";
import {
  type Workbook,
  type Sheet,
  type ChartSpec,
  cellKey,
} from "@aicell/shared";
import { callAiCell, isOffline } from "./api";

if (!isOffline) {
  aiRegistry.setRunner(({ fn, prompt, args }) => callAiCell({ fn, prompt, args }));
}

export type CellEdit = { row: number; col: number; raw: string };

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
  replaceWorkbook: (wb: Workbook) => void;
  addSheet: () => void;
  setCellOnSheet: (sheetName: string, row: number, col: number, raw: string) => void;
  /** Apply many cell edits as a single undo step. */
  setCellsOnSheetBatch: (sheetName: string, edits: CellEdit[]) => void;
  addSheetByName: (name: string) => void;
  addChart: (sheetName: string, spec: Omit<ChartSpec, "id">) => void;
  removeChart: (sheetName: string, chartId: string) => void;
  /** Undo / redo over workbook snapshots. */
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const HISTORY_LIMIT = 100;

const newBlankSheet = (): Sheet => ({
  id: "sheet-1",
  name: "Sheet1",
  cells: {},
  rowCount: 1000,
  colCount: 26,
});

export const newBlankWorkbook = (id: string, name = "Untitled"): Workbook => ({
  id,
  name,
  sheets: [newBlankSheet()],
});

const cloneWorkbook = (wb: Workbook): Workbook =>
  typeof structuredClone === "function" ? structuredClone(wb) : JSON.parse(JSON.stringify(wb));

export function useWorkbook(): WorkbookApi {
  const engineRef = useRef<CalcEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new CalcEngine();
  }
  const getEngine = () => {
    if (!engineRef.current) throw new Error("CalcEngine not initialized");
    return engineRef.current;
  };

  const [workbook, setWorkbook] = useState<Workbook>(() =>
    newBlankWorkbook("wb-default")
  );
  const [activeSheetId, setActiveSheetId] = useState<string>("sheet-1");
  const [version, setVersion] = useState(0);

  // History stacks of full workbook snapshots. Each push is one undo step.
  const pastRef = useRef<Workbook[]>([]);
  const futureRef = useRef<Workbook[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const workbookRef = useRef(workbook);
  workbookRef.current = workbook;

  const pushHistory = useCallback(() => {
    pastRef.current.push(cloneWorkbook(workbookRef.current));
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  const activeSheet = useMemo(
    () => workbook.sheets.find((s) => s.id === activeSheetId) ?? workbook.sheets[0]!,
    [workbook, activeSheetId]
  );

  const initLoadedRef = useRef(false);
  useEffect(() => {
    if (initLoadedRef.current) return;
    initLoadedRef.current = true;
    getEngine().loadSheet(activeSheet);
    setVersion((v) => v + 1);
  }, [activeSheet]);

  useEffect(() => {
    return aiRegistry.subscribe(() => {
      engineRef.current?.recalculate();
      setVersion((v) => v + 1);
    });
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const reloadEngine = useCallback((wb: Workbook) => {
    engineRef.current?.destroy();
    engineRef.current = new CalcEngine();
    for (const s of wb.sheets) engineRef.current.loadSheet(s);
  }, []);

  const setCell = useCallback(
    (row: number, col: number, raw: string) => {
      pushHistory();
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
      getEngine().setCell(sheetName, row, col, raw);
      setVersion((v) => v + 1);
    },
    [activeSheetId, activeSheet.name, pushHistory]
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
      void version;
      return getEngine().getValue(activeSheet.name, row, col);
    },
    [activeSheet.name, version]
  );

  const loadSheet = useCallback(
    (sheet: Sheet) => {
      pushHistory();
      getEngine().loadSheet(sheet);
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
    [pushHistory]
  );

  const replaceWorkbook = useCallback(
    (wb: Workbook) => {
      reloadEngine(wb);
      setWorkbook(wb);
      setActiveSheetId(wb.sheets[0]?.id ?? "sheet-1");
      setVersion((v) => v + 1);
    },
    [reloadEngine]
  );

  const addSheet = useCallback(() => {
    pushHistory();
    setWorkbook((wb) => {
      const n = wb.sheets.length + 1;
      const id = `sheet-${Date.now()}`;
      const name = `Sheet${n}`;
      const sheet: Sheet = { id, name, cells: {}, rowCount: 1000, colCount: 26 };
      getEngine().loadSheet(sheet);
      setActiveSheetId(id);
      setVersion((v) => v + 1);
      return { ...wb, sheets: [...wb.sheets, sheet] };
    });
  }, [pushHistory]);

  const addSheetByName = useCallback(
    (name: string) => {
      let didPushHistory = false;
      setWorkbook((wb) => {
        const existing = wb.sheets.find((s) => s.name === name);
        if (existing) {
          setActiveSheetId(existing.id);
          return wb;
        }
        if (!didPushHistory) {
          pushHistory();
          didPushHistory = true;
        }
        const id = `sheet-${Date.now()}-${wb.sheets.length}`;
        const sheet: Sheet = { id, name, cells: {}, rowCount: 1000, colCount: 26 };
        getEngine().loadSheet(sheet);
        setActiveSheetId(id);
        setVersion((v) => v + 1);
        return { ...wb, sheets: [...wb.sheets, sheet] };
      });
    },
    [pushHistory]
  );

  const setCellOnSheet = useCallback(
    (sheetName: string, row: number, col: number, raw: string) => {
      pushHistory();
      const key = cellKey(row, col);
      setWorkbook((wb) => {
        const sheets = wb.sheets.map((s) => {
          if (s.name !== sheetName) return s;
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
      try {
        getEngine().setCell(sheetName, row, col, raw);
      } catch {
        // Sheet may not exist in engine yet (just-created); skip silently
      }
      setVersion((v) => v + 1);
    },
    [pushHistory]
  );

  const setCellsOnSheetBatch = useCallback(
    (sheetName: string, edits: CellEdit[]) => {
      if (edits.length === 0) return;
      pushHistory();
      setWorkbook((wb) => {
        const sheets = wb.sheets.map((s) => {
          if (s.name !== sheetName) return s;
          const cells = { ...s.cells };
          let rowCount = s.rowCount;
          let colCount = s.colCount;
          for (const e of edits) {
            const key = cellKey(e.row, e.col);
            if (e.raw === "") delete cells[key];
            else cells[key] = { raw: e.raw };
            if (e.row + 1 > rowCount) rowCount = e.row + 1;
            if (e.col + 1 > colCount) colCount = e.col + 1;
          }
          return { ...s, cells, rowCount, colCount };
        });
        return { ...wb, sheets };
      });
      const eng = getEngine();
      for (const e of edits) {
        try {
          eng.setCell(sheetName, e.row, e.col, e.raw);
        } catch {
          // ignore — engine will catch up on next reload
        }
      }
      setVersion((v) => v + 1);
    },
    [pushHistory]
  );

  const addChart = useCallback(
    (sheetName: string, spec: Omit<ChartSpec, "id">) => {
      pushHistory();
      const id = `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setWorkbook((wb) => {
        const sheets = wb.sheets.map((s) => {
          if (s.name !== sheetName) return s;
          const charts = [...(s.charts ?? []), { id, ...spec }];
          return { ...s, charts };
        });
        return { ...wb, sheets };
      });
      setVersion((v) => v + 1);
    },
    [pushHistory]
  );

  const removeChart = useCallback(
    (sheetName: string, chartId: string) => {
      pushHistory();
      setWorkbook((wb) => {
        const sheets = wb.sheets.map((s) => {
          if (s.name !== sheetName) return s;
          const charts = (s.charts ?? []).filter((c) => c.id !== chartId);
          return { ...s, charts };
        });
        return { ...wb, sheets };
      });
      setVersion((v) => v + 1);
    },
    [pushHistory]
  );

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(cloneWorkbook(workbookRef.current));
    reloadEngine(prev);
    setWorkbook(prev);
    if (!prev.sheets.find((s) => s.id === activeSheetId)) {
      setActiveSheetId(prev.sheets[0]?.id ?? "sheet-1");
    }
    setVersion((v) => v + 1);
    setHistoryTick((t) => t + 1);
  }, [reloadEngine, activeSheetId]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(cloneWorkbook(workbookRef.current));
    reloadEngine(next);
    setWorkbook(next);
    if (!next.sheets.find((s) => s.id === activeSheetId)) {
      setActiveSheetId(next.sheets[0]?.id ?? "sheet-1");
    }
    setVersion((v) => v + 1);
    setHistoryTick((t) => t + 1);
  }, [reloadEngine, activeSheetId]);

  void historyTick;
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return {
    workbook,
    activeSheet,
    version,
    setActiveSheet: setActiveSheetId,
    setCell,
    getRaw,
    getComputed,
    loadSheet,
    replaceWorkbook,
    addSheet,
    addSheetByName,
    setCellOnSheet,
    setCellsOnSheetBatch,
    addChart,
    removeChart,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
