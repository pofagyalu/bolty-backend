const User = require('../models/user');
const Product = require('../models/product');
const Cart = require('../models/cart');
const Coupon = require('../models/coupon');
const Order = require('../models/order');
const uniqueid = require('uniqueid');

exports.userCart = async (req, res) => {
  // console.log(req.body);  //{cart:[]}

  const { cart } = req.body;

  let products = [];

  const user = await User.findOne({ email: req.user.email }).exec();

  //check if cart already exists, if it has we remove and start
  let cartExistsByThisUser = await Cart.findOne({ orderedBy: user._id }).exec();

  if (cartExistsByThisUser) {
    cartExistsByThisUser.remove();
    console.log('remove old cart');
  }

  for (const product of cart) {
    let object = {};

    object.product = product._id;
    object.count = product.count;
    object.color = product.color;

    // get price for craeting total
    let productFromDb = await Product.findById(product._id)
      .select('price')
      .exec();
    object.price = productFromDb.price;
    products.push(object);
  }

  // console.log('products', products);

  const cartTotal = products.reduce(
    (acc, product) => acc + product.price * product.count,
    0
  );
  // console.log('cart total', cartTotal);

  let newCart = await new Cart({
    products,
    cartTotal,
    orderedBy: user._id,
  }).save();

  console.log('new cart-------->', newCart);
  res.json({ ok: true });
};

exports.getUserCart = async (req, res) => {
  const user = await User.findOne({ email: req.user.email }).exec();

  let cart = await Cart.findOne({ orderedBy: user._id })
    .populate('products.product', '_id title price totalAfterDiscount')
    .exec();

  const { products, cartTotal, totalAfterDiscount } = cart;
  res.json({ products, cartTotal, totalAfterDiscount });
};

exports.emptyCart = async (req, res) => {
  const user = await User.findOne({ email: req.user.email }).exec();

  const cart = await Cart.findOneAndRemove({ orderedBy: user._id }).exec();

  res.json(cart);
};

exports.saveAddress = async (req, res) => {
  const userAddress = await User.findOneAndUpdate(
    { email: req.user.email },
    { address: req.body.address }
  ).exec();

  res.json({ ok: true });
};

exports.applyCouponToCart = async (req, res) => {
  const { coupon } = req.body;
  console.log('KUPON---->', coupon);

  const validCoupon = await Coupon.findOne({ name: coupon }).exec();

  if (validCoupon === null) {
    return res.json({
      err: 'Érvénytelen kupon',
    });
  }

  console.log('VALID KUPON', coupon);

  const user = await User.findOne({ email: req.user.email }).exec();

  let { products, cartTotal } = await Cart.findOne({
    orderedBy: user._id,
  })
    .populate('products.product', '_id title price')
    .exec();

  console.log('cart total', cartTotal, 'discount', validCoupon.discount);

  // calc total after discount
  let totalAfterDiscount = (
    cartTotal -
    (cartTotal * validCoupon.discount) / 100
  ).toFixed(2);

  Cart.findOneAndUpdate(
    { orderedBy: user._id },
    { totalAfterDiscount },
    { new: true }
  );

  res.json(totalAfterDiscount);
};

exports.createOrder = async (req, res) => {
  const { paymentIntent } = req.body.stripeResponse;

  const user = await User.findOne({ email: req.user.email }).exec();

  const { products } = await Cart.findOne({ orderedBy: user._id }).exec();

  let newOrder = await new Order({
    products,
    paymentIntent,
    orderedBy: user._id,
  }).save();

  // decrement quantity, increment sold
  let bulkOption = products.map((item) => {
    return {
      updateOne: {
        filter: { _id: item.product._id }, // IMPORTANT item.product -ot kell használni
        update: { $inc: { quantity: -item.count, sold: +item.count } },
      },
    };
  });

  let updated = await Product.bulkWrite(bulkOption, { new: true });
  console.log('PROD QUANTITY -- AND SOLD++ ', updated);

  console.log('NEW ORDER SAVED', newOrder);
  res.json({ ok: true });
};

exports.orders = async (req, res) => {
  let user = await User.findOne({ email: req.user.email }).exec();

  let userOrders = await Order.find({ orderedBy: user._id })
    .populate('products.product')
    .exec();

  res.json(userOrders);
};

// addToWishlist,
// wishlist,
// removeFromWishlist

exports.addToWishlist = async (req, res) => {
  const { productId } = req.body;

  const user = await User.findOneAndUpdate(
    { email: req.user.email },
    { $addToSet: { wishlist: productId } }
  ).exec();
  res.json({ ok: true });
};

exports.wishlist = async (req, res) => {
  const list = await User.findOne({ email: req.user.email })
    .select('wishlist')
    .populate('wishlist')
    .exec();

  res.json(list);
};

exports.removeFromWishlist = async (req, res) => {
  const { productId } = req.params;

  const user = await User.findOneAndUpdate(
    { email: req.user.email },
    { $pull: { wishlist: productId } }
  ).exec();

  res.json({ ok: true });
};

exports.createCashOrder = async (req, res) => {
  const { cod, couponApplied } = req.body;

  // if cod is true create order with status of 'Cash on delivery'

  if (!cod) return res.status(400).send('Create cash order failed');

  const user = await User.findOne({ email: req.user.email }).exec();

  const userCart = await Cart.findOne({ orderedBy: user._id }).exec();

  let finalAmount = 0;
  if (couponApplied && userCart.totalAfterDiscount) {
    finalAmount = userCart.totalAfterDiscount * 100;
  } else {
    finalAmount = userCart.cartTotal * 100;
  }

  let newOrder = await new Order({
    products: userCart.products,
    paymentIntent: {
      id: uniqueid(),
      amount: finalAmount, // discount bele van számolva
      currency: 'usd',
      status: 'Cash on delivery',
      created: Date.now(),
      payment_method_types: ['cash'],
    },
    orderedBy: user._id,
    orderStatus: 'Cash on delivery', // ez biztos, hogy 2x?
  }).save();

  // decrement quantity, increment sold
  let bulkOption = userCart.products.map((item) => {
    return {
      updateOne: {
        filter: { _id: item.product._id }, // IMPORTANT item.product -ot kell használni
        update: { $inc: { quantity: -item.count, sold: +item.count } },
      },
    };
  });

  let updated = await Product.bulkWrite(bulkOption, { new: true });
  console.log('PROD QUANTITY -- AND SOLD++ ', updated);

  console.log('NEW ORDER SAVED', newOrder);
  res.json({ ok: true });
};
