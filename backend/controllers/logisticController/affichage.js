const db = require("../config/db");
const { asyncHandler } = require("../middleware/asyncHandler");


module.exports = {
  logistic: asyncHandler(async (req, res) => {
    const commandes = await db
      .collection("commandes")
      .aggregate([
        { $match: { status: { $nin: ["confirmed", "livred"] } } },

        { $unwind: "$ligne_commande" },

        {
          $project: {
            barcode: "$serial_cmd",
            apn: "$ligne_commande.apn",
            description: "$ligne_commande.description",
            quantityCmd: "$ligne_commande.quantite",
            command_by: "$user_id",
            statut: "$ligne_commande.status",
            rack: "$ligne_commande.rack",
            serial_ids: "$ligne_commande.serial_ids",
            created_at: "$createdAt",
            apn: "$ligne_commande.apn",
          },
        },

        { $sort: { description: -1, createdAt: 1 } },
      ])
      .toArray();

    res.json({ success: true, data: commandes });
  }),
};
