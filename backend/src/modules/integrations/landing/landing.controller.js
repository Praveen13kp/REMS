const { logger } = require("../../../lib/logger");
const { getDriver } = require("../drivers");
const { resolveByLandingSlug } = require("../integrations.service");
const {
  ingestLead,
  recordWebhookEvent,
  markEventProcessed,
  markEventFailed,
} = require("../ingest.service");

function notFound(res) {
  return res.status(404).type("text/plain").send("Landing page not found");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLandingHtml({ slug, projectName }) {
  const title = escapeHtml(projectName || "Premium Residences");
  const submitUrl = `/api/public/landing/${encodeURIComponent(slug)}/submit`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — Enquire now</title>
<style>
  *,*::before,*::after { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2937; background: #f5f7f8; }
  .hero { background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: #fff; padding: 56px 20px 96px; text-align: center; }
  .hero h1 { margin: 0 0 12px; font-size: clamp(28px, 4.2vw, 44px); font-weight: 700; letter-spacing: -0.01em; }
  .hero .sub { font-size: clamp(14px, 1.8vw, 17px); opacity: 0.94; margin-bottom: 8px; }
  .hero .pill { font-size: clamp(14px, 1.8vw, 17px); font-weight: 600; opacity: 0.96; }
  .grid { max-width: 1080px; margin: -56px auto 40px; padding: 0 20px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
  @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
  .card { background: #fff; border-radius: 14px; box-shadow: 0 8px 24px rgba(15,23,42,0.08); padding: 28px; }
  .card h2 { margin: 0 0 12px; font-size: 22px; color: #0f172a; }
  .card p { line-height: 1.6; color: #374151; }
  .card ul { padding-left: 20px; line-height: 1.9; color: #374151; }
  .form .field { margin-bottom: 14px; }
  .form label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #111827; }
  .form input { width: 100%; padding: 11px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s; }
  .form input:focus { border-color: #0f766e; box-shadow: 0 0 0 3px rgba(15,118,110,0.15); }
  .form button { width: 100%; padding: 12px; border: 0; border-radius: 8px; background: #0f766e; color: #fff; font-weight: 600; font-size: 15px; cursor: pointer; transition: background .15s; }
  .form button:hover { background: #0e6b63; }
  .form button:disabled { opacity: 0.6; cursor: progress; }
  .muted { font-size: 13px; color: #6b7280; margin-top: -4px; margin-bottom: 14px; }
  .thanks { text-align: center; padding: 24px 8px; }
  .thanks .check { width: 56px; height: 56px; border-radius: 50%; background: #d1fae5; color: #047857; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 12px; }
  .err { color: #b91c1c; font-size: 13px; margin-top: 8px; }
  footer { text-align: center; padding: 18px; color: #9ca3af; font-size: 12px; }
</style>
</head>
<body>
  <section class="hero">
    <h1>${title}</h1>
    <div class="sub">Premium 2 &amp; 3 BHK apartments · Possession in 24 months</div>
    <div class="pill">Starting ₹78 L · No floor rise · 0% pre-EMI for 18 months</div>
  </section>

  <div class="grid">
    <div class="card">
      <h2>A landmark address, designed around your life.</h2>
      <p>Hotel-grade amenities, sweeping views and a clubhouse that respects your weekends. Built by an experienced developer with a track record of on-time delivery.</p>
      <ul>
        <li>2 BHK · 750 sqft onwards</li>
        <li>3 BHK · 1,120 sqft onwards</li>
        <li>15-floor towers, 4-side open layouts</li>
        <li>Clubhouse, pool, gym, kids' park, multipurpose courts</li>
        <li>Walking distance to IT parks, schools &amp; metro</li>
      </ul>
    </div>

    <div class="card">
      <h2>Get a callback in 15 minutes</h2>
      <div class="muted">Share your details — our sales team will reach out with availability, floor plans and a price breakup.</div>
      <form id="lead-form" class="form" novalidate>
        <div class="field">
          <label for="f-name">Your name</label>
          <input id="f-name" name="name" placeholder="e.g. Rahul Verma" required />
        </div>
        <div class="field">
          <label for="f-phone">Mobile number</label>
          <input id="f-phone" name="phone" placeholder="+91 98765 43210" required />
        </div>
        <div class="field">
          <label for="f-email">Email</label>
          <input id="f-email" name="email" type="email" placeholder="you@email.com" />
        </div>
        <div class="field">
          <label for="f-city">City</label>
          <input id="f-city" name="city" placeholder="Pune" />
        </div>
        <button type="submit" id="submit-btn">Request callback</button>
        <div id="err" class="err"></div>
      </form>
      <div id="thanks" class="thanks" style="display:none">
        <div class="check">✓</div>
        <h2 style="margin:0 0 6px">Thanks — we'll be in touch.</h2>
        <p style="color:#4b5563">Our team will call you shortly with the details.</p>
      </div>
    </div>
  </div>

  <footer>Powered by Bizzfly</footer>

<script>
(function () {
  var form = document.getElementById('lead-form');
  var thanks = document.getElementById('thanks');
  var btn = document.getElementById('submit-btn');
  var err = document.getElementById('err');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    err.textContent = '';
    var data = Object.fromEntries(new FormData(form).entries());
    if (!data.name || !data.phone) {
      err.textContent = 'Name and mobile number are required.';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      var res = await fetch(${JSON.stringify(submitUrl)}, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      var j = await res.json().catch(function () { return {}; });
      if (res.ok && j.ok !== false) {
        form.style.display = 'none';
        thanks.style.display = 'block';
      } else {
        err.textContent = (j && j.error && j.error.message) || 'Could not submit. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Request callback';
      }
    } catch (ex) {
      err.textContent = 'Network error. Please try again.';
      btn.disabled = false;
      btn.textContent = 'Request callback';
    }
  });
})();
</script>
</body>
</html>`;
}

async function renderLanding(req, res, next) {
  try {
    const resolved = await resolveByLandingSlug(req.params.slug);
    if (!resolved) return notFound(res);
    const html = renderLandingHtml({
      slug: req.params.slug,
      projectName: resolved.row.label,
    });
    res.set("Content-Type", "text/html; charset=utf-8");
    // Don't let intermediaries cache the page across credential rotations.
    res.set("Cache-Control", "no-store");
    // Override Helmet's default CSP so the inline submit handler can run.
    // The page is otherwise self-contained — no third-party scripts loaded.
    res.set(
      "Content-Security-Policy",
      "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors *",
    );
    // Helmet sets X-Frame-Options: SAMEORIGIN by default, which would
    // block the Settings-modal iframe preview when FE and BE are served
    // from different origins (Vite :5173 vs API :5000). Clear it so the
    // preview renders; CSP frame-ancestors above is the modern equivalent.
    res.removeHeader("X-Frame-Options");
    return res.status(200).send(html);
  } catch (err) {
    next(err);
  }
}

async function submitLanding(req, res, next) {
  const resolved = await resolveByLandingSlug(req.params.slug);
  if (!resolved) return notFound(res);

  const driver = getDriver(resolved.row.provider);
  if (!driver) return notFound(res);

  // Synthesise an externalId per submission. Unlike the webhook path we
  // don't want body-hash dedupe here — two real visitors with identical
  // first names + cities shouldn't be merged.
  const externalId = `landing_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  const eventRow = await recordWebhookEvent({
    provider: resolved.row.provider,
    externalId,
    credentialId: resolved.row.id,
    rawPayload: req.body || {},
  });

  try {
    const mapped = driver.mapToLead(req.body || {}, { credentials: resolved.credentials });
    if (!mapped || (!mapped.phone && !mapped.email)) {
      await markEventFailed(eventRow.id, "missing phone/email");
      return res.status(400).json({ ok: false, error: { code: 400, message: "Name and mobile number are required" } });
    }
    mapped.externalId = externalId;
    const result = await ingestLead({ companyId: resolved.row.companyId, mapped });
    await markEventProcessed(eventRow.id, { leadId: result.id, deduped: result.deduped });
    return res.status(200).json({ ok: true, deduped: result.deduped });
  } catch (err) {
    logger.error({ err: err?.message, slug: req.params.slug }, "landing submit failed");
    await markEventFailed(eventRow.id, err?.message);
    return res.status(500).json({ ok: false, error: { code: 500, message: "Could not submit" } });
  }
}

module.exports = { renderLanding, submitLanding };
