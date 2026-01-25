const express = require("express");
const router = express.Router();
const Club = require("../models/club");

router.post("/create", async (req, res) => {
  try {
    const coach_id = req.user._id;
    // user is coach
    if (req.user.role !== "coach") {
      return res.status(403).json({ error: "Only coaches can create clubs" });
    }

    // Check if coach has club
    const existingClub = await Club.findOne({ coach_id: req.user._id });

    if (existingClub) {
      return res.status(400).json({
        error: "You already own a club",
      });
    }

    const createClub = await Club.create({
      club_name: req.body.club_name,
      coach_id,
    });
    res.status(201).json(createClub);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create club" });
  }
});

router.get("/", async (req, res) => {
  try {
    const clubs = await Club.find();
    res.status(200).json(clubs);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch Club" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const clubInfo = await Club.findById(id).populate("coach_id", "username");
    res.status(200).json(clubInfo);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch Club" });
  }
});
module.exports = router;
