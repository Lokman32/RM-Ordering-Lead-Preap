const db = require("../config/db");
const { asyncHandler } = require("../middleware/asyncHandler");

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
};
