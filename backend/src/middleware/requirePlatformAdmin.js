function requirePlatformAdmin(req, res, next) {
  if (req.user?.role !== "PLATFORM_ADMIN" && req.user?.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      ok: false,
      error: { code: "FORBIDDEN", message: "Platform admin access required" },
    });
  }
  next();
}

module.exports = { requirePlatformAdmin };
