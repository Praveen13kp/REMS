const { promisify } = require("util");
const dns = require("dns");

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidFormat(email) {
  return EMAIL_REGEX.test(email);
}

function extractDomain(email) {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

const MX_CACHE = new Map();
const MX_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// DNS error codes that mean a *definitive* "this name has no such records",
// as opposed to a transient failure (timeout, server error, refused) where
// we can't conclude anything and must not block a legitimate signup.
const DEFINITIVE_NEGATIVE = new Set(["ENOTFOUND", "NXDOMAIN", "ENODATA", "ENOTIMP"]);

async function tryResolve(fn, domain) {
  try {
    return { records: await fn(domain) };
  } catch (error) {
    return { error };
  }
}

// True if a single lookup definitively found nothing: either an empty result
// set with no error, or a "no such record / no such domain" error code.
function definitiveNegative(r) {
  if (r.error) return DEFINITIVE_NEGATIVE.has(r.error.code);
  return !Array.isArray(r.records) || r.records.length === 0;
}

// Whether a domain can plausibly receive mail. Checks MX, then falls back to
// A/AAAA (RFC 5321 implicit MX — a domain with an address record still
// accepts mail). Returns true on any transient DNS failure (fail-open) so a
// momentary resolver hiccup never blocks signup, and only caches definitive
// results.
async function domainAcceptsMail(domain) {
  const cached = MX_CACHE.get(domain);
  if (cached && Date.now() - cached.timestamp < MX_CACHE_TTL) {
    return cached.exists;
  }

  const mx = await tryResolve(resolveMx, domain);
  if (mx.records && mx.records.length > 0) {
    MX_CACHE.set(domain, { exists: true, timestamp: Date.now() });
    return true;
  }

  // No usable MX — fall back to address records (implicit MX).
  const a = await tryResolve(resolve4, domain);
  if (a.records && a.records.length > 0) {
    MX_CACHE.set(domain, { exists: true, timestamp: Date.now() });
    return true;
  }
  const aaaa = await tryResolve(resolve6, domain);
  if (aaaa.records && aaaa.records.length > 0) {
    MX_CACHE.set(domain, { exists: true, timestamp: Date.now() });
    return true;
  }

  // Nothing resolved. Only reject when EVERY lookup was a definitive negative
  // (no records / no such domain). If any lookup hit a transient error, treat
  // the result as inconclusive → allow, and don't cache so a retry re-checks.
  const allDefinitive = [mx, a, aaaa].every(definitiveNegative);
  if (allDefinitive) {
    MX_CACHE.set(domain, { exists: false, timestamp: Date.now() });
    return false;
  }

  // Inconclusive — a DNS timeout, network blip, or resolver error. We let the
  // request through rather than block a legitimate user, but log it so these
  // are visible (and don't cache, so the next attempt re-checks).
  const codes = [mx.error, a.error, aaaa.error]
    .filter(Boolean)
    .map((e) => e.code || "UNKNOWN");
  // eslint-disable-next-line no-console
  console.warn(
    `[emailVerification] MX/A lookup inconclusive for "${domain}" (${codes.join(", ")}); allowing email without domain verification.`,
  );
  return true;
}

async function verifyEmailExists(email) {
  if (!isValidFormat(email)) {
    return { valid: false, reason: "Invalid email format" };
  }

  const domain = extractDomain(email);
  if (!domain) {
    return { valid: false, reason: "Could not extract domain" };
  }

  const accepts = await domainAcceptsMail(domain);
  if (!accepts) {
    return { valid: false, reason: "Email domain does not accept mail" };
  }

  return { valid: true };
}

module.exports = { verifyEmailExists, isValidFormat };
