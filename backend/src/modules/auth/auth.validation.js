const signupValidation = (req, res, next) => {

  const {
    name,
    email,
    password,
  } = req.body;

  if (!name || !email || !password) {

    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });

  }

  next();
};

module.exports = {
  signupValidation,
};