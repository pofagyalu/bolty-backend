const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { readdirSync } = require('fs');

// app
const app = express();

// db
mongoose.set('strictQuery', false);
mongoose
  .connect(process.env.DB)
  .then(() => console.log('DB CONNECTED'))
  .catch((err) => console.log(`DB CONNECTION ERR ${err}`));

// middlewares

app.use(express.json({ limit: '2mb' }));
app.use(cors());

//routes middleware
readdirSync('./routes').map((r) => app.use('/api', require('./routes/' + r)));

//port
const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Server is listening on port ${port}`));
