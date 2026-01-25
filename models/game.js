const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const gameSchema = new Schema({
  club_id: { type: Schema.Types.ObjectId, ref: "Club", required: true },
  team_a_id: { type: Schema.Types.ObjectId, ref: "Team", required: true },
  team_b_id: { type: Schema.Types.ObjectId, ref: "Team", required: true },
  match_date: { type: Date, required: true },
  location: { type: String, required: true },
  score_team_a: { type: Number, default: 0 },
  score_team_b: { type: Number, default: 0 },
  mvp_player_id: { type: Schema.Types.ObjectId, ref: "User" },
  player_stats: [
    {
      player_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
      rating: { type: Number, min: 0, max: 10 },
      pace: { type: Number, min: 0, max: 10 },
      shooting: { type: Number, min: 0, max: 10 },
      passing: { type: Number, min: 0, max: 10 },
      defending: { type: Number, min: 0, max: 10 },
      notes: { type: String },
    },
  ],
  photos: [
    {
      url: { type: String, required: true },
      uploaded_at: { type: Date, default: Date.now },
    },
  ],
  created_at: { type: Date, default: Date.now },
});

const Game = model("Game", gameSchema);

module.exports = Game;
