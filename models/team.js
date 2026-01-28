const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const teamSchema = new Schema({
  club_id: { type: Schema.Types.ObjectId, ref: "Club", required: true },
  team_name: { type: String, required: true },
  formation: { type: String, required: true },
  players: [
    {
      player_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
      position: { type: String },
    },
  ],
  created_at: { type: Date, default: Date.now },
});

const Team = model("Team", teamSchema);

module.exports = Team;
