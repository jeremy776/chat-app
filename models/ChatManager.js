const mongoose = require("mongoose");

const ChatManager = new mongoose.Schema({
  to: String,
  message: String,
  deleted: Boolean,
  author: String
}, { timestamps: true });

module.exports = mongoose.model("Chat", ChatManager);