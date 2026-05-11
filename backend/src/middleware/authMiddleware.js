const authMiddleware = (req, res, next) => {

  // Better Auth session logic here later

  next();
};

module.exports = authMiddleware;