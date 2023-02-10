const express = require('express');

const router = express.Router();

// middlewares
const { authCheck } = require('../middlewares/auth');

//controllers
const {
  userCart,
  getUserCart,
  emptyCart,
  saveAddress,
  applyCouponToCart,
  createOrder,
  orders,
  addToWishlist,
  wishlist,
  removeFromWishlist,
  createCashOrder,
} = require('../controllers/user');

router.post('/user/cart', authCheck, userCart);

router.get('/user/cart', authCheck, getUserCart);

router.delete('/user/cart', authCheck, emptyCart);

router.post('/user/address', authCheck, saveAddress);

router.post('/user/cart/coupon', authCheck, applyCouponToCart);

router.post('/user/order', authCheck, createOrder); //stripe
router.post('/user/cash-order', authCheck, createCashOrder); //cod

router.get('/user/orders', authCheck, orders);

router.get('/user/wishlist', authCheck, wishlist);

router.post('/user/wishlist', authCheck, addToWishlist);

router.put('/user/wishlist/:productId', authCheck, removeFromWishlist);

module.exports = router;
