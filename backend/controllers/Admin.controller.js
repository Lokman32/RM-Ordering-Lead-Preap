const db = require("../config/db");
const { ObjectId } = require("mongodb");
const { asyncHandler } = require("../middleware/asyncHandler");
const { get } = require("mongoose");

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
      end.setDate(end.getDate() + 1);
      end.setHours(5, 59, 59, 999);
      break;
  }
  return { start, end };
};

module.exports = {
  searchRack: asyncHandler(async (req, res) => {
    const { apn } = req.body;
    if (typeof apn === "string") req.body.apn = apn.replace(/\s+/g, "");

    if (!apn) {
      const tubes = await db.collection("tubes").find().toArray();
      return res.json({
        success: true,
        data: tubes,
      });
    }

    const tubes = await db
      .collection("tubes")
      .find({ dpn: { $regex: apn, $options: "i" } })
      .toArray();

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

  updateRack: asyncHandler(async (req, res) => {
    const { dpn, _id, ...updateFields } = req.body;
    delete updateFields._id;

    if (!dpn) {
      return res.status(400).json({
        success: false,
        message: "DPN is required",
      });
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    const result = await db
      .collection("tubes")
      .updateOne({ _id: new ObjectId(_id) }, { $set: updateFields });

    console.log(dpn, updateFields);
    if (result.modifiedCount > 0) {
      return res.json({
        success: true,
        message: `Fields updated successfully for DPN: ${dpn}`,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: `No tube found with DPN: ${dpn} or no changes detected`,
      });
    }
  }),

  addProduct: asyncHandler(async (req, res) => {
    const data = req.body;
    
    if (!data.unico) {
      data.unico = undefined
    }else{
      [data.unico, data.dpn] = [data.dpn, data.unico];
    }
    console.log(data);
    const existingTube = await db.collection("tubes").findOne({dpn: data.dpn});
    if (existingTube) {
      return res.status(200).json({
        success: false,
        message: `Tube with DPN ${data.dpn} or APN ${data.apn} already exists`,
      });
    }
    const newTube = {
      dpn: data.dpn,
      apn: data.unico,
      ordre: parseInt(data.order) || 0,
      packaging: parseInt(data.packaging) || "",
      unity: data.unity || "",
      isScuib: data.isScuib || false,
      type: data.type || "",
      rack: data.rack || "",
    };
    const result = await db.collection("tubes").insertOne(newTube);
    res.json({
      success: true,
      message: "Tube added successfully",
      data: {
        _id: result.insertedId,
        ...newTube,
      },
    });
  }),

  historyDetails: asyncHandler(async (req, res) => {
    const { date, shift } = req.query;
    if (!date || !shift)
      return res.status(400).json({ message: "date & shift required" });

    const { start, end } = getShiftBounds(date, shift);

    const details = await db
      .collection("commandes")
      .aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $unwind: "$ligne_commande" },
        {
          $project: {
            serial_cmd: 1,
            apn: "$ligne_commande.apn",
            dpn: "$ligne_commande.dpn",
            isScuib: "$ligne_commande.isScuib",
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

      const commandesCount = await db.collection("commandes").countDocuments({
        createdAt: { $gte: start, $lte: end },
      });

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

  deleteApn: asyncHandler(async (req, res) => {
    const { apn } = req.params;
    await db.collection("tubes").deleteOne({ dpn: apn });
    res.json({
      success: true,
      message: `${apn} deleted`,
    });
  }),

  statusCommand: asyncHandler(async (req, res) => {
    const { date } = req.query;

    let matchStage = {};
    if (date) {
      const base = new Date(date + "T00:00:00.000Z");
      const start = new Date(base.setHours(0, 0, 0, 0));
      const end = new Date(base.setHours(23, 59, 59, 999));
      matchStage = { createdAt: { $gte: start, $lte: end } };
    }

    const commandes = await db
      .collection("commandes")
      .aggregate([
        { $match: matchStage },
        { $unwind: "$ligne_commande" },
        {
          $project: {
            serial_cmd: 1,
            apn: "$ligne_commande.apn",
            dpn: "$ligne_commande.dpn",
            isScuib: "$ligne_commande.isScuib",
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

    res.json({ data: commandes });
  }),

  changeStatusCommand: asyncHandler(async (req, res) => {
    const { id, apn } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.json({ message: "Status is required" });
    }
    if (!apn) {
      return res.json({ message: "APN is required" });
    }

    const result = await db
      .collection("commandes")
      .updateOne(
        { _id: new ObjectId(id), "ligne_commande.apn": apn },
        { $set: { "ligne_commande.$.status": status } }
      );

    if (result.modifiedCount === 0) {
      return res.json({ message: "Commande or APN not found" });
    }

    res.json({ message: "Status updated successfully" });
  }),

  getCommandDetails: asyncHandler(async (req, res) => {
    const { serial_cmd, apn } = req.query;

    if (!serial_cmd || !apn) {
      return res.status(400).json({
        success: false,
        message: "Both serial_cmd and apn parameters are required",
      });
    }

    const commandDetails = await db
      .collection("commandes")
      .aggregate([
        {
          $match: {
            serial_cmd: serial_cmd,
          },
        },
        { $unwind: "$ligne_commande" },
        {
          $match: {
            $or: [{ "ligne_commande.apn": apn }, { "ligne_commande.dpn": apn }],
          },
        },
        {
          $project: {
            _id: 0,
            command_id: "$_id",
            serial_cmd: 1,
            apn: "$ligne_commande.apn",
            dpn: "$ligne_commande.dpn",
            isScuib: "$ligne_commande.isScuib",
            quantityCmd: "$ligne_commande.quantite",
            quantityLiv: { $size: "$ligne_commande.serial_ids" },
            remaining: {
              $subtract: [
                "$ligne_commande.quantite",
                { $size: "$ligne_commande.serial_ids" },
              ],
            },
            commanded_at: "$createdAt",
            updated_at: "$updatedAt",
            serial_ids: "$ligne_commande.serial_ids",
            last_delivered: {
              $max: "$ligne_commande.serial_ids.delivered_at",
            },
            status: "$ligne_commande.status",
            rack: "$ligne_commande.rack",
            description: "$ligne_commande.description",
          },
        },
        { $limit: 1 },
      ])
      .toArray();

    if (commandDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching command line found",
      });
    }

    res.json({
      success: true,
      data: commandDetails[0],
    });
  }),

  supprimerLigneCommande: asyncHandler(async (req, res) => {
    const { serial_cmd, apn } = req.params;
    if (!serial_cmd || !apn) {
      return res
        .status(400)
        .json({ message: "serial_cmd and apn are required" });
    }

    const result = await db
      .collection("commandes")
      .updateOne(
        { serial_cmd, "ligne_commande.apn": apn },
        { $pull: { ligne_commande: { apn } } }
      );

    if (result.modifiedCount === 0) {
      return res.json({ message: "No matching command found" });
    }

    res.json({ success: true, message: "Ligne commande deleted successfully" });
  }),

  supprimerSerialId: asyncHandler(async (req, res) => {
    const { serial_cmd, apn, serial_id } = req.params;
    if (!serial_cmd || !apn || !serial_id) {
      return res
        .status(400)
        .json({ message: "serial_cmd, apn and serial_id are required" });
    }

    const result = await db.collection("commandes").updateOne(
      {
        serial_cmd,
        "ligne_commande.apn": apn,
      },
      {
        $pull: {
          "ligne_commande.$.serial_ids": { serial: serial_id },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.json({
        message: "No matching command found or serial not removed",
      });
    }

    res.json({ success: true, message: "Serial ID deleted successfully" });
  }),
};
