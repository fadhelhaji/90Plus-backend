const mongoose = require("mongoose");
const { Schema } = mongoose;

const clubSchema = new Schema({
  club_name: { type: String, required: true },
  coach_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  players: [
    {
      player_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
      status: {
        type: String,
        enum: ["requested", "invited", "approved"],
        default: "requested",
      },
      joined_at: { type: Date, default: Date.now },
    },
  ],
  created_at: { type: Date, default: Date.now },
});

const Club = model("Club", clubSchema);

module.exports = Club;
