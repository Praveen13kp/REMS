const { ApiError } = require("../../lib/ApiError");
const { env } = require("../../lib/env");
const {
  SUPPORTED_SOURCES,
  getConfigForCompany,
  setEnabled,
  regenerate,
  resolveCompanyByToken,
  verifyFacebookSignature,
  mapPayloadToLead,
  ingestLead,
} = require("./leadIntake.service");

const publicBaseUrl = () => env.BETTER_AUTH_URL.replace(/\/+$/, "");

// PUBLIC: POST /api/intake/:source/:token
async function receiveWebhook(req, res, next) {
  try {
    const source = String(req.params.source || "").toLowerCase();
    const { token } = req.params;
    const { companyId, secret } = await resolveCompanyByToken(source, token);

    if (source === "facebook" || source === "instagram") {
      const sigHeader = req.headers["x-hub-signature-256"];
      const ok = verifyFacebookSignature(req.rawBody, secret, sigHeader);
      if (!ok) {
        return res.status(401).json({ ok: false, error: { code: "BAD_SIGNATURE", message: "Invalid signature" } });
      }
    }

    const mapped = mapPayloadToLead(source, req.body);
    const result = await ingestLead(source, companyId, mapped);
    return res.status(201).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

// AUTH: GET /api/intake/config
async function getConfig(req, res, next) {
  try {
    const view = await getConfigForCompany(req.user.companyId, publicBaseUrl());
    return res.json({ ok: true, sources: view });
  } catch (err) {
    next(err);
  }
}

// AUTH: PATCH /api/intake/:source  body: { enabled: boolean }
async function patchSource(req, res, next) {
  try {
    const source = String(req.params.source || "").toLowerCase();
    if (!SUPPORTED_SOURCES.includes(source)) {
      throw new ApiError(400, "Unsupported intake source");
    }
    if (typeof req.body?.enabled !== "boolean") {
      throw new ApiError(400, "Body must include { enabled: boolean }");
    }
    const view = await setEnabled(req.user.companyId, source, req.body.enabled, publicBaseUrl());
    return res.json({ ok: true, sources: view });
  } catch (err) {
    next(err);
  }
}

// AUTH: POST /api/intake/regenerate  body: { source: "facebook" | "instagram" }
async function postRegenerate(req, res, next) {
  try {
    const source = String(req.body?.source || "").toLowerCase();
    if (!SUPPORTED_SOURCES.includes(source)) {
      throw new ApiError(400, "Body must include { source: 'facebook' | 'instagram' }");
    }
    const result = await regenerate(req.user.companyId, source, publicBaseUrl());
    return res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { receiveWebhook, getConfig, patchSource, postRegenerate };
