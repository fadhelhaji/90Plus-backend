const mongoose = require("mongoose");

// we need mongoose schema
const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["Coach", "Player"],
    default: "Player",
    required: true,
  },
  password: {
    type: String,
    required: true,
  },

  club_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
    default: null,
  },
});

userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    delete returnedObject.password;
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
