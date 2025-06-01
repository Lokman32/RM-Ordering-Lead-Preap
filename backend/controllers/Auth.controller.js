const db = require("../config/db");
const { asyncHandler } = require("../middleware/asyncHandler");
const { JWT_SECRET, JWT_EXPIRES } = process.env;
const jwt = require("jsonwebtoken");

module.exports = {
  loginPost: asyncHandler(async (req, res) => {
    const { matricule } = req.body;
    if (!matricule) {
      throw new Error("Matricule is required");
    }

    const id = parseInt(matricule, 10);
    const user = await db.collection("users").findOne({ matricule: id });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const token = jwt.sign(
      {
        matricule: user.matricule,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      data: {
        matricule: user.matricule,
        role: user.role,
      },
      token,
    });
  }),

  logout: asyncHandler(async (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
  }),
};
