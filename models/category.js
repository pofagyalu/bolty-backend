const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      minlength: [2, 'Too short'],
      maxlength: [32, 'Too long'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },

    // wishlist: [{ type: ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

// fontos, hogy a Category nagy betűvel kezdődjön
module.exports = mongoose.model('Category', categorySchema);
