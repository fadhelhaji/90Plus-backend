const express = require("express");
const router = express.Router();
const Club = require("../models/club");
const Team = require("../models/team");
const User = require("../models/user");

router.post("/create", async (req, res) => {
  try {
    const coach_id = req.user._id;
    if (req.user.role !== "Coach") {
      return res.status(403).json({ error: "Only coaches can create clubs" });
    }

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
    await User.findByIdAndUpdate(coach_id, { club_id: createClub._id });
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
    const club = await Club.findById(req.params.id)
      .populate("coach_id", "username")
      .populate("players.player_id", "username");

    const teams = await Team.find({ club_id: req.params.id });
    const clubPlayers = club.players.filter((p) => p.status === "approved");

    res.status(200).json({
      club,
      teams,
      clubPlayers,
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
    const team = await Team.findOne({
      _id: teamId,
      club_id: clubId,
    }).populate("players.player_id", "username");

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const club = await Club.findById(clubId).populate(
      "players.player_id",
      "username",
    );

    const clubPlayers = club.players.filter((p) => p.status === "approved");

    res.status(200).json({
      team,
      clubPlayers,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not fetch team details" });
  }
});

// UPDATE team formation
router.put("/:clubId/teams/:teamId/formation", async (req, res) => {
  const { clubId, teamId } = req.params;
  const { formation } = req.body;

  try {
    const allowed = ["1-2-2-1"];
    if (!allowed.includes(formation)) {
      return res.status(400).json({ error: "Invalid formation" });
    }

    const team = await Team.findOneAndUpdate(
      { _id: teamId, club_id: clubId },
      { formation },
      { new: true },
    ).populate("players.player_id", "username");

    if (!team) return res.status(404).json({ error: "Team not found" });

    return res.status(200).json(team);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not update formation" });
  }
});

router.post("/:clubId/teams/:teamId/add-player", async (req, res) => {
  try {
    const { clubId, teamId } = req.params;
    const { playerId } = req.body;
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });

    if (club.coach_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const isClubPlayer = club.players.some(
      (p) => p.player_id.toString() === playerId && p.status === "approved",
    );

    if (!isClubPlayer) {
      return res.status(400).json({ error: "Player not in club" });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ error: "Team not found" });
    const alreadyInTeam = team.players.some(
      (p) => p.player_id.toString() === playerId,
    );

    if (alreadyInTeam) {
      return res.status(400).json({ error: "Player already in team" });
    }
    team.players.push({ player_id: playerId });
    await team.save();

    const updatedTeam = await Team.findById(team._id).populate(
      "players.player_id",
      "username",
    );

    res.status(200).json(updatedTeam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not add player to team" });
  }
});

router.post("/:clubId/teams/:teamId/remove-player", async (req, res) => {
  const { clubId, teamId } = req.params;
  const { playerId } = req.body;

  try {
    await Team.findOneAndUpdate(
      { _id: teamId, club_id: clubId },
      { $pull: { players: { player_id: playerId } } },
    );

    res.status(200).json({ message: "Player removed" });
  } catch (error) {
    res.status(500).json({ error: "Could not remove player" });
  }
});

router.post("/:clubId/invite/:playerId", async (req, res) => {
  const { clubId, playerId } = req.params;
  const user = req.user;

  try {
    if (user.role !== "Coach") {
      return res.status(403).json({ error: "Only coaches can invite players" });
    }

    const club = await Club.findById(clubId);
    const player = await User.findById(playerId);

    if (!club || !player) {
      return res.status(404).json({ error: "Club or Player not found" });
    }
    if (player.club_id) {
      return res.status(400).json({ error: "Player already has a club" });
    }
    const alreadyInvited = club.players.some(
      (p) => p.player_id.toString() === playerId,
    );
    if (alreadyInvited) {
      return res.status(400).json({ error: "Player already invited" });
    }
    await User.findByIdAndUpdate(playerId, { invitations: clubId });

    club.players.push({
      player_id: playerId,
      status: "invited",
    });
    await club.save();
    res.status(200).json({ message: "Invitation sent" });
  } catch (error) {
    res.status(500).json({ error: "Could not invite player" });
  }
});

router.post("/:clubId/accept", async (req, res) => {
  const user = req.user;
  const { clubId } = req.params;
  const club = await Club.findById(clubId);
  const playerEntry = club.players.find(
    (p) => p.player_id.toString() === user._id.toString(),
  );
  if (!playerEntry) {
    return res.status(404).json({ error: "Invitation not found" });
  }
  playerEntry.status = "approved";
  await club.save();
  await User.findByIdAndUpdate(user._id, { invitations: [] });

  res.status(200).json({ message: "Joined club successfully" });
});

router.post("/:clubId/reject", async (req, res) => {
  const user = req.user;
  const { clubId } = req.params;

  await Club.findByIdAndUpdate(clubId, {
    $pull: { players: { player_id: user._id } },
  });
  await User.findByIdAndUpdate(user._id, { invitations: [] });

  res.status(200).json({ message: "Invitation rejected" });
});

module.exports = router;
