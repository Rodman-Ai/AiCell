import { describe, it, expect } from "vitest";
import { CalcEngine } from "./index";
import type { Sheet } from "@aicell/shared";

const blankSheet = (): Sheet => ({
  id: "s1",
  name: "Sheet1",
  cells: {},
  rowCount: 100,
  colCount: 26,
});

describe("CalcEngine", () => {
  it("computes literal numeric values", () => {
    const e = new CalcEngine();
    e.loadSheet(blankSheet());
    e.setCell("Sheet1", 0, 0, "42");
    expect(e.getValue("Sheet1", 0, 0).value).toBe(42);
    e.destroy();
  });

  it("computes SUM across a range", () => {
    const e = new CalcEngine();
    e.loadSheet(blankSheet());
    e.setCell("Sheet1", 0, 0, "1");
    e.setCell("Sheet1", 1, 0, "2");
    e.setCell("Sheet1", 2, 0, "3");
    e.setCell("Sheet1", 3, 0, "=SUM(A1:A3)");
    expect(e.getValue("Sheet1", 3, 0).value).toBe(6);
    e.destroy();
  });

  it("recalculates dependent cells when a precedent changes", () => {
    const e = new CalcEngine();
    e.loadSheet(blankSheet());
    e.setCell("Sheet1", 0, 0, "10");
    e.setCell("Sheet1", 0, 1, "=A1*2");
    expect(e.getValue("Sheet1", 0, 1).value).toBe(20);
    e.setCell("Sheet1", 0, 0, "5");
    expect(e.getValue("Sheet1", 0, 1).value).toBe(10);
    e.destroy();
  });

  it("loads a sheet with pre-populated cells and computes formulas", () => {
    const e = new CalcEngine();
    e.loadSheet({
      id: "s1",
      name: "Sheet1",
      cells: {
        "0,0": { raw: "5" },
        "0,1": { raw: "7" },
        "0,2": { raw: "=A1+B1" },
      },
      rowCount: 10,
      colCount: 10,
    });
    expect(e.getValue("Sheet1", 0, 2).value).toBe(12);
    e.destroy();
  });

  it("returns an error for invalid formulas", () => {
    const e = new CalcEngine();
    e.loadSheet(blankSheet());
    e.setCell("Sheet1", 0, 0, "=NOT_A_FUNCTION()");
    const result = e.getValue("Sheet1", 0, 0);
    expect(result.error).toBeDefined();
    e.destroy();
  });

  it("supports VLOOKUP", () => {
    const e = new CalcEngine();
    e.loadSheet(blankSheet());
    e.setCell("Sheet1", 0, 0, "apple");
    e.setCell("Sheet1", 0, 1, "100");
    e.setCell("Sheet1", 1, 0, "banana");
    e.setCell("Sheet1", 1, 1, "200");
    e.setCell("Sheet1", 2, 0, "cherry");
    e.setCell("Sheet1", 2, 1, "300");
    e.setCell("Sheet1", 4, 0, '=VLOOKUP("banana",A1:B3,2,0)');
    expect(e.getValue("Sheet1", 4, 0).value).toBe(200);
    e.destroy();
  });

  it("clears a cell when set to empty string", () => {
    const e = new CalcEngine();
    e.loadSheet(blankSheet());
    e.setCell("Sheet1", 0, 0, "99");
    expect(e.getValue("Sheet1", 0, 0).value).toBe(99);
    e.setCell("Sheet1", 0, 0, "");
    expect(e.getValue("Sheet1", 0, 0).value).toBeNull();
    e.destroy();
  });
});
