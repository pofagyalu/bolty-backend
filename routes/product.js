const express = require('express');

const router = express.Router();

// middlewares
const { authCheck, adminCheck } = require('../middlewares/auth');

// controller
const {
  create,
  listAll,
  remove,
  read,
  update,
  list,
  productsCount,
  productRating,
  listRelated,
  searchFilters
} = require('../controllers/product');

// routes
router.post('/product', authCheck, adminCheck, create);

// figyeld meg az útvonalat mert nem mindegy, hogy ebben a listában hol van lejjebb vagy fentebb
router.get('/products/total', productsCount);

router.get('/products/:count', listAll);

router.delete('/product/:slug', authCheck, adminCheck, remove);

router.get('/product/:slug', read);

router.put('/product/:slug', authCheck, adminCheck, update);

router.post('/products', list);

// rating
router.put('/product/star/:productId', authCheck, productRating);

// related
router.get('/product/related/:productId', listRelated);

//search
router.post('/search/filters', searchFilters);


module.exports = router;
