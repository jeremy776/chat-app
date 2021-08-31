const mongoose = require("mongoose");

const ChatManager = new mongoose.Schema({
  to: String,
  message: String,
  date: String,
  deleted: Boolean,
  type: String,
  author: String
}, { timestamps: true });

module.exports = mongoose.model("Chat", ChatManager);