const Razorpay = require('razorpay');
const crypto = require('crypto');

// Use test keys if environment variables are not set
const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag';
const key_secret = process.env.RAZORPAY_KEY_SECRET || '32M8ecwZGzJL9AaX';

const razorpay = new Razorpay({
  key_id,
  key_secret
});

async function createOrder(req, res, next) {
  try {
    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // razorpay expects amount in paisa
      currency: 'INR',
      receipt: 'order_' + Date.now()
    };

    const order = await razorpay.orders.create(options);
    // Return the created razorpay order and the key id so frontend can initialize checkout
    return res.json({ order, key_id });
  } catch (err) {
    return next(err);
  }
}

async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing parameters' });
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', key_secret)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // mark order as paid in DB if frontend passed orderId (our DB order id)
      const orderId = req.body.orderId;
      try {
        const Order = require('../models/Order');
        if (orderId) {
          await Order.updatePayment(orderId, razorpay_payment_id, 'Paid');
        }
      } catch (e) {
        // log and continue
        console.warn('Could not update order payment status', e.message || e);
      }
      return res.json({ verified: true });
    }

    return res.status(400).json({ verified: false });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createOrder,
  verifyPayment
};
