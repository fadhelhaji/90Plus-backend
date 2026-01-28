const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.get("/market", async (req, res) => {
  try {
    const players = await User.find({ role: "Player" }).select(
      "username email club_id",
    );

    res.status(200).json(players);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not fetch players" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const playerInfo = await User.findById(id)
      .select("username role club_id")
      .populate("club_id", "club_name");
    if (!playerInfo) {
      res.status(404).json({ error: "Could not find player" });
    } else {
      res.status(200).json(playerInfo);
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/invites/:playerId", async (req, res) => {
  const { playerId } = req.params;
  try {
    const player = await User.findById(playerId).populate({
      path: "invitations",
      select: "club_name coach_id",
      populate: {
        path: "coach_id",
        select: "username",
      },
    });

    if (!player) return res.status(404).json({ error: "Player not found" });

    res.status(200).json(player.invitations);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not fetch invitations" });
  }
});

module.exports = router;
