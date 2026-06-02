const { promisify } = require("util");
const dns = require("dns");

const resolveMx = promisify(dns.resolveMx);

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

async function domainHasMxRecords(domain) {
  const cached = MX_CACHE.get(domain);
  if (cached && Date.now() - cached.timestamp < MX_CACHE_TTL) {
    return cached.exists;
  }

  try {
    const records = await resolveMx(domain);
    const exists = Array.isArray(records) && records.length > 0;
    MX_CACHE.set(domain, { exists, timestamp: Date.now() });
    return exists;
  } catch {
    MX_CACHE.set(domain, { exists: false, timestamp: Date.now() });
    return false;
  }
}

async function verifyEmailExists(email) {
  if (!isValidFormat(email)) {
    return { valid: false, reason: "Invalid email format" };
  }

  const domain = extractDomain(email);
  if (!domain) {
    return { valid: false, reason: "Could not extract domain" };
  }

  const hasMx = await domainHasMxRecords(domain);
  if (!hasMx) {
    return { valid: false, reason: "Email domain does not accept mail" };
  }

  return { valid: true };
}

module.exports = { verifyEmailExists, isValidFormat };
