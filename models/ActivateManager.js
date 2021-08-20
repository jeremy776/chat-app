const mongoose = require("mongoose");

const activateSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true
  },
  id: String,
  timestamp: Number,
});

module.exports = mongoose.model("EmailActivate", activateSchema);