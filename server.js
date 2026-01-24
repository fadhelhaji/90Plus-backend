
// ENV CONFIG
const dotenv = require('dotenv');
dotenv.config();



// DEPENDENCIES
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');


// APP INIT
const app = express();


// DATABASE
mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on('connected', () => {
  console.log('Connected to DB');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});


// MIDDLEWARE
const verifyToken = require('./middleware/verifyToken');

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());


// CONTROLLERS / ROUTES
const authCtrl = require('./controllers/auth');

// Public routes
app.use('/auth', authCtrl);

// Protected routes
app.use(verifyToken);



// SERVER
app.listen(process.env.PORT, () => {
  console.log(`Express is ready on port ${process.env.PORT || 3000}`);
});