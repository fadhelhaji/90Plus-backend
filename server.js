// ENV CONFIG
const dotenv = require("dotenv");
dotenv.config();

// DEPENDENCIES
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

// APP INIT
const app = express();

// DATABASE
mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on("connected", () => {
  console.log("Connected to DB");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

// MIDDLEWARE
const verifyToken = require("./middlewares/verifyToken");

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// CONTROLLERS / ROUTES
const authCtrl = require("./controllers/auth");
const clubCtrl = require("./controllers/club");
const playerCtrl = require("./controllers/player");

// Public routes
app.use("/auth", authCtrl);
app.use("/players", playerCtrl);

// Protected routes
app.use(verifyToken);
app.use("/club", clubCtrl);


// SERVER
app.listen(process.env.PORT, () => {
  console.log(`Express is ready on port ${process.env.PORT || 3000}`);
});
