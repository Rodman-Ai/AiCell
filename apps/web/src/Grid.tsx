import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { colLetters } from "@aicell/shared";
import type { WorkbookApi } from "./useWorkbook";

type Selection = { row: number; col: number };

const ROW_HEIGHT = 24;
const COL_WIDTH = 100;
const ROW_HEADER_WIDTH = 56;

type Props = {
  api: WorkbookApi;
  selection: Selection;
  onSelect: (sel: Selection) => void;
};

export function Grid({ api, selection, onSelect }: Props) {
  const { activeSheet, getRaw, getComputed, setCell, version } = api;
  const parentRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<{ row: number; col: number; draft: string } | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: activeSheet.rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const totalWidth = ROW_HEADER_WIDTH + activeSheet.colCount * COL_WIDTH;

  const beginEdit = useCallback(
    (row: number, col: number, seed?: string) => {
      const initial = seed !== undefined ? seed : getRaw(row, col);
      setEditing({ row, col, draft: initial });
    },
    [getRaw]
  );

  const commitEdit = useCallback(() => {
    if (!editing) return;
    setCell(editing.row, editing.col, editing.draft);
    setEditing(null);
  }, [editing, setCell]);

  const cancelEdit = useCallback(() => setEditing(null), []);

  const handleCellKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (editing) return;
      const { row, col } = selection;
      if (e.key === "ArrowDown") {
        onSelect({ row: Math.min(row + 1, activeSheet.rowCount - 1), col });
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        onSelect({ row: Math.max(row - 1, 0), col });
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        onSelect({ row, col: Math.max(col - 1, 0) });
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "Tab") {
        onSelect({ row, col: Math.min(col + 1, activeSheet.colCount - 1) });
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === "F2") {
        beginEdit(row, col);
        e.preventDefault();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        setCell(row, col, "");
        e.preventDefault();
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        beginEdit(row, col, e.key);
        e.preventDefault();
      }
    },
    [editing, selection, activeSheet, onSelect, beginEdit, setCell]
  );

  // Auto-focus the grid container so keyboard works after CSV import
  useEffect(() => {
    parentRef.current?.focus();
  }, [activeSheet.id]);

  return (
    <div
      className="grid-container"
      ref={parentRef}
      tabIndex={0}
      onKeyDown={handleCellKeyDown}
    >
      <div className="grid-header-row" style={{ width: totalWidth }}>
        <div className="grid-col-header corner" />
        {Array.from({ length: activeSheet.colCount }).map((_, c) => (
          <div className="grid-col-header" key={c} style={{ width: COL_WIDTH }}>
            {colLetters(c)}
          </div>
        ))}
      </div>
      <div
        className="grid"
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: totalWidth,
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((vRow) => {
          const r = vRow.index;
          return (
            <div
              key={r}
              className={`grid-row${r % 2 === 1 ? " alt" : ""}`}
              style={{
                transform: `translateY(${vRow.start}px)`,
                width: totalWidth,
              }}
            >
              <div className="grid-row-header" style={{ width: ROW_HEADER_WIDTH }}>
                {r + 1}
              </div>
              {Array.from({ length: activeSheet.colCount }).map((_, c) => (
                <CellView
                  key={c}
                  row={r}
                  col={c}
                  selected={selection.row === r && selection.col === c}
                  editing={editing && editing.row === r && editing.col === c ? editing : null}
                  versionTick={version}
                  getRaw={getRaw}
                  getComputed={getComputed}
                  onSelect={onSelect}
                  onBeginEdit={beginEdit}
                  onChangeDraft={(v) =>
                    setEditing((prev) => (prev ? { ...prev, draft: v } : prev))
                  }
                  onCommit={commitEdit}
                  onCancel={cancelEdit}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CellProps = {
  row: number;
  col: number;
  selected: boolean;
  editing: { row: number; col: number; draft: string } | null;
  versionTick: number;
  getRaw: (row: number, col: number) => string;
  getComputed: WorkbookApi["getComputed"];
  onSelect: (sel: Selection) => void;
  onBeginEdit: (row: number, col: number) => void;
  onChangeDraft: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
};

function CellView({
  row,
  col,
  selected,
  editing,
  versionTick,
  getRaw,
  getComputed,
  onSelect,
  onBeginEdit,
  onChangeDraft,
  onCommit,
  onCancel,
}: CellProps) {
  // versionTick included so component re-evaluates after recalc
  void versionTick;
  const computed = getComputed(row, col);
  const raw = getRaw(row, col);
  const display =
    computed.error !== undefined
      ? computed.error
      : computed.value === null
        ? ""
        : String(computed.value);
  const isNumeric = typeof computed.value === "number";

  if (editing) {
    return (
      <div
        className={`grid-cell selected${isNumeric ? " numeric" : ""}`}
        style={{ width: COL_WIDTH }}
      >
        <input
          autoFocus
          value={editing.draft}
          onChange={(e) => onChangeDraft(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onCommit();
              e.preventDefault();
            } else if (e.key === "Escape") {
              onCancel();
              e.preventDefault();
            } else if (e.key === "Tab") {
              onCommit();
              // Tab handling for next cell is done by parent on next keydown
            }
            e.stopPropagation();
          }}
        />
      </div>
    );
  }

  const cls = [
    "grid-cell",
    isNumeric ? "numeric" : "",
    computed.error ? "error" : "",
    selected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      style={{ width: COL_WIDTH }}
      title={raw && raw !== display ? raw : undefined}
      onClick={() => onSelect({ row, col })}
      onDoubleClick={() => onBeginEdit(row, col)}
    >
      {display}
    </div>
  );
}
