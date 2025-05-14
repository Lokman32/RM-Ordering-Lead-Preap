const db = require("../config/db");
const { asyncHandler } = require("../middleware/asyncHandler");



module.exports = {
  updateRack: asyncHandler(async (req, res) => {
    const { dpn, rack } = req.body;
    if (!dpn || !rack) {
      return res.status(400).json({
        success: false,
        message: "DPN and Rack are required",
      });
    }

    const result = await db
      .collection("tubes")
      .updateOne({ dpn }, { $set: { rack } });

    if (result.modifiedCount > 0) {
      res.json({
        success: true,
        message: `Rack updated successfully for DPN: ${dpn}`,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Tube with DPN: ${dpn} not found`,
      });
    }
  }),

  updateDescription: asyncHandler(async (req, res) => {
    const { apn, commande_id } = req.params;
    const { description } = req.body;

    try {
      const result = await db.collection("commandes").updateOne(
        {
          serial_cmd: commande_id,
          "ligne_commande.apn": apn,
        },
        {
          $set: {
            "ligne_commande.$.description": description,
            "ligne_commande.$.updated_at": new Date(),
          },
        }
      );

      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Entry not found" });
      }

      res.json({ success: true, message: "Description updated" });
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update description",
      });
    }
  }),
};
