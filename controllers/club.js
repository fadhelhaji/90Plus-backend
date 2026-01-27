const express = require("express");
const router = express.Router();
const Club = require("../models/club");
const Team = require("../models/team");
const User = require("../models/user");

router.post("/create", async (req, res) => {
  try {
    const coach_id = req.user._id;
    // user is coach
    if (req.user.role !== "Coach") {
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
  try {
    const club = await Club.findById(req.params.id).populate(
      "coach_id",
      "username",
    );

    const teams = await Team.find({ club_id: req.params.id });

    res.status(200).json({
      club,
      teams,
    });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch club" });
  }
});

router.post("/:id/teams/create", async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ error: "Club not found" });

    if (req.user._id.toString() !== club.coach_id.toString())
      return res.status(403).json({ error: "Not allowed" });

    const { team_name, formation, players } = req.body;

    const team = await Team.create({
      team_name,
      formation,
      players,
      club_id: club._id,
    });

    res.status(201).json(team);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create team" });
  }
});

router.get("/:clubId/teams/:teamId", async (req, res) => {
  const { clubId, teamId } = req.params;

  try {
    // 1. Get team
    const team = await Team.findOne({
      _id: teamId,
      club_id: clubId,
    }).populate("players.player_id", "username");

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // 2. Get all players
    const players = await User.find({ role: "Player" }).select("username");

    // 3. Send both
    res.status(200).json({
      team,
      players,
    });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch team" });
  }
});

// POST /club/:clubId/team/:teamId/players
router.post("/:clubId/team/:teamId", async (req, res) => {
  const { clubId, teamId } = req.params;
  const { playerId, position } = req.body;

  try {
    // 1. find team and ensure it belongs to the club
    const team = await Team.findOne({
      _id: teamId,
      club_id: clubId,
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found in this club" });
    }

    // 2. prevent duplicates
    const alreadyAdded = team.players.some(
      (p) => p.player_id.toString() === playerId,
    );

    if (alreadyAdded) {
      return res.status(400).json({ error: "Player already in team" });
    }

    // 3. add player to team
    team.players.push({
      player_id: playerId,
      position: position || null,
    });

    await team.save();

    // 4. optionally attach player to club
    await User.findByIdAndUpdate(playerId, {
      club_id: clubId,
    });

    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ error: "Could not add player to team" });
  }
});

module.exports = router;
