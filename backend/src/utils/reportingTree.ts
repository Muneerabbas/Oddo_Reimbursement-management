/** Directed edge: subordinate reports to supervisor. */
export type ReportingEdge = { subordinateId: number; supervisorId: number };

/** Map supervisor id → direct subordinate ids. */
export function buildSubordinateAdjacency(edges: ReportingEdge[]): Map<number, number[]> {
  const bySupervisor = new Map<number, number[]>();
  for (const e of edges) {
    if (!bySupervisor.has(e.supervisorId)) bySupervisor.set(e.supervisorId, []);
    bySupervisor.get(e.supervisorId)!.push(e.subordinateId);
  }
  return bySupervisor;
}

/**
 * True if `candidateId` is a direct or indirect report of `rootSupervisorId`
 * (walk edges supervisor → subordinates).
 */
export function isUnderSupervisorTree(
  bySupervisor: Map<number, number[]>,
  rootSupervisorId: number,
  candidateId: number,
): boolean {
  const q = [...(bySupervisor.get(rootSupervisorId) || [])];
  const seen = new Set<number>();
  while (q.length) {
    const n = q.shift()!;
    if (n === candidateId) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    for (const c of bySupervisor.get(n) || []) q.push(c);
  }
  return false;
}
