const {
  getPreferencesService,
  updatePreferencesService,
  getPrismaClient,
} = require("./notificationPreference.service");

const getPreferences = async (req, res, next) => {
  try {
    const p = getPrismaClient(req.user.companyId);
    const data = await getPreferencesService(p, req.user.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({ ok: false, error: { message: "Missing preferences object" } });
    }
    const p = getPrismaClient(req.user.companyId);
    const data = await updatePreferencesService(p, req.user.id, preferences);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPreferences,
  updatePreferences,
};
