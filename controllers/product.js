const Product = require('../models/product');
const User = require('../models/user');

const slugify = require('slugify');

exports.create = async (req, res) => {
  try {
    console.log(req.body);
    // itt csatolom a body-hoz a slugot
    req.body.slug = slugify(req.body.title);
    const newProduct = await new Product(req.body).save();

    res.json(newProduct);
  } catch (err) {
    console.log(err);
    // jó lenne valami igazi hibaüzenetet kiírni
    //res.status(400).send('Create product failed');
    res.status(400).json({
      err: err.message,
    });
  }
};

exports.listAll = async (req, res) => {
  let products = await Product.find({})
    .limit(parseInt(req.params.count))
    .populate('category')
    .populate('subs')
    .sort([['createdAt', 'desc']])
    .exec();
  res.json(products);
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Product.findOneAndRemove({
      slug: req.params.slug,
    }).exec();
    res.json(deleted);
  } catch (err) {
    console.log(err);
    return res.status(400).send('Product delete failed');
  }
};

exports.read = async (req, res) => {
  let product = await Product.findOne({ slug: req.params.slug })
    .populate('category')
    .populate('subs')
    .exec();
  res.json(product);
};

exports.update = async (req, res) => {
  try {
    // vigyázat, a termék frissítésnél a slug-ot NE frissítsd csak ha nagyon akarod !!!
    // ha marad az if-es rész akkor frissül
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    const updated = await Product.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true }
    ); // ezt azért írjuk ide, hogy a response már az új terméket tartalmazza
    res.json(updated);
  } catch (err) {
    console.log('Termékd módosítása hiba', err);
    // return res.status(400).send('Product update failed');
    res.status(400).json({
      err: err.message,
    });
  }
};

// oldalszámozás nélkül
// exports.list = async (req, res) => {
//   try {
//     const { sort, order, limit } = req.body;
//     // createdAt/updatedAt, desc/asc, 3
//     const products = await Product.find({})
//       .populate('category')
//       .populate('subs')
//       .sort([[sort, order]])
//       .limit(limit)
//       .exec();

//     res.json(products);
//   } catch (err) {
//     console.log(err);
//   }
// };

//oldalszámozással
exports.list = async (req, res) => {
  try {
    const { sort, order, page } = req.body;
    const currentPage = page || 1;
    const productsPerPage = 3;

    const products = await Product.find({})
      .skip((currentPage - 1) * productsPerPage)
      .populate('category')
      .populate('subs')
      .sort([[sort, order]])
      .limit(productsPerPage)
      .exec();

    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

exports.productsCount = async (req, res) => {
  let total = await Product.find({}).estimatedDocumentCount().exec();
  res.json(total);
};

exports.productRating = async (req, res) => {
  const product = await Product.findById(req.params.productId).exec();
  const user = await User.findOne({ email: req.user.email }).exec();
  const { star } = req.body;

  // who is updating?
  // check if currently logged in user have already raint to this product ?
  // vagy frissítünk vagy hozzáadunk
  let existingRatingObject = product.ratings.find(
    (element) => element.postedBy.toString() === user._id.toString()
  );

  // ha nincs találat akkor push az új rating-et
  if (existingRatingObject === undefined) {
    const ratingAdded = await Product.findByIdAndUpdate(
      product._id,
      {
        $push: { ratings: { star: star, postedBy: user._id } },
      },
      { new: true }
    ).exec();
    res.json(ratingAdded);
  } else {
    // ha van találat akkor adatok frissítése
    const ratingUpdated = await Product.updateOne(
      {
        ratings: { $elemMatch: existingRatingObject },
      },
      { $set: { 'ratings.$.star': star } },
      { new: true }
    ).exec();
    res.json(ratingUpdated);
  }
};

exports.listRelated = async (req, res) => {
  const product = await Product.findById(req.params.productId).exec();

  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
  })
    .limit(3)
    .populate('category')
    .populate('subs')
    .exec();

  res.json(related);
};

// SEARCH / FILTER

const handleQuery = async (req, res, query) => {
  const products = await Product.find({ $text: { $search: query } })
    .populate('category', '_id name')
    .populate('subs', '_id name')
    .exec();

  res.json(products);
};

const handlePrice = async (req, res, price) => {
  try {
    let products = await Product.find({
      price: {
        $gte: price[0],
        $lte: price[1],
      },
    })
      .populate('category', '_id name')
      .populate('subs', '_id name')
      .exec();
    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

const handleCategory = async (req, res, category) => {
  try {
    let products = await Product.find({ category })
      .populate('category', '_id name')
      .populate('subs', '_id name')
      .exec();
    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

const handleStar = (req, res, stars) => {
  Product.aggregate([
    {
      $project: {
        document: '$$ROOT',
        floorAverage: {
          $floor: { $avg: '$ratings.star' },
        },
      },
    },
    { $match: { floorAverage: stars } },
  ])
    .limit(12)
    .exec((err, aggregates) => {
      if (err) console.log('Aggregate error', err);
      Product.find({ _id: aggregates })
        .populate('category', '_id name')
        .populate('subs', '_id name')
        .exec((err, products) => {
          if (err) console.log('PRODUCT AGGREGATE ERROR', err);
          res.json(products);
        });
    });
};

const handleSub = async (req, res, sub) => {
  const products = await Product.find({ subs: sub })
    .populate('category', '_id name')
    .populate('subs', '_id name')
    .exec();

  res.json(products);
};

const handleShipping = async (req, res, shipping) => {
  const products = await Product.find({ shipping })
    .populate('category', '_id name')
    .populate('subs', '_id name')
    .exec();

  res.json(products);
};

const handleColor = async (req, res, color) => {
  const products = await Product.find({ color })
    .populate('category', '_id name')
    .populate('subs', '_id name')
    .exec();

  res.json(products);
};

const handleBrand = async (req, res, brand) => {
  const products = await Product.find({ brand })
    .populate('category', '_id name')
    .populate('subs', '_id name')
    .exec();

  res.json(products);
};

exports.searchFilters = async (req, res) => {
  const { query, price, category, stars, sub, shipping, color, brand } =
    req.body;

  if (query) {
    console.log('query', query);
    const products = await handleQuery(req, res, query);
  }

  // price [100,200] két érték közötti értékekre keresünk rá
  if (price !== undefined) {
    console.log('ár: --->', price);
    const products = await handlePrice(req, res, price);
  }

  if (category) {
    console.log('kategória: --->', category);
    const products = await handleCategory(req, res, category);
  }

  if (stars) {
    console.log('csillagok: --->', stars);
    const products = await handleStar(req, res, stars);
  }

  if (sub) {
    console.log('alkategória: --->', sub);
    const products = await handleSub(req, res, sub);
  }

  if (shipping) {
    console.log('szállítás: --->', shipping);
    const products = await handleShipping(req, res, shipping);
  }

  if (color) {
    console.log('szín: --->', color);
    const products = await handleColor(req, res, color);
  }

  if (brand) {
    console.log('gyártó: --->', brand);
    const products = await handleBrand(req, res, brand);
  }
};
