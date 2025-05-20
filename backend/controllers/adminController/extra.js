const db = require("../config/db");
const { asyncHandler } = require("../middleware/asyncHandler");



module.exports = {
  searchRack: asyncHandler(async (req, res) => {
    const { rack } = req.body;

    if (!rack) {
      return res.status(400).json({
        success: false,
        message: "Rack is required",
      });
    }

    const tubes = await db.collection("tubes").find({ rack }).toArray();

    if (tubes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No tubes found for this rack",
      });
    }

    res.json({
      success: true,
      data: tubes,
    });
  }),
};
