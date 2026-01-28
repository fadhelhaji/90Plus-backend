const express = require("express");
const router = express.Router();
const Club = require("../models/club");
const Team = require("../models/team");
const User = require("../models/user");
const Game = require("../models/game");
const upload = require("../middlewares/uploadMemory");
const cloudinary = require("../config/cloudinary");


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
    const team = await Team.findById(teamId).populate("players.player_id", "username");

    if (!team) {
      return res.status(404).json({ error: "Team not found by teamId" });
    }

    if (team.club_id.toString() !== clubId.toString()) {
      return res.status(404).json({ error: "Team does not belong to this club" });
    }

    const club = await Club.findById(clubId)
      .populate("players.player_id", "username");

    const clubPlayers = (club.players || []).filter((p) => p.status === "approved");

    res.status(200).json({
      team,
      clubPlayers,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not fetch team" });
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
    const { playerId, position } = req.body;

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

    team.players.push({
      player_id: playerId,
      position: position || null,
    });

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

router.post("/:clubId/games/create", async (req, res) => {
  try {
    const { clubId } = req.params;
    const { team_a_id, team_b_id, match_date, location } = req.body;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });

    if (req.user._id.toString() !== club.coach_id.toString()) {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (!team_a_id || !team_b_id || !match_date || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (team_a_id === team_b_id) {
      return res.status(400).json({ error: "Teams must be different" });
    }

    const [teamA, teamB] = await Promise.all([
      Team.findById(team_a_id),
      Team.findById(team_b_id),
    ]);

    if (!teamA || !teamB) {
      return res.status(404).json({ error: "Team not found" });
    }

    if (teamA.club_id.toString() !== clubId.toString()) {
      return res.status(400).json({ error: "Team A not in this club" });
    }

    if (teamB.club_id.toString() !== clubId.toString()) {
      return res.status(400).json({ error: "Team B not in this club" });
    }

    const game = await Game.create({
      club_id: clubId,
      team_a_id,
      team_b_id,
      match_date,
      location,
    });

    const populated = await Game.findById(game._id)
      .populate("team_a_id", "team_name formation")
      .populate("team_b_id", "team_name formation");

    return res.status(201).json(populated);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not create game" });
  }
});

router.get("/:clubId/games", async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });

    const games = await Game.find({ club_id: clubId })
      .sort({ match_date: -1 })
      .populate("team_a_id", "team_name")
      .populate("team_b_id", "team_name");

    res.status(200).json(games);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not fetch games" });
  }
});


router.get("/:clubId/games/:gameId", async (req, res) => {
  try {
    const { clubId, gameId } = req.params;

    const game = await Game.findOne({ _id: gameId, club_id: clubId })
      .populate({
        path: "team_a_id",
        select: "team_name players",
        populate: { path: "players.player_id", select: "username" },
      })
      .populate({
        path: "team_b_id",
        select: "team_name players",
        populate: { path: "players.player_id", select: "username" },
      })
      .populate("player_stats.player_id", "username");

    if (!game) return res.status(404).json({ error: "Match not found" });

    res.status(200).json(game);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not fetch match" });
  }
});

router.put("/:clubId/games/:gameId/score", async (req, res) => {
  try {
    const { clubId, gameId } = req.params;
    const { score_team_a, score_team_b } = req.body;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });

    if (req.user._id.toString() !== club.coach_id.toString()) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const game = await Game.findOneAndUpdate(
      { _id: gameId, club_id: clubId },
      { score_team_a, score_team_b },
      { new: true }
    );

    if (!game) return res.status(404).json({ error: "Match not found" });

    res.status(200).json(game);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not update score" });
  }
});

router.put("/:clubId/games/:gameId/rate/:playerId", async (req, res) => {
  try {
    const { clubId, gameId, playerId } = req.params;
    const { rating, notes } = req.body;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });

    if (req.user._id.toString() !== club.coach_id.toString()) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const game = await Game.findOne({ _id: gameId, club_id: clubId });
    if (!game) return res.status(404).json({ error: "Match not found" });

    const idx = game.player_stats.findIndex(
      (ps) => ps.player_id.toString() === playerId
    );

    if (idx >= 0) {
      game.player_stats[idx].rating = rating;
      if (notes !== undefined) game.player_stats[idx].notes = notes;
    } else {
      game.player_stats.push({ player_id: playerId, rating, notes });
    }

    await game.save();

    const populated = await Game.findById(game._id).populate(
      "player_stats.player_id",
      "username"
    );

    res.status(200).json(populated);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not rate player" });
  }
});

router.post(
  "/:clubId/games/:gameId/photos",
  upload.single("photo"),
  async (req, res) => {
    try {
      const { clubId, gameId } = req.params;

      const club = await Club.findById(clubId);
      if (!club) return res.status(404).json({ error: "Club not found" });

      if (req.user._id.toString() !== club.coach_id.toString()) {
        return res.status(403).json({ error: "Not allowed" });
      }

      const game = await Game.findOne({ _id: gameId, club_id: clubId });
      if (!game) return res.status(404).json({ error: "Match not found" });

      if (!req.file) {
        return res.status(400).json({ error: "No photo uploaded" });
      }

      const b64 = req.file.buffer.toString("base64");
      const dataUri = `data:${req.file.mimetype};base64,${b64}`;

      const uploaded = await cloudinary.uploader.upload(dataUri, {
        folder: `clubs/${clubId}/matches/${gameId}`,
      });

      game.photos.push({
  url: uploaded.secure_url,
  public_id: uploaded.public_id,
  tagged_player_ids: [],
});

      await game.save();

      const updated = await Game.findById(game._id)
        .populate("team_a_id", "team_name")
        .populate("team_b_id", "team_name");

      res.status(200).json(updated);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Could not upload photo" });
    }
  }
);

router.delete("/:clubId/games/:gameId/photos/:photoId", async (req, res) => {
  try {
    const { clubId, gameId, photoId } = req.params;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });

    if (req.user._id.toString() !== club.coach_id.toString()) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const game = await Game.findOne({ _id: gameId, club_id: clubId });
    if (!game) return res.status(404).json({ error: "Match not found" });

    const photo = game.photos.id(photoId);
    if (!photo) return res.status(404).json({ error: "Photo not found" });

    if (photo.public_id) {
      try {
        await cloudinary.uploader.destroy(photo.public_id);
      } catch (e) {
        console.log("Cloudinary destroy failed:", e?.message);
      }
    }

    photo.deleteOne();
    await game.save();

    const updated = await Game.findById(game._id)
      .populate("team_a_id", "team_name")
      .populate("team_b_id", "team_name")
      .populate("player_stats.player_id", "username");

    res.status(200).json(updated);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not delete photo" });
  }
});

router.put("/:clubId/games/:gameId/photos/:photoId/tags", async (req, res) => {
  try {
    const { clubId, gameId, photoId } = req.params;
    const { tagged_player_ids } = req.body;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });

    if (req.user._id.toString() !== club.coach_id.toString()) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const game = await Game.findOne({ _id: gameId, club_id: clubId });
    if (!game) return res.status(404).json({ error: "Match not found" });

    const photo = game.photos.id(photoId);
    if (!photo) return res.status(404).json({ error: "Photo not found" });

    photo.tagged_player_ids = Array.isArray(tagged_player_ids)
      ? tagged_player_ids
      : [];

    await game.save();

    const updated = await Game.findById(game._id)
      .populate("team_a_id", "team_name")
      .populate("team_b_id", "team_name")
      .populate("player_stats.player_id", "username");

    res.status(200).json(updated);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not update photo tags" });
  }
});







module.exports = router;
