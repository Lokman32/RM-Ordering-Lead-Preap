const express = require('express');
const router = express.Router();
const {
  admin,
  tube,
  ordersPended,
  deliveredOrder,
  loginPost,
  testApn,
  storeCommande,
  updateRack,
  searchRack,
  validateProducts,
  logout,
  updateDescription,
  deliverProduct,
  retarded,
  logistic,
  commandeLines,
  historySummary,
  historyDetails
} = require('../controllers/handlers');
// const { authMiddleware } = require('../middleware/authMiddleware');
// const { roleMiddleware } = require('../middleware/roleMiddleware');



router.post('/api/login', loginPost); //
router.get('/api/test-apn', testApn); //



router.get('/api/admin', admin); 
router.get('/api/tubes', tube); //

router.get('/api/logistic', logistic); //
router.get('/api/deliverOrder', ordersPended); //
router.get('/api/confirmDelivry', deliveredOrder); //
router.get('/api/retardOrders', retarded); //

router.post('/api/commandes', storeCommande); //
router.put('/api/rack', updateRack); 
router.post('/api/search-rack', searchRack); 
router.post('/api/deliver-products', deliverProduct); //
router.post('/api/validate-products', validateProducts); //
router.post('/api/logout', logout); 
router.put('/api/description/:apn/:commande_id', updateDescription); 
router.get('/api/commande/:serial_cmd/lines', commandeLines);

router.get('/api/history', historySummary);
router.get('/api/history/details', historyDetails);

module.exports = router;