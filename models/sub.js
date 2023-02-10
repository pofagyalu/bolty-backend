const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema;

const subSchema = new mongoose.Schema(
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
    parent: { type: ObjectId, ref: 'Category', required: true },
  },
  { timestamps: true }
);

// fontos, hogy a Category nagy betűvel kezdődjön
module.exports = mongoose.model('Sub', subSchema);
