import { describe, it, expect } from "vitest";
import { buildSubordinateAdjacency, isUnderSupervisorTree } from "./reportingTree";

describe("reportingTree", () => {
  it("buildSubordinateAdjacency groups multiple reports per supervisor", () => {
    const adj = buildSubordinateAdjacency([
      { subordinateId: 1, supervisorId: 10 },
      { subordinateId: 2, supervisorId: 10 },
      { subordinateId: 3, supervisorId: 20 },
    ]);
    expect(adj.get(10)?.sort((a, b) => a - b)).toEqual([1, 2]);
    expect(adj.get(20)).toEqual([3]);
  });

  it("detects direct report in supervisor subtree", () => {
    const adj = buildSubordinateAdjacency([{ subordinateId: 5, supervisorId: 9 }]);
    expect(isUnderSupervisorTree(adj, 9, 5)).toBe(true);
    expect(isUnderSupervisorTree(adj, 9, 9)).toBe(false);
    expect(isUnderSupervisorTree(adj, 5, 9)).toBe(false);
  });

  it("detects indirect (transitive) report", () => {
    const adj = buildSubordinateAdjacency([
      { subordinateId: 1, supervisorId: 2 },
      { subordinateId: 2, supervisorId: 3 },
    ]);
    expect(isUnderSupervisorTree(adj, 3, 1)).toBe(true);
    expect(isUnderSupervisorTree(adj, 3, 2)).toBe(true);
    expect(isUnderSupervisorTree(adj, 1, 3)).toBe(false);
  });

  it("matches hierarchy cycle scenario: employee 7 reports to manager 8 -> 7 is in 8 subtree", () => {
    const adj = buildSubordinateAdjacency([{ subordinateId: 7, supervisorId: 8 }]);
    expect(isUnderSupervisorTree(adj, 8, 7)).toBe(true);
    expect(isUnderSupervisorTree(adj, 7, 8)).toBe(false);
  });

  it("handles diamond without false positives on unrelated nodes", () => {
    const adj = buildSubordinateAdjacency([
      { subordinateId: 2, supervisorId: 1 },
      { subordinateId: 3, supervisorId: 1 },
      { subordinateId: 4, supervisorId: 2 },
      { subordinateId: 4, supervisorId: 3 },
    ]);
    expect(isUnderSupervisorTree(adj, 1, 4)).toBe(true);
    expect(isUnderSupervisorTree(adj, 4, 1)).toBe(false);
  });

  it("handles empty graph", () => {
    const adj = buildSubordinateAdjacency([]);
    expect(isUnderSupervisorTree(adj, 1, 2)).toBe(false);
  });
});
