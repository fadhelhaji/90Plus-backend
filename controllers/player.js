const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.get("/players", async (req, res) => {
  try {
    // Find all users with role 'Player'
    const players = await User.find({ role: "Player" }).select(
      "username email club_id",
    );

    res.status(200).json(players);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not fetch players" });
  }
});

module.exports = router;
