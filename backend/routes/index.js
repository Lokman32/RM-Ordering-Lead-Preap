const express = require("express");
const router = express.Router();
const {
  tube,
  ordersPended,
  deliveredOrder,
  retarded,
  storeCommande,
  deliverCommand,
  validateCommands,
  testApn,
} = require("../controllers/Tube.controller");
const {
  logistic,
  updateDescription,
} = require("../controllers/Logistic.controller");
const {
  historyDetails,
  historySummary,
  updateRack,
  searchRack,
} = require("../controllers/Admin.controller");
const { loginPost, logout } = require("../controllers/Auth.controller");

// Routes
router.post("/api/login", loginPost);
router.get("/api/test-apn", testApn);

router.get("/api/tubes", tube);

router.get("/api/logistic", logistic);
router.get("/api/deliverOrder", ordersPended);
router.get("/api/confirmDelivry", deliveredOrder);
router.get("/api/retardOrders", retarded);

router.post("/api/commandes", storeCommande);
router.put("/api/rack", updateRack);
router.post("/api/search-rack", searchRack);
router.post("/api/deliver-products", deliverCommand);
router.post("/api/validate-products", validateCommands);
router.post("/api/logout", logout);
router.put("/api/description/:apn/:commande_id", updateDescription);

router.get("/api/history", historySummary);
router.get("/api/history/details", historyDetails);

module.exports = router;
