const {
  signupService,
  loginService,
} = require("./auth.service");


// ================= SIGNUP =================

const signup = async (req, res) => {

  try {

    const user = await signupService(req.body);

    res.status(201).json({
      success: true,
      message: "Signup successful",
      data: user,
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message,
    });

  }
};


// ================= LOGIN =================

const login = async (req, res) => {

  try {

    const user = await loginService(req.body.email);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: user,
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = {
  signup,
  login,
};