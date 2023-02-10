const Coupon = require('../models/coupon');

// create, remove, list

exports.create = async (req, res) => {
  try {
    const { name, expiry, discount } = req.body.coupon;

    res.json(await new Coupon({ name, expiry, discount }).save());
  } catch (err) {
    console.log('COUPON CREATE ERROR----->', err);
    res.status(400).send('Create coupon failed');
  }
};

exports.remove = async (req, res) => {
  try {
    res.json(await Coupon.findByIdAndDelete(req.params.couponId).exec());
  } catch (err) {
    // console.log(err);
    res.status(400).send('Coupon delete failed');
  }
};

exports.list = async (req, res) => {
  res.json(await Coupon.find({}).sort({ createdAt: -1 }).exec());
};
