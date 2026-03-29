import { describe, it, expect } from "vitest";
import { createReportingLinkSchema, updateHierarchyTierSchema } from "./hierarchySchemas";

describe("hierarchySchemas", () => {
  it("createReportingLinkSchema accepts positive ids", () => {
    expect(createReportingLinkSchema.parse({ subordinateId: 1, supervisorId: 2 })).toEqual({
      subordinateId: 1,
      supervisorId: 2,
    });
    expect(createReportingLinkSchema.parse({ subordinateId: "9", supervisorId: "10" })).toEqual({
      subordinateId: 9,
      supervisorId: 10,
    });
  });

  it("createReportingLinkSchema rejects non-positive ids", () => {
    expect(() => createReportingLinkSchema.parse({ subordinateId: 0, supervisorId: 1 })).toThrow();
    expect(() => createReportingLinkSchema.parse({ subordinateId: 1, supervisorId: -1 })).toThrow();
  });

  it("updateHierarchyTierSchema enforces 1..999 for non-admin users", () => {
    expect(updateHierarchyTierSchema.parse({ hierarchyTier: 1 })).toEqual({ hierarchyTier: 1 });
    expect(updateHierarchyTierSchema.parse({ hierarchyTier: 999 })).toEqual({ hierarchyTier: 999 });
    expect(() => updateHierarchyTierSchema.parse({ hierarchyTier: 0 })).toThrow();
    expect(() => updateHierarchyTierSchema.parse({ hierarchyTier: 1000 })).toThrow();
  });
});
