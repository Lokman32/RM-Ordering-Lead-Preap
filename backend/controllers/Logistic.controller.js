const db = require("../config/db");
const { asyncHandler } = require("../middleware/asyncHandler");

module.exports = {
  logistic: asyncHandler(async (req, res) => {
    const commandes = await db
      .collection("commandes")
      .aggregate([
      { $unwind: "$ligne_commande" },
      {
        $match: {
        status: { $nin: ["confirmed", "livred", "cancelled"] },
        "ligne_commande.status": { $nin: ["confirmed", "livred", "cancelled"] },
        },
      },
      {
        $project: {
        barcode: "$serial_cmd",
        apn: "$ligne_commande.apn",
        description: "$ligne_commande.description",
        date_feedback: "$ligne_commande.date_feedback",
        quantityCmd: "$ligne_commande.quantite",
        command_by: "$user_id",
        statut: "$ligne_commande.status",
        rack: "$ligne_commande.rack",
        quantityLiv: { $size: { $ifNull: ["$ligne_commande.serial_ids", []] } },
        serial_ids: "$ligne_commande.serial_ids",
        created_at: "$createdAt",
        apn: "$ligne_commande.apn",
        dpn: "$ligne_commande.dpn",
        isScuib: "$ligne_commande.isScuib",
        },
      },
      { $sort: { description: -1, createdAt: 1 } },
      ])
      .toArray();

    res.json({ success: true, data: commandes });
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
            "ligne_commande.$.date_feedback": new Date(),
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
