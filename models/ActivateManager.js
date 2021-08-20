const mongoose = require("mongoose");

const activateSchema = new mongoose.Schema({
  email: String,
  id: String,
  timestamp: Number
});

module.exports = mongoose.model("EmailActivate", activateSchema);