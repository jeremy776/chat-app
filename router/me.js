const express = require("express");
const router = express.Router();
const mustLogin = require("../function/mustLogin");
const title = process.env.TITLE;
const cookieParser = require('cookie-parser');
const csrf = require("csurf");
const Protection = csrf({
  cookie: true
});

// Mongoose Model
const ManageUser = require("../models/User");
const ManageActivate = require("../models/ActivateManager");
const ManageChat = require("../models/ChatManager");

// GET /@me
router.get("/", Protection, mustLogin, async function(req, res) {
  let LastChatList = await ManageChat.find({
    to: req.user.id
  });
  let filterLastChat = LastChatList.map(x => x.author);
  let removeDuplicate = [...new Set(filterLastChat)];

  let listUser = [];
  for (let i = 0; i < removeDuplicate.length; i++) {
    let user = await ManageUser.findOne({
      id: removeDuplicate[i]
    });
    let body = {
      author: user.id,
      id: user.id,
      displayName: user.displayName,
      avatar: user.avatar, //"https://media.discordapp.net/avatars/834102697477013534/d8af5938eb1ebf31017f25dac10d38df.png"
    };
    listUser.push(body);
  }
  res.render("me.ejs", {
    req: req,
    title: title,
    list: listUser
  });
});

router.get("/:id", mustLogin, async function(req, res) {
  const PartnerUser = await ManageUser.findOne({
    id: req.params.id
  });
  if (!PartnerUser) return res.send({
    message: "User not found"
  });
  if (PartnerUser.id === req.user.id) return res.send({
    message: "Not found"
  });

  let MyChat = await ManageChat.find({
    to: req.params.id, author: req.user.id
  });
  let PartnerChat = await ManageChat.find({
    to: req.user.id, author: req.params.id
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