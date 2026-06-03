const rbacMiddleware = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied",
      });
    }

    next();
  };
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied",
      });
    }

    next();
  };
};

const { isModuleDenied } = require("../lib/modules");

// Enforce owner-configured module access on the API. Mount after
// authMiddleware. Only bites MANAGER/AGENT whose owner has actually
// restricted the module (company allow-list or per-user override); every
// other role and the default/unrestricted case passes straight through.
const requireModule = (moduleName) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return next(); // auth middleware will have rejected already
    const companyRestrictions = user.company?.moduleRestrictions || null;
    const userOverrides = user.moduleOverrides || null;
    if (isModuleDenied(moduleName, user.role, companyRestrictions, userOverrides)) {
      return res.status(403).json({
        ok: false,
        error: {
          code: "MODULE_RESTRICTED",
          message: `The ${moduleName} module has been restricted for your role.`,
        },
      });
    }
    next();
  };
};

module.exports = { rbacMiddleware, requireRole, requireModule };