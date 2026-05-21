const { getSubscription, previewCheckout, activateSubscription } = require("./subscription.service");

const me = async (req, res, next) => {
  try {
    const data = await getSubscription(req.user.companyId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const checkout = async (req, res, next) => {
  try {
    const data = await previewCheckout(req.user.companyId, req.body?.plan);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

const confirm = async (req, res, next) => {
  try {
    const data = await activateSubscription(req.user.companyId, {
      plan: req.body?.plan,
      transactionId: req.body?.transactionId,
      paymentProvider: req.body?.paymentProvider,
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { me, checkout, confirm };
