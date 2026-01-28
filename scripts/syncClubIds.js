require("dotenv").config();
const mongoose = require("mongoose");
const Club = require("../models/club");
const User = require("../models/user");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const clubs = await Club.find({}, { _id: 1, players: 1 });

  let updated = 0;

  for (const club of clubs) {
    const approvedIds = (club.players || [])
      .filter((p) => p.status === "approved")
      .map((p) => p.player_id)
      .filter(Boolean);

    if (approvedIds.length === 0) continue;

    const res = await User.updateMany(
      { _id: { $in: approvedIds } },
      { $set: { club_id: club._id } },
    );

    updated += res.modifiedCount || 0;
  }

  console.log("Done. Updated users:", updated);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
