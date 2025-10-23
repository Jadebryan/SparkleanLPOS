const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');

router.post('/orders', orderController.createOrder);
router.get('/orders', orderController.getOrders);
router.put('/orders/:id', orderController.updateOrder);

// not used
router.get('/orders/:id', orderController.getOrderById);
router.delete('/orders/:id', orderController.deleteOrder);

module.exports = router;
