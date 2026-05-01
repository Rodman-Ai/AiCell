import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CalcEngine, aiRegistry, type CellComputed } from "@aicell/calc";
import {
  type Workbook,
  type Sheet,
  type ChartSpec,
  cellKey,
} from "@aicell/shared";
import { callAiCell, isOffline } from "./api";

// Wire the AI runner once at module load — every CalcEngine shares the registry.
// In offline/demo mode (no backend), leave the runner unset so AI cell calls
// return the "#AI_DISABLED" sentinel instead of failing fetches.
if (!isOffline) {
  aiRegistry.setRunner(({ fn, prompt, args }) => callAiCell({ fn, prompt, args }));
}

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
  /** Plan-apply helpers — used by the agent panel. */
  setCellOnSheet: (sheetName: string, row: number, col: number, raw: string) => void;
  addSheetByName: (name: string) => void;
  addChart: (sheetName: string, spec: Omit<ChartSpec, "id">) => void;
  removeChart: (sheetName: string, chartId: string) => void;
};

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

  const activeSheet = useMemo(
    () => workbook.sheets.find((s) => s.id === activeSheetId) ?? workbook.sheets[0]!,
    [workbook, activeSheetId]
  );

  // Initial load of the default workbook into the engine
  const initLoadedRef = useRef(false);
  useEffect(() => {
    if (initLoadedRef.current) return;
    initLoadedRef.current = true;
    getEngine().loadSheet(activeSheet);
    setVersion((v) => v + 1);
  }, [activeSheet]);

  // When an AI request resolves, re-run HF and bump the version so the grid re-renders.
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
      getEngine().setCell(sheetName, row, col, raw);
      setVersion((v) => v + 1);
    },
    [activeSheetId, activeSheet.name]
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

  const loadSheet = useCallback((sheet: Sheet) => {
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
  }, []);

  const replaceWorkbook = useCallback((wb: Workbook) => {
    engineRef.current?.destroy();
    engineRef.current = new CalcEngine();
    for (const s of wb.sheets) {
      engineRef.current.loadSheet(s);
    }
    setWorkbook(wb);
    setActiveSheetId(wb.sheets[0]?.id ?? "sheet-1");
    setVersion((v) => v + 1);
  }, []);

  const addSheet = useCallback(() => {
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
  }, []);

  const addSheetByName = useCallback((name: string) => {
    setWorkbook((wb) => {
      // If a sheet with that name already exists, just activate it
      const existing = wb.sheets.find((s) => s.name === name);
      if (existing) {
        setActiveSheetId(existing.id);
        return wb;
      }
      const id = `sheet-${Date.now()}-${wb.sheets.length}`;
      const sheet: Sheet = { id, name, cells: {}, rowCount: 1000, colCount: 26 };
      getEngine().loadSheet(sheet);
      setActiveSheetId(id);
      setVersion((v) => v + 1);
      return { ...wb, sheets: [...wb.sheets, sheet] };
    });
  }, []);

  const setCellOnSheet = useCallback(
    (sheetName: string, row: number, col: number, raw: string) => {
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
    []
  );

  const addChart = useCallback(
    (sheetName: string, spec: Omit<ChartSpec, "id">) => {
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
    []
  );

  const removeChart = useCallback((sheetName: string, chartId: string) => {
    setWorkbook((wb) => {
      const sheets = wb.sheets.map((s) => {
        if (s.name !== sheetName) return s;
        const charts = (s.charts ?? []).filter((c) => c.id !== chartId);
        return { ...s, charts };
      });
      return { ...wb, sheets };
    });
    setVersion((v) => v + 1);
  }, []);

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
    addChart,
    removeChart,
  };
}
