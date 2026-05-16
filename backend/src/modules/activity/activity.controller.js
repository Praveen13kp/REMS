const { z } = require("zod");
const { ApiError } = require("../../lib/ApiError");
const { getLeadActivityService, logActivity } = require("./activity.service");

const getLeadActivity = async (req, res, next) => {
  try {
    const result = await getLeadActivityService(req.tenantPrisma, req.params.leadId, req.query);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

// Quick-action endpoint for "Log Call", "Log WhatsApp", "Log Email" — the
// FE buttons on LeadDetail need to record an activity even though the
// actual call/message happens outside the app.
const MANUAL_ACTIVITY_TYPES = ["CALL", "WHATSAPP", "EMAIL", "NOTE"];
const createActivitySchema = z.object({
  type: z.enum(MANUAL_ACTIVITY_TYPES),
  content: z.string().min(1).max(2000).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const createLeadActivity = async (req, res, next) => {
  try {
    const lead = await req.tenantPrisma.lead.findFirst({
      where: { id: req.params.leadId },
      select: { id: true },
    });
    if (!lead) throw new ApiError(404, "Lead not found");

    const parsed = createActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message || "Invalid input");
    }

    const defaultContent = {
      CALL: "Logged a call",
      WHATSAPP: "Logged a WhatsApp message",
      EMAIL: "Logged an email",
      NOTE: "Added a note",
    };

    const activity = await logActivity(req.tenantPrisma, {
      leadId: req.params.leadId,
      userId: req.user.id,
      type: parsed.data.type,
      content: parsed.data.content || defaultContent[parsed.data.type],
      metadata: parsed.data.metadata,
    });

    // Touch lastContactedAt for outbound contact types so the lead bubbles
    // up in "recently contacted" views.
    if (parsed.data.type === "CALL" || parsed.data.type === "WHATSAPP" || parsed.data.type === "EMAIL") {
      await req.tenantPrisma.lead.updateMany({
        where: { id: req.params.leadId },
        data: { lastContactedAt: new Date() },
      });
    }

    res.status(201).json({ ok: true, data: activity });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeadActivity, createLeadActivity };
