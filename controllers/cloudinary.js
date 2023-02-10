// Require the cloudinary library
const cloudinary = require('cloudinary').v2;

// Return "https" URLs by setting secure: true
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Log the configuration
// console.log(cloudinary.config());

exports.upload = async (req, res) => {
  const options = {
    public_id: `${Date.now()}`,
    resource_type: 'auto',
    // overwrite: true,
  };

  const result = await cloudinary.uploader.upload(req.body.image, options);
  res.json({
    public_id: result.public_id,
    url: result.secure_url,
  });
};

exports.remove = async (req, res) => {
  let image_id = req.body.public_id;
  cloudinary.uploader.destroy(image_id, (err, result) => {
    if (err) return res.json({ success: false, err });
    res.send('ok');
  });
};
