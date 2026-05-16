const crypto = require("crypto");
const express = require("express");
const supertest = require("supertest");
const prisma = require("../src/config/prisma");
const { getTenantPrisma } = require("../src/lib/tenantPrisma");
const { errorHandler } = require("../src/middleware/errorMiddleware");
const { getLeadById, updateLead, deleteLead } = require("../src/modules/lead/lead.controller");
const { getProjectById, updateProject, deleteProject } = require("../src/modules/project/project.controller");
const { getTaskById, updateTask, deleteTask } = require("../src/modules/task/task.controller");
const { updateNote, deleteNote } = require("../src/modules/note/note.controller");

const TEST_SEED = {};

function uid(label) {
  return `test-${label}-${crypto.randomBytes(4).toString("hex")}`;
}

function describeIf(condition) {
  return condition ? describe : describe.skip;
}

const hasDb = !!process.env.DATABASE_URL;

describeIf(hasDb)("Tenant isolation — cross-tenant data access", () => {
  beforeAll(async () => {
    const cIdA = uid("compA");
    const cIdB = uid("compB");

    const [companyA, companyB] = await Promise.all([
      prisma.company.create({
        data: { id: cIdA, name: `TA ${cIdA}`, email: `${cIdA}@t.com` },
      }),
      prisma.company.create({
        data: { id: cIdB, name: `TB ${cIdB}`, email: `${cIdB}@t.com` },
      }),
    ]);

    const [userA, userB] = await Promise.all([
      prisma.user.create({
        data: {
          id: uid("uA"), name: "UA", email: `${uid("ea")}@t.com`,
          role: "ADMIN", companyId: cIdA,
        },
      }),
      prisma.user.create({
        data: {
          id: uid("uB"), name: "UB", email: `${uid("eb")}@t.com`,
          role: "ADMIN", companyId: cIdB,
        },
      }),
    ]);

    const [leadA, leadB] = await Promise.all([
      prisma.lead.create({
        data: { id: uid("lA"), name: "LA", phone: "111", companyId: cIdA, createdById: userA.id },
      }),
      prisma.lead.create({
        data: { id: uid("lB"), name: "LB", phone: "222", companyId: cIdB, createdById: userB.id },
      }),
    ]);

    const [projectA, projectB] = await Promise.all([
      prisma.project.create({
        data: { id: uid("pA"), name: "PA", location: "LA", type: "RESIDENTIAL", companyId: cIdA },
      }),
      prisma.project.create({
        data: { id: uid("pB"), name: "PB", location: "LB", type: "COMMERCIAL", companyId: cIdB },
      }),
    ]);

    const [taskA, taskB] = await Promise.all([
      prisma.task.create({
        data: { id: uid("tA"), title: "TA", companyId: cIdA, assignedToId: userA.id },
      }),
      prisma.task.create({
        data: { id: uid("tB"), title: "TB", companyId: cIdB, assignedToId: userB.id },
      }),
    ]);

    const [stageA, stageB] = await Promise.all([
      prisma.pipelineStage.create({
        data: { id: uid("sA"), name: "SA", order: 1, companyId: cIdA },
      }),
      prisma.pipelineStage.create({
        data: { id: uid("sB"), name: "SB", order: 1, companyId: cIdB },
      }),
    ]);

    const [noteA, noteB] = await Promise.all([
      prisma.note.create({
        data: { id: uid("nA"), content: "NA", leadId: leadA.id, userId: userA.id, companyId: cIdA },
      }),
      prisma.note.create({
        data: { id: uid("nB"), content: "NB", leadId: leadB.id, userId: userB.id, companyId: cIdB },
      }),
    ]);

    Object.assign(TEST_SEED, {
      cIdA, cIdB,
      companyA, companyB, userA, userB,
      leadA, leadB, projectA, projectB,
      taskA, taskB, stageA, stageB,
      noteA, noteB,
    });
  }, 30000);

  afterAll(async () => {
    const allIds = Object.values(TEST_SEED)
      .filter((v) => v && typeof v === "object" && v.id)
      .map((v) => v.id);

    const tables = ["note", "task", "activity", "lead", "project", "pipelineStage", "user", "company"];
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "${table}" WHERE id = ANY($1)`,
          [allIds],
        );
      } catch { /* best-effort */ }
    }
    await prisma.$disconnect();
  }, 15000);

  describe("findFirst correctly scopes by companyId", () => {
    const txA = () => getTenantPrisma(TEST_SEED.cIdA);
    const txB = () => getTenantPrisma(TEST_SEED.cIdB);

    test("Tenant A cannot findFirst Tenant B's lead", async () => {
      const lead = await txA().lead.findFirst({ where: { id: TEST_SEED.leadB.id } });
      expect(lead).toBeNull();
    });

    test("Tenant B cannot findFirst Tenant A's lead", async () => {
      const lead = await txB().lead.findFirst({ where: { id: TEST_SEED.leadA.id } });
      expect(lead).toBeNull();
    });

    test("Tenant A cannot findFirst Tenant B's project", async () => {
      const p = await txA().project.findFirst({ where: { id: TEST_SEED.projectB.id } });
      expect(p).toBeNull();
    });

    test("Tenant B cannot findFirst Tenant A's project", async () => {
      const p = await txB().project.findFirst({ where: { id: TEST_SEED.projectA.id } });
      expect(p).toBeNull();
    });

    test("Tenant A cannot findFirst Tenant B's task", async () => {
      const t = await txA().task.findFirst({ where: { id: TEST_SEED.taskB.id } });
      expect(t).toBeNull();
    });

    test("Tenant B cannot findFirst Tenant A's task", async () => {
      const t = await txB().task.findFirst({ where: { id: TEST_SEED.taskA.id } });
      expect(t).toBeNull();
    });

    test("Tenant A cannot findFirst Tenant B's stage", async () => {
      const s = await txA().pipelineStage.findFirst({ where: { id: TEST_SEED.stageB.id } });
      expect(s).toBeNull();
    });

    test("Tenant A cannot findFirst Tenant B's note", async () => {
      const n = await txA().note.findFirst({ where: { id: TEST_SEED.noteB.id } });
      expect(n).toBeNull();
    });

    test("Tenant A can findFirst own lead", async () => {
      const lead = await txA().lead.findFirst({ where: { id: TEST_SEED.leadA.id } });
      expect(lead).not.toBeNull();
      expect(lead.id).toBe(TEST_SEED.leadA.id);
    });

    test("Tenant B can findFirst own lead", async () => {
      const lead = await txB().lead.findFirst({ where: { id: TEST_SEED.leadB.id } });
      expect(lead).not.toBeNull();
      expect(lead.id).toBe(TEST_SEED.leadB.id);
    });
  });

  describe("findMany only returns own company data", () => {
    const txA = () => getTenantPrisma(TEST_SEED.cIdA);

    test("findMany leads only returns Tenant A leads", async () => {
      const leads = await txA().lead.findMany({ where: {} });
      const ids = leads.map((l) => l.id);
      expect(ids).toContain(TEST_SEED.leadA.id);
      expect(ids).not.toContain(TEST_SEED.leadB.id);
    });

    test("findMany projects only returns Tenant A projects", async () => {
      const projects = await txA().project.findMany({ where: {} });
      const ids = projects.map((p) => p.id);
      expect(ids).toContain(TEST_SEED.projectA.id);
      expect(ids).not.toContain(TEST_SEED.projectB.id);
    });
  });

  describe("updateMany scoped to tenant", () => {
    const txA = () => getTenantPrisma(TEST_SEED.cIdA);
    const txB = () => getTenantPrisma(TEST_SEED.cIdB);

    test("Tenant A cannot updateMany Tenant B's leads", async () => {
      const result = await txA().lead.updateMany({
        where: { id: TEST_SEED.leadB.id },
        data: { name: "Hacked" },
      });
      expect(result.count).toBe(0);
    });

    test("Tenant A can updateMany own leads", async () => {
      const result = await txA().lead.updateMany({
        where: { id: TEST_SEED.leadA.id },
        data: { name: "Updated A" },
      });
      expect(result.count).toBe(1);
    });
  });

  describe("deleteMany scoped to tenant", () => {
    const txA = () => getTenantPrisma(TEST_SEED.cIdA);
    const txB = () => getTenantPrisma(TEST_SEED.cIdB);

    test("Tenant A cannot deleteMany Tenant B's leads", async () => {
      const result = await txA().lead.deleteMany({
        where: { id: TEST_SEED.leadB.id },
      });
      expect(result.count).toBe(0);
    });
  });

  describe("create properly sets companyId", () => {
    const txA = () => getTenantPrisma(TEST_SEED.cIdA);

    test("create lead auto-injects companyId", async () => {
      const lead = await txA().lead.create({
        data: { name: "Auto Lead", phone: "333", createdById: TEST_SEED.userA.id },
      });
      expect(lead.companyId).toBe(TEST_SEED.cIdA);
      await prisma.lead.delete({ where: { id: lead.id } });
    });

    test("create task auto-injects companyId", async () => {
      const task = await txA().task.create({
        data: { title: "Auto Task", assignedToId: TEST_SEED.userA.id },
      });
      expect(task.companyId).toBe(TEST_SEED.cIdA);
      await prisma.task.delete({ where: { id: task.id } });
    });
  });
});

describeIf(hasDb)("HTTP cross-tenant probe (IDOR protection)", () => {
  let app;

  beforeAll(() => {
    const { cIdA } = TEST_SEED;
    app = express();
    app.use(express.json());

    const mockAuthTenantA = (req, res, next) => {
      req.user = {
        id: TEST_SEED.userA.id,
        companyId: cIdA,
        role: "ADMIN",
        name: "UA",
        email: "ua@t.com",
      };
      req.tenantPrisma = getTenantPrisma(cIdA);
      next();
    };

    app.get("/leads/:id", mockAuthTenantA, getLeadById);
    app.patch("/leads/:id", mockAuthTenantA, updateLead);
    app.delete("/leads/:id", mockAuthTenantA, deleteLead);

    app.get("/projects/:id", mockAuthTenantA, getProjectById);
    app.patch("/projects/:id", mockAuthTenantA, updateProject);
    app.delete("/projects/:id", mockAuthTenantA, deleteProject);

    app.get("/tasks/:id", mockAuthTenantA, getTaskById);
    app.patch("/tasks/:id", mockAuthTenantA, updateTask);
    app.delete("/tasks/:id", mockAuthTenantA, deleteTask);

    app.patch("/notes/:id", mockAuthTenantA, updateNote);
    app.delete("/notes/:id", mockAuthTenantA, deleteNote);

    app.use(errorHandler);
  });

  describe("Company A attempts to access Company B's resources", () => {
    const probes = [
      ["GET /leads/:id",         (id) => supertest(app).get(`/leads/${id}`)                                           ],
      ["PATCH /leads/:id",       (id) => supertest(app).patch(`/leads/${id}`).send({ name: "Hacked" })                ],
      ["DELETE /leads/:id",      (id) => supertest(app).delete(`/leads/${id}`)                                        ],
      ["GET /projects/:id",      (id) => supertest(app).get(`/projects/${id}`)                                        ],
      ["PATCH /projects/:id",    (id) => supertest(app).patch(`/projects/${id}`).send({ name: "Hacked" })             ],
      ["DELETE /projects/:id",   (id) => supertest(app).delete(`/projects/${id}`)                                     ],
      ["GET /tasks/:id",         (id) => supertest(app).get(`/tasks/${id}`)                                           ],
      ["PATCH /tasks/:id",       (id) => supertest(app).patch(`/tasks/${id}`).send({ title: "Hacked" })               ],
      ["DELETE /tasks/:id",      (id) => supertest(app).delete(`/tasks/${id}`)                                        ],
      ["PATCH /notes/:id",       (id) => supertest(app).patch(`/notes/${id}`).send({ content: "Hacked" })             ],
      ["DELETE /notes/:id",      (id) => supertest(app).delete(`/notes/${id}`)                                        ],
    ];

    const targetIds = {
      leads:    () => TEST_SEED.leadB.id,
      projects: () => TEST_SEED.projectB.id,
      tasks:    () => TEST_SEED.taskB.id,
      notes:    () => TEST_SEED.noteB.id,
    };

    const resourceKey = (label) => {
      if (label.includes("/leads/")) return targetIds.leads;
      if (label.includes("/projects/")) return targetIds.projects;
      if (label.includes("/tasks/")) return targetIds.tasks;
      if (label.includes("/notes/")) return targetIds.notes;
    };

    test.each(probes)("%s returns 404 for cross-tenant access", async (label, requestFn) => {
      const res = await requestFn(resourceKey(label)());
      expect(res.status).toBe(404);
    });

    test("Company A can access own lead (positive control)", async () => {
      const res = await supertest(app).get(`/leads/${TEST_SEED.leadA.id}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});

