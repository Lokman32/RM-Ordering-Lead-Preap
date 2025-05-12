const db = require("../config/db");
const jwt = require("jsonwebtoken");
const { generateSerial } = require("../utils/generators");
const { asyncHandler } = require("../middleware/asyncHandler");
// const { ObjectId } = require("mongodb");

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "your_secure_secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "8h";

const getShiftBounds = (dateStr, shift) => {
  const base = new Date(dateStr + "T00:00:00.000Z");
  let start, end;
  switch (shift) {
    case "Morning":
      start = new Date(base);
      start.setHours(6, 0, 0, 0);
      end = new Date(base);
      end.setHours(13, 59, 59, 999);
      break;
    case "Afternoon":
      start = new Date(base);
      start.setHours(14, 0, 0, 0);
      end = new Date(base);
      end.setHours(21, 59, 59, 999);
      break;
    case "Night":
      start = new Date(base);
      start.setHours(22, 0, 0, 0);
      end = new Date(base);
      end.setDate(end.getDate() + 1); // Move to the next day
      end.setHours(5, 59, 59, 999);
      break;
  }
  return { start, end };
};

module.exports = {
  admin: asyncHandler(async (req, res) => {
    //
  }),

  tube: asyncHandler(async (req, res) => {
    const tubes = await db.collection("tubes").find().toArray();
    res.json({ success: true, data: tubes });
  }),

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

  deliveredOrder: asyncHandler(async (req, res) => {
    const results = await db
      .collection("commandes")
      .aggregate([
        // 1. Unwind all lines
        { $unwind: "$ligne_commande" },

        // 2. Unwind each serial_ids array
        { $unwind: "$ligne_commande.serial_ids" },

        // 3. Only keep serials with status "livred"
        {
          $match: {
            "ligne_commande.serial_ids.status": "livred",
          },
        },

        // 4. Lookup tube info to get rack / dpn if needed
        {
          $lookup: {
            from: "tubes",
            localField: "ligne_commande.apn", // or tube_id if you prefer
            foreignField: "dpn",
            as: "tube_info",
          },
        },
        { $unwind: "$tube_info" },

        // 5. Project one row per serial
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

        // 6. Sort however you like
        { $sort: { delivered_at: -1 } },
      ])
      .toArray();

    res.json({ success: true, data: results });
  }),

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

  deliverProduct: asyncHandler(async (req, res) => {
    const { serial_cmd, apn, serial_number } = req.body;

    try {
      // 1. Load the commande
      const commande = await db.collection("commandes").findOne({ serial_cmd });
      if (!commande) throw new Error("Command not found");

      // 2. Find the tube line
      const lineIndex = commande.ligne_commande.findIndex((l) => l.apn === apn);
      if (lineIndex === -1) throw new Error("Tube not found in this command");

      const line = commande.ligne_commande[lineIndex];
      line.serial_ids = line.serial_ids || [];

      // 3. Prevent over-delivery & duplicates (same as before) …
      const newQuantityLiv = line.serial_ids.length + 1;
      if (newQuantityLiv > line.quantite) {
        return res.status(400).json({
          success: false,
          message: `Cannot deliver more than ordered (${line.quantite})`,
        });
      }
      const dup = await db.collection("commandes").findOne({
        "ligne_commande.serial_ids.serial": serial_number,
      });
      if (dup) throw new Error("This serial was delivered elsewhere");
      if (line.serial_ids.some((s) => s.serial === serial_number)) {
        throw new Error("This serial already registered here");
      }

      // 4. Push the new serial and update line fields
      const isLineFully = newQuantityLiv === line.quantite;
      const newLineStatus = isLineFully ? "livred" : "partiellement_livred";

      await db.collection("commandes").updateOne(
        { serial_cmd },
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

      // 5. Reload commande to check all lines
      const updated = await db.collection("commandes").findOne({ serial_cmd });

      // 6. If ALL lines are fully delivered, set commande.status = "livred"
      const allLinesDelivered = updated.ligne_commande.every(
        (l) => l.status === "livred"
      );

      if (allLinesDelivered && updated.status !== "livred") {
        await db
          .collection("commandes")
          .updateOne(
            { serial_cmd },
            { $set: { status: "livred", updatedAt: new Date() } }
          );
      }

      res.json({
        success: true,
        message: "Product delivered successfully",
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

  validateProducts: asyncHandler(async (req, res) => {
    const { apn, serial_number } = req.body;
    if (!apn || !serial_number) {
      return res.status(400).json({
        success: false,
        message: "Both apn and serial_number are required",
      });
    }

    // 1. Find the commande containing that APN & serial
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

    // 2. Compute indices
    const lineIndex = commande.ligne_commande.findIndex(
      (line) =>
        line.apn === apn &&
        line.serial_ids.some((s) => s.serial === serial_number)
    );
    const serialIndex = commande.ligne_commande[lineIndex].serial_ids.findIndex(
      (s) => s.serial === serial_number
    );

    // 3. Mark that single serial “Confirmed”
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

    // 4. Reload the commande—only now we decide whether to flip line & commande statuses
    const updated = await db
      .collection("commandes")
      .findOne({ _id: commande._id });

    // 5. Enforce both conditions for confirmation
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

    // 6. Now check if _all_ lines in the commande are confirmed
    const finalState = await db
      .collection("commandes")
      .findOne({ _id: commande._id });
    const allLinesConfirmed = finalState.ligne_commande.every(
      (l) => l.status === "confirmed"
    );

    // If so, mark the commande “confirmed”
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

  logout: asyncHandler(async (req, res) => {
    res.clearCookie("token");
    res.json({ success: true, message: "Logged out successfully" });
  }),

  commandeLines: asyncHandler(async (req, res) => {
    const { serial_cmd } = req.params;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const results = await db
      .collection("commandes")
      .aggregate([
        // 1. Match the specific command and recent creations
        {
          $match: {
            serial_cmd,
            createdAt: { $gte: twentyFourHoursAgo },
          },
        },
        // 2. Unwind the ligne_commande array
        { $unwind: "$ligne_commande" },
        // 3. Optionally re-filter by status if you only want pending lines
        {
          $match: {
            "ligne_commande.status": { $nin: ["confirmed", "livred"] },
          },
        },
        // 4. Lookup tube info by APN (or by tube_id if you prefer)
        {
          $lookup: {
            from: "tubes",
            localField: "ligne_commande.apn",
            foreignField: "dpn",
            as: "tube_info",
          },
        },
        { $unwind: "$tube_info" },
        // 5. Project only the fields you need
        {
          $project: {
            _id: 0,
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
        // 6. Sort if desired
        { $sort: { description: -1, created_at: 1 } },
      ])
      .toArray();

    res.json({ success: true, data: results });
  }),

  historyDetails: asyncHandler(async (req, res) => {
    const { date, shift } = req.query;
    if (!date || !shift)
      return res.status(400).json({ message: "date & shift required" });

    const { start, end } = getShiftBounds(date, shift);

    // Fetch each ligne_commande created in that shift window
    const details = await db
      .collection("commandes")
      .aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $unwind: "$ligne_commande" },
        {
          $project: {
            serial_cmd: 1,
            apn: "$ligne_commande.apn",
            quantityCmd: "$ligne_commande.quantite",
            quantityLiv: { $size: "$ligne_commande.serial_ids" },
            commanded_at: "$createdAt",
            last_delivered: {
              $max: "$ligne_commande.serial_ids.delivered_at",
            },
            status: "$ligne_commande.status",
          },
        },
        { $sort: { commanded_at: 1 } },
      ])
      .toArray();

    res.json({ data: details });
  }),

  historySummary: asyncHandler(async (req, res) => {
    const { selected_date } = req.query;
    if (!selected_date)
      return res.status(400).json({ message: "selected_date is required" });

    const shifts = ["Morning", "Afternoon", "Night"];
    const out = { date: selected_date, commandes: {}, validated: {} };

    for (const shift of shifts) {
      const { start, end } = getShiftBounds(selected_date, shift);

      // Count orders created in this shift
      const commandesCount = await db.collection("commandes").countDocuments({
        createdAt: { $gte: start, $lte: end },
      });

      // Count how many of those orders have at least one serial Confirmed (optional)
      // Or count all Confirmed serials: adjust per your business logic
      const validatedCount = await db
        .collection("commandes")
        .aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $unwind: "$ligne_commande" },
          { $unwind: "$ligne_commande.serial_ids" },
          { $match: { "ligne_commande.serial_ids.status": "Confirmed" } },
          { $count: "c" },
        ])
        .toArray()
        .then((arr) => arr[0]?.c || 0);

      out.commandes[shift] = commandesCount;
      out.validated[shift] = validatedCount;
    }

    res.json([out]);
  }),
};
