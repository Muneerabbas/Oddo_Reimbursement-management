import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

const dbReady =
  Boolean(process.env.DATABASE_URL) ||
  (Boolean(process.env.DB_HOST) &&
    Boolean(process.env.DB_NAME) &&
    Boolean(process.env.DB_USER) &&
    process.env.DB_PASSWORD !== undefined);

describe.skipIf(!dbReady)("Hierarchy API (integration)", () => {
  let app: import("express").Application;
  let pool: import("pg").Pool;
  let jwtSecret: string;
  let authToken: string;
  let companyId: number;
  let adminId: number;
  let mgrHighId: number;
  let mgrLowId: number;
  let empId: number;

  beforeAll(async () => {
    const { createApp } = await import("../app");
    const { pool: p } = await import("../config/db");
    const { env } = await import("../config/env");
    const { ensureReportingHierarchySchema } = await import("../db/ensureReportingHierarchy");
    const bcrypt = await import("bcryptjs");
    const jwt = await import("jsonwebtoken");

    pool = p;
    jwtSecret = env.jwtSecret;
    app = createApp();
    await ensureReportingHierarchySchema();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const hash = await bcrypt.hash("HierarchyTest!9", 10);

    const co = await pool.query<{ id: number }>(
      `INSERT INTO companies (name, default_currency) VALUES ($1, 'INR') RETURNING id`,
      [`Hierarchy Test Co ${suffix}`],
    );
    companyId = co.rows[0].id;

    const adm = await pool.query<{ id: number }>(
      `INSERT INTO users (company_id, email, password_hash, full_name, role, hierarchy_tier)
       VALUES ($1, $2, $3, 'Test Admin', 'admin', 0) RETURNING id`,
      [companyId, `ht-admin-${suffix}@test.local`, hash],
    );
    adminId = adm.rows[0].id;

    await pool.query(`UPDATE companies SET admin_user_id = $1 WHERE id = $2`, [adminId, companyId]);

    const mHi = await pool.query<{ id: number }>(
      `INSERT INTO users (company_id, email, password_hash, full_name, role, hierarchy_tier)
       VALUES ($1, $2, $3, 'Mgr High', 'manager', 10) RETURNING id`,
      [companyId, `ht-mgr-hi-${suffix}@test.local`, hash],
    );
    mgrHighId = mHi.rows[0].id;

    const mLo = await pool.query<{ id: number }>(
      `INSERT INTO users (company_id, email, password_hash, full_name, role, hierarchy_tier)
       VALUES ($1, $2, $3, 'Mgr Low', 'manager', 20) RETURNING id`,
      [companyId, `ht-mgr-lo-${suffix}@test.local`, hash],
    );
    mgrLowId = mLo.rows[0].id;

    const emp = await pool.query<{ id: number }>(
      `INSERT INTO users (company_id, email, password_hash, full_name, role, hierarchy_tier)
       VALUES ($1, $2, $3, 'Employee', 'employee', 50) RETURNING id`,
      [companyId, `ht-emp-${suffix}@test.local`, hash],
    );
    empId = emp.rows[0].id;

    authToken = jwt.default.sign(
      { sub: adminId, companyId, role: "admin" },
      jwtSecret,
      { expiresIn: "1h" },
    );
  });

  afterAll(async () => {
    if (!dbReady) return;
    await pool.query("DELETE FROM companies WHERE id = $1", [companyId]);
  });

  const auth = () => ({ Authorization: `Bearer ${authToken}` });

  it("runs ordered hierarchy checks against a live DB (single flow)", async () => {
    const h = await request(app).get("/api/teams/hierarchy").set(auth());
    expect(h.status).toBe(200);
    expect(h.body.nodes.length).toBeGreaterThanOrEqual(4);
    expect(h.body.nodes.find((n: { id: number }) => n.id === empId).hierarchyTier).toBe(50);
    expect(Array.isArray(h.body.links)).toBe(true);

    const createEmpToHigh = await request(app)
      .post("/api/teams/hierarchy/links")
      .set(auth())
      .send({ subordinateId: empId, supervisorId: mgrHighId });
    expect(createEmpToHigh.status).toBe(201);
    expect(createEmpToHigh.body.link.supervisorId).toBe(mgrHighId);

    const dup = await request(app)
      .post("/api/teams/hierarchy/links")
      .set(auth())
      .send({ subordinateId: empId, supervisorId: mgrHighId });
    expect(dup.status).toBe(409);

    const badTier = await request(app)
      .post("/api/teams/hierarchy/links")
      .set(auth())
      .send({ subordinateId: mgrHighId, supervisorId: mgrLowId });
    expect(badTier.status).toBe(400);
    expect(String(badTier.body.message)).toMatch(/tier/i);

    await pool.query(
      `INSERT INTO reporting_links (company_id, subordinate_id, supervisor_id) VALUES ($1, $2, $3)
       ON CONFLICT (company_id, subordinate_id, supervisor_id) DO NOTHING`,
      [companyId, mgrLowId, mgrHighId],
    );

    await pool.query(`UPDATE users SET hierarchy_tier = 5 WHERE id = $1 AND company_id = $2`, [
      mgrLowId,
      companyId,
    ]);

    const cycle = await request(app)
      .post("/api/teams/hierarchy/links")
      .set(auth())
      .send({ subordinateId: mgrHighId, supervisorId: mgrLowId });
    expect(cycle.status).toBe(400);
    expect(String(cycle.body.message)).toMatch(/hierarchy|break/i);

    const tierBlock = await request(app)
      .patch(`/api/teams/hierarchy/users/${mgrHighId}/tier`)
      .set(auth())
      .send({ hierarchyTier: 25 });
    expect(tierBlock.status).toBe(400);
    expect(String(tierBlock.body.message)).toMatch(/above|subordinate|tier/i);

    const del = await request(app)
      .delete(`/api/teams/hierarchy/links/${empId}/${mgrHighId}`)
      .set(auth());
    expect(del.status).toBe(204);
  });
});
