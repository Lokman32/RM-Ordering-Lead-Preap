const db = require("../config/db");
const { asyncHandler } = require("../middleware/asyncHandler");

module.exports = {
  testApn: asyncHandler(async (req, res) => {
    const { value } = req.query;
    if (!value) throw new Error("Value parameter is required");

    const exists = await db.collection("tubes").findOne({ dpn: value });

    res.json({ success: true, exists });
  }),
};
