  const Order = require('../models/OrderModel');

  // CREATE a new order
  exports.createOrder = async (req, res) => {
    try {
      const order = new Order(req.body);
      await order.save();
      res.status(201).json({ message: 'Order created successfully', order });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };

  // GET all orders
  exports.getOrders = async (req, res) => {
    try {
      const orders = await Order.find();
      res.status(200).json(orders);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // UPDATE an order
  exports.updateOrder = async (req, res) => {
    try {
      const order = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        req.body,
        { new: true, runValidators: true }
      );
      if (!order) return res.status(404).json({ message: 'Order not found' });
      res.status(200).json({ message: 'Order updated', order });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };




  

  // NOT YET USED

   // GET a single order by ID
  exports.getOrderById = async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ message: 'Order not found' });
      res.status(200).json(order);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // DELETE an order
  exports.deleteOrder = async (req, res) => {
    try {
      const order = await Order.findOneAndDelete({ orderId: req.params.id });
      if (!order) return res.status(404).json({ message: 'Order not found' });
      res.status(200).json({ message: 'Order deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
