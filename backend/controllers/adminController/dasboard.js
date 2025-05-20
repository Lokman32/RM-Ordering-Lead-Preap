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
