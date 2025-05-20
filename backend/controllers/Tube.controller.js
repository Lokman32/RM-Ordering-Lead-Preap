const db = require("../config/db");
const { asyncHandler } = require("../middleware/asyncHandler");
const { generateSerial } = require("../utils/generators");


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

    const results = await db
      .collection("commandes")
      .aggregate([
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
        apn: "$tube_info.dpn",
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
        },
      },
      { $sort: { description: -1, created_at: 1 } },
      ])
      .toArray();

    res.json({ success: true, data: results });
  }),

  retarded: asyncHandler(async (req, res) => {
    const fourHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

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
    const { value } = req.query;
    if (!value) throw new Error("Value parameter is required");

    const exists = await db.collection("tubes").findOne({ dpn: value });

    res.json({ success: true, exists });
  }),

  storeCommande: asyncHandler(async (req, res) => {
    const serial_cmd = generateSerial(); // e.g., CMD-20250509-0001
    const { command_by, payload } = req.body;

    try {
      const ligne_commande = [];

      for (const { dpn, qte } of payload) {
        const tube = await db.collection("tubes").findOne({ dpn });

        if (!tube) {
          throw new Error(`Tube with DPN ${dpn} not found`);
        }

        ligne_commande.push({
          apn: dpn,
          description: tube.description || "", // optional if you have this in the tube doc
          quantite: qte,
          rack: tube.rack,
          status: "en_attente",
          serial_ids: [], // start empty
        });
      }

      const now = new Date();

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
      // Find the first command with a matching apn line that is not livred or confirmed
      const commande = await db.collection("commandes").findOne({
        "ligne_commande.apn": apn,
        "ligne_commande.status": { $nin: ["livred", "confirmed"] },
      });
      if (!commande) throw new Error("Command not found or all lines are already delivered/confirmed");

      const lineIndex = commande.ligne_commande.findIndex((l) => l.apn === apn && !["livred", "confirmed"].includes(l.status));
      if (lineIndex === -1) throw new Error("Tube not found in this command or line is already delivered/confirmed");

      const line = commande.ligne_commande[lineIndex];
      line.serial_ids = line.serial_ids || [];

      const newQuantityLiv = line.serial_ids.length + 1;
      if (newQuantityLiv > line.quantite) {
        return res.status(400).json({
          success: false,
          message: `Cannot deliver more than ordered (${line.quantite})`,
        });
      }

      // Check if the serial number is already used in any command
      const dup = await db.collection("commandes").findOne({
        "ligne_commande.serial_ids.serial": serial_number,
      });
      if (dup) throw new Error("This serial was delivered elsewhere");

      // Check if the serial number is already in the current line
      if (line.serial_ids.some((s) => s.serial === serial_number)) {
        throw new Error("This serial already registered here");
      }

      const isLineFully = newQuantityLiv === line.quantite;
      const newLineStatus = isLineFully ? "livred" : "partiellement_livred";

      await db.collection("commandes").updateOne(
        { _id: commande._id },
        {
          $push: {
            [`ligne_commande.${lineIndex}.serial_ids`]: {
              serial: serial_number,
              status: "livred",
              delivered_at: new Date(),
            },
          },
          $set: {
            [`ligne_commande.${lineIndex}.quantityLiv`]: newQuantityLiv,
            [`ligne_commande.${lineIndex}.status`]: newLineStatus,
            [`ligne_commande.${lineIndex}.estLiv`]: isLineFully,
            [`ligne_commande.${lineIndex}.updated_at`]: new Date(),
          },
        }
      );

      const updated = await db.collection("commandes").findOne({ _id: commande._id });

      const allLinesDelivered = updated.ligne_commande.every(
        (l) => l.status === "livred"
      );

      if (allLinesDelivered && updated.status !== "livred") {
        await db
          .collection("commandes")
          .updateOne(
            { _id: commande._id },
            { $set: { status: "livred", updatedAt: new Date() } }
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
      "ligne_commande.apn": apn,
      "ligne_commande.serial_ids.serial": serial_number,
    });
    if (!commande) {
      return res.status(404).json({
        success: false,
        message: "No matching commande/line found for that APN and serial",
      });
    }

    const lineIndex = commande.ligne_commande.findIndex(
      (line) =>
        line.apn === apn &&
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
            new Date(),
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
            [`ligne_commande.${lineIndex}.updated_at`]: new Date(),
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
      await db
        .collection("commandes")
        .updateOne(
          { _id: commande._id },
          { $set: { status: "confirmed", updatedAt: new Date() } }
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
