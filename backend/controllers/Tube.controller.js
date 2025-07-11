const db = require("../config/db");
const { asyncHandler } = require("../middleware/asyncHandler");
const { generateSerial } = require("../utils/generators");
const { ObjectId } = require("mongodb");

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
            let: { lookupField: "$ligne_commande.dpn" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [{ $toUpper: "$dpn" }, { $toUpper: "$$lookupField" }],
                  },
                },
              },
            ],
            as: "tube_info",
          },
        },
        { $unwind: "$tube_info" },

        {
          $project: {
            _id: 0,
            serial_cmd: "$serial_cmd",
            apn: "$ligne_commande.apn",
            dpn: "$ligne_commande.dpn",
            isScuib: "$ligne_commande.isScuib",
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
    const results = await db
      .collection("commandes")
      .aggregate([
        { $unwind: "$ligne_commande" },
        {
          $match: {
            "ligne_commande.status": {
              $nin: ["confirmed", "livred", "cancelled"],
            },
          },
        },
        {
          $lookup: {
            from: "tubes",
            let: { lookupField: "$ligne_commande.dpn" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [{ $toUpper: "$dpn" }, { $toUpper: "$$lookupField" }],
                  },
                },
              },
            ],
            as: "tube_info",
          },
        },
        { $unwind: "$tube_info" },
        {
          $project: {
            barcode: "$serial_cmd",
            apn: "$ligne_commande.apn",
            dpn: "$ligne_commande.dpn",
            command_by: "$user_id",
            created_at: "$createdAt",
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
            isScuib: "$ligne_commande.isScuib",
          },
        },
        { $sort: { description: -1, created_at: 1 } },
      ])
      .toArray();

    res.json({ success: true, data: results });
  }),

  retarded: asyncHandler(async (req, res) => {
    const fourHoursAgo = new Date(
      new Date(
        new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })
      ) -
        2 * 60 * 60 * 1000
    );

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

  testApn: asyncHandler(async (req, res) => {
    const { value } = req.query; // uppercase
    if (!value) throw new Error("Value parameter is required");

    const exists = await db.collection("tubes").findOne({
      dpn: { $regex: new RegExp(`^${value}$`, "i") },
    });

    res.json({ success: true, exists });
  }),

  storeCommande: asyncHandler(async (req, res) => {
    const serial_cmd = generateSerial(); // e.g., CMD-20250509-0001
    const { command_by, payload } = req.body;

    try {
      const ligne_commande = [];

      for (let { dpn, qte, isScuib, apn } of payload) {
        console.log(dpn, qte, apn, isScuib);
        const tube = await db.collection("tubes").findOne({
          dpn: { $regex: new RegExp(`^${dpn}$`, "i") },
        });

        if (!tube) {
          throw new Error(`Tube with DPN ${dpn} not found`);
        }

        ligne_commande.push({
          apn,
          dpn,
          description: tube.description || "",
          quantite: qte,
          rack: tube.rack,
          status: "en_attente",
          serial_ids: [],
          isScuib,
        });
      }

      const now = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })
      );

      const commandeDoc = {
        serial_cmd,
        user_id: command_by,
        createdAt: now,
        updatedAt: now,
        status: "en_attente", // global status
        ligne_commande,
      };

      const result = await db.collection("commandes").insertOne(commandeDoc);

      res.status(201).json({
        success: true,
        message: "Commande enregistrée avec succès",
        id: result.insertedId,
        serial_cmd,
      });
    } catch (error) {
      console.error("Erreur:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Erreur lors de l'enregistrement",
      });
    }
  }),

  deliverCommand: asyncHandler(async (req, res) => {
    const { apn, serial_number } = req.body;

    try {
      // Find ONE command that has a ligne_commande with the matching APN and not delivered or confirmed
      const [commande] = await db
        .collection("commandes")
        .aggregate([
          // Unwind the ligne_commande array to process each line individually
          { $unwind: "$ligne_commande" },

          // Match documents that meet our criteria
          {
            $match: {
              $and: [
                {
                  $or: [
                    {
                      $expr: {
                        $eq: [
                          { $toString: "$ligne_commande.apn" },
                          String(apn),
                        ],
                      },
                    },
                    {
                      $expr: {
                        $eq: [
                          { $toString: "$ligne_commande.dpn" },
                          String(apn),
                        ],
                      },
                    },
                  ],
                },
                {
                  "ligne_commande.status": {
                    $nin: ["livred", "confirmed", "cancelled"],
                  },
                },
                {
                  $expr: {
                    $lt: [
                      { $size: "$ligne_commande.serial_ids" },
                      "$ligne_commande.quantite",
                    ],
                  },
                },
              ],
            },
          },

          // Group back by original commande _id
          {
            $group: {
              _id: "$_id",
              status: { $first: "$status" },
              ligne_commande: { $push: "$ligne_commande" },
            },
          },

          // Limit to 1 result
          { $limit: 1 },
        ])
        .toArray();

      if (!commande) {
        throw new Error(
          "Command not found or all lines are already delivered/confirmed"
        );
      }

      const line = commande.ligne_commande[0];
      line.serial_ids = line.serial_ids || [];
      const newQuantityLiv = line.serial_ids.length + 1;

      if (newQuantityLiv > line.quantite) {
        return res.status(400).json({
          success: false,
          message: `Cannot deliver more than ordered (${line.quantite})`,
        });
      }

      // Check if the serial number was already used elsewhere
      const dup = await db.collection("commandes").findOne({
        "ligne_commande.serial_ids.serial": serial_number,
      });
      if (dup) throw new Error("This serial was delivered elsewhere");

      // Check if the serial is already in the line
      if (line.serial_ids.some((s) => s.serial === serial_number)) {
        throw new Error("This serial already registered here");
      }

      const newLineStatus =
        newQuantityLiv === line.quantite ? "livred" : "partiellement_livred";

      // Update the line in the original document
      await db.collection("commandes").updateOne(
        {
          _id: new ObjectId(commande._id),
          ligne_commande: {
            $elemMatch: {
              $and: [
                {
                  $or: [
                    { apn: parseInt(apn) },
                    { apn: apn.toString() },
                    { dpn: apn.toString() },
                  ],
                },
                { status: { $nin: ["livred", "confirmed", "cancelled"] } },
              ],
            },
          },
        },
        {
          $push: {
            "ligne_commande.$.serial_ids": {
              serial: serial_number,
              status: "livred",
              delivered_at: new Date(),
              timezone: "Africa/Casablanca",
            },
          },
          $set: {
            "ligne_commande.$.quantityLiv": newQuantityLiv,
            "ligne_commande.$.status": newLineStatus,
            "ligne_commande.$.estLiv": newQuantityLiv === line.quantite,
            "ligne_commande.$.updated_at": new Date(),
            updatedAt: new Date(), // Also update the parent document's timestamp
          },
        }
      );

      const updated = await db
        .collection("commandes")
        .findOne({ _id: new ObjectId(commande._id) });

      const allLinesDelivered = updated.ligne_commande.every(
        (l) => l.status === "livred"
      );

      if (allLinesDelivered && updated.status !== "livred") {
        await db.collection("commandes").updateOne(
          { _id: new ObjectId(commande._id) },
          {
            $set: {
              status: "livred",
              updatedAt: new Date(
                new Date().toLocaleString("en-US", {
                  timeZone: "Africa/Casablanca",
                })
              ),
            },
          }
        );
      }

      res.json({
        success: true,
        message: "Command delivered successfully",
        data: {
          serial_number,
          current_quantity: newQuantityLiv,
          line_status: newLineStatus,
          commande_fully_delivered: allLinesDelivered,
        },
      });
    } catch (error) {
      console.error("Delivery error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Delivery failed",
      });
    }
  }),

  validateCommands: asyncHandler(async (req, res) => {
    const { apn, serial_number } = req.body;
    if (!apn || !serial_number) {
      return res.status(400).json({
        success: false,
        message: "Both apn and serial_number are required",
      });
    }

    const commande = await db.collection("commandes").findOne({
      $or: [
        { "ligne_commande.apn": { $in: [parseInt(apn), apn.toString()] } },
        { "ligne_commande.dpn": apn.toString() },
      ],
      "ligne_commande.serial_ids.serial": serial_number,
    });
    if (!commande) {
      return res.status(404).json({
        success: false,
        message: "No matching commande for this APN/serial",
      });
    }

    const lineIndex = commande.ligne_commande.findIndex(
      (line) =>
        (line.apn === parseInt(apn) ||
          line.apn === apn.toString() ||
          line.dpn === apn.toString()) &&
        line.serial_ids.some((s) => s.serial === serial_number)
    );
    const serialIndex = commande.ligne_commande[lineIndex].serial_ids.findIndex(
      (s) => s.serial === serial_number
    );

    await db.collection("commandes").updateOne(
      { _id: commande._id },
      {
        $set: {
          [`ligne_commande.${lineIndex}.serial_ids.${serialIndex}.status`]:
            "Confirmed",
          [`ligne_commande.${lineIndex}.serial_ids.${serialIndex}.confirmed_at`]:
            new Date(
              new Date().toLocaleString("en-US", {
                timeZone: "Africa/Casablanca",
              })
            ),
        },
      }
    );

    const updated = await db
      .collection("commandes")
      .findOne({ _id: commande._id });

    const line = updated.ligne_commande[lineIndex];
    const allSerialsConfirmed = line.serial_ids.every(
      (s) => s.status === "Confirmed"
    );
    const correctCount = line.serial_ids.length === line.quantite;

    if (allSerialsConfirmed && correctCount && line.status !== "confirmed") {
      await db.collection("commandes").updateOne(
        { _id: commande._id },
        {
          $set: {
            [`ligne_commande.${lineIndex}.status`]: "confirmed",
            [`ligne_commande.${lineIndex}.updated_at`]: new Date(
              new Date().toLocaleString("en-US", {
                timeZone: "Africa/Casablanca",
              })
            ),
          },
        }
      );
    }

    const finalState = await db
      .collection("commandes")
      .findOne({ _id: commande._id });
    const allLinesConfirmed = finalState.ligne_commande.every(
      (l) => l.status === "confirmed"
    );

    if (allLinesConfirmed && finalState.status !== "confirmed") {
      await db.collection("commandes").updateOne(
        { _id: commande._id },
        {
          $set: {
            status: "confirmed",
            updatedAt: new Date(
              new Date().toLocaleString("en-US", {
                timeZone: "Africa/Casablanca",
              })
            ),
          },
        }
      );
    }

    return res.json({
      success: true,
      message: `Serial ${serial_number} confirmed.`,
      data: {
        line_confirmed: allSerialsConfirmed,
        commande_confirmed: allLinesConfirmed,
      },
    });
  }),
};
