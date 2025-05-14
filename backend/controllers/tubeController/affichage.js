const db = require("../config/db");
const { asyncHandler } = require("../middleware/asyncHandler");


module.exports = {
  tube: asyncHandler(async (req, res) => {
    const tubes = await db.collection("tubes").find().toArray();
    res.json({ success: true, data: tubes });
  }),

  deliveredOrder: asyncHandler(async (req, res) => {
    const results = await db
      .collection("commandes")
      .aggregate([
        { $unwind: "$ligne_commande" },

        { $unwind: "$ligne_commande.serial_ids" },

        {
          $match: {
            "ligne_commande.serial_ids.status": "livred",
          },
        },

        {
          $lookup: {
            from: "tubes",
            localField: "ligne_commande.apn",
            foreignField: "dpn",
            as: "tube_info",
          },
        },
        { $unwind: "$tube_info" },

        {
          $project: {
            _id: 0,
            serial_cmd: "$serial_cmd",
            apn: "$tube_info.dpn",
            rack: "$tube_info.rack",
            serial: "$ligne_commande.serial_ids.serial",
            delivered_at: "$ligne_commande.serial_ids.delivered_at",
          },
        },

        { $sort: { delivered_at: -1 } },
      ])
      .toArray();

    res.json({ success: true, data: results });
  }),

  ordersPended: asyncHandler(async (req, res) => {
    const eightHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const results = await db
      .collection("commandes")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: eightHoursAgo },
            "ligne_commande.status": { $nin: ["confirmed", "livred"] },
          },
        },
        { $unwind: "$ligne_commande" },
        {
          $match: {
            "ligne_commande.status": { $nin: ["confirmed", "livred"] },
          },
        },
        {
          $lookup: {
            from: "tubes",
            localField: "ligne_commande.apn",
            foreignField: "dpn",
            as: "tube_info",
          },
        },
        { $unwind: "$tube_info" },
        {
          $project: {
            barcode: "$serial_cmd",
            apn: "$ligne_commande.apn",
            command_by: "$user_id",
            created_at: "$createdAt",
            apn: "$tube_info.dpn",
            quantityCmd: "$ligne_commande.quantite",
            quantityLiv: {
              $size: {
                $filter: {
                  input: "$ligne_commande.serial_ids",
                  as: "item",
                  cond: {
                    $or: [
                      { $eq: ["$$item.status", "livred"] },
                      { $eq: ["$$item.status", "Confirmed"] },
                    ],
                  },
                },
              },
            },
            statut: "$ligne_commande.status",
            rack: "$tube_info.rack",
            description: "$ligne_commande.description",
          },
        },
        { $sort: { description: -1, created_at: 1 } },
      ])
      .toArray();

    res.json({ success: true, data: results });
  }),

  retarded: asyncHandler(async (req, res) => {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const results = await db
      .collection("commandes")
      .aggregate([
        {
          $match: {
            createdAt: { $lte: fourHoursAgo },
            "ligne_commande.status": { $nin: ["confirmed", "livred"] },
          },
        },
        { $unwind: "$ligne_commande" },
        {
          $match: {
            "ligne_commande.status": { $nin: ["confirmed", "livred"] },
          },
        },
        {
          $lookup: {
            from: "tubes",
            localField: "ligne_commande.apn",
            foreignField: "dpn",
            as: "tube_info",
          },
        },
        { $unwind: "$tube_info" },
        {
          $project: {
            barcode: "$serial_cmd",
            apn: "$ligne_commande.apn",
            command_by: "$user_id",
            created_at: "$createdAt",
            apn: "$tube_info.dpn",
            quantityCmd: "$ligne_commande.quantite",
            quantityLiv: {
              $size: {
                $filter: {
                  input: "$ligne_commande.serial_ids",
                  as: "item",
                  cond: { $eq: ["$$item.status", "livred"] },
                },
              },
            },
            statut: "$ligne_commande.status",
            rack: "$tube_info.rack",
            description: "$ligne_commande.description",
          },
        },
        { $sort: { description: -1, created_at: 1 } },
      ])
      .toArray();

    res.json({ success: true, data: results });
  }),
};
