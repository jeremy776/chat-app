const express = require("express");
const router = express.Router();
const mustLogin = require("../function/mustLogin");
const title = process.env.TITLE;

// Mongoose Model
const ManageUser = require("../models/User");
const ManageActivate = require("../models/ActivateManager");
const ManageChat = require("../models/ChatManager");

// GET /@me
router.get("/", mustLogin, async function(req, res) {
  let LastChatList = await ManageChat.find({
    to: req.user.email
  });
  let filterLastChat = LastChatList.map(x => x.author);
  let removeDuplicate = [...new Set(filterLastChat)];

  let listUser = [];
  for (let i = 0; i < removeDuplicate.length; i++) {
    let user = await ManageUser.findOne({
      email: removeDuplicate[i]});
    let body = {
      author: user.email,
      displayName: user.displayName,
      avatar: "https://media.discordapp.net/avatars/834102697477013534/d8af5938eb1ebf31017f25dac10d38df.png"
    };
    listUser.push(body);
  }
  res.render("me.ejs", {
    req: req,
    title: title,
    list: listUser
  });
});

router.get("/:email", mustLogin, async function(req, res) {
  const PartnerUser = await ManageUser.findOne({
    email: req.params.email
  });
  if (!PartnerUser) return res.send({
    message: "User not found"
  });
  if (PartnerUser.email === req.user.email) return res.send({
    message: "Not found"
  });

  let MyChat = await ManageChat.find({
    to: req.params.email, author: req.user.email
  });
  let PartnerChat = await ManageChat.find({
    to: req.user.email, author: req.params.email
  });
  let merge = MyChat.concat(PartnerChat);
  let filterMerge = merge.sort(function(a, b) {
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  res.render("roomChat.ejs", {
    title: title,
    partner: PartnerUser,
    req: req,
    allChat: filterMerge
  });
});

module.exports = router;