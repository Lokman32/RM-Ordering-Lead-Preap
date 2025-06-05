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
  deleteApn,
  statusCommand,
  changeStatusCommand,
  getCommandDetails,
  supprimerLigneCommande,
  supprimerSerialId,
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
router.delete("/api/products/:apn",deleteApn)

router.get("/api/admin/commands", statusCommand);

router.put("/api/admin/commands/:id/lignes/:apn/status", changeStatusCommand);
router.get("/api/command-details", getCommandDetails);

router.delete("/api/commande/:serial_cmd/lignes/:apn", supprimerLigneCommande);
router.delete("/api/commande/:serial_cmd/lignes/:apn/serial_id/:serial_id", supprimerSerialId);
module.exports = router;
