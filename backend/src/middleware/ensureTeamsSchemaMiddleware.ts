import type { Request, Response, NextFunction } from "express";
import { ensureCompanyTeamsSchema } from "../db/ensureCompanyTeamsSchema";
import { ensureReportingHierarchySchema } from "../db/ensureReportingHierarchy";

let ready: Promise<void> | null = null;

function getTeamsSchemaReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureCompanyTeamsSchema();
      await ensureReportingHierarchySchema();
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

/**
 * Ensures company_roles / company_role_id and hierarchy_tier / reporting_links exist before team routes run.
 * Fixes 500s on older databases that never ran SQL migrations.
 */
export function ensureTeamsSchemaMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  void getTeamsSchemaReady()
    .then(() => next())
    .catch((e) => {
      console.error("ensureTeamsSchemaMiddleware", e);
      res.status(503).json({
        message:
          "Could not prepare the database for Teams. Ensure migrations ran or the DB user can run DDL, then retry.",
      });
    });
}
