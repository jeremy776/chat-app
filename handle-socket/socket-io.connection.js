module.exports = async(listen, sharedSession, session) => {
  const sockeT = require("socket.io");
  const io = sockeT(listen);
 
  // Mongoose Model
  const ManageUser = require("../models/User");
  const ManageActivate = require("../models/ActivateManager");
  const ManageChat = require("../models/ChatManager");

  io.use(sharedSession(session, {
    autoSave: true
  }));

  let userMap = [];
  io.on("connection", async function (socket) {
    if (socket.handshake.session.passport) {
      console.log("User connected: "+ socket.handshake.session.passport.user);
      let user = await ManageUser.findOne({
        email: socket.handshake.session.passport.user
      });
      user.online = true;
      await user.save();
      const listUser = await ManageUser.find({
        online: true
      });
      //console.log(listUser);
      io.emit("list-user-connect", listUser);

      let room = socket.handshake.query.me+"-"+socket.handshake.query.partner;
      if (!room) {
        console.log("Not found");
      } else if (room) {
        socket.join(room);
      }
    } else {
      console.log("User connected: Not verify user");
    }
    // change avatar
    socket.on("trigger-avatar-change", data => {
      socket.emit("new-avatar-change", data);
    });

    // chat
    socket.on("chat", async m => {
      let me = socket.handshake.query.me+"-"+socket.handshake.query.partner;
      let friends = socket.handshake.query.partner+"-"+socket.handshake.query.me;

      let date = new Date();
      let arrDay = new Array(7);
      arrDay[0] = "Minggu";
      arrDay[1] = "Senin";
      arrDay[2] = "Selasa";
      arrDay[3] = "Rabu";
      arrDay[4] = "Kamis";
      arrDay[5] = "Jumat";
      arrDay[6] = "Sabtu";

      let hariIni = arrDay[date.getDay()];

      let tanggal = hariIni + "-" + date.getDate() + "-" + date.getMonth() + "-" + date.getFullYear();
      // Senin-30-8-2021

      const test = new ManageChat({
        to: socket.handshake.query.partner,
        message: m.message,
        read: false,
        date: tanggal,
        type: "Private",
        deleted: false,
        author: socket.handshake.query.me
      });
      test.save();
      io.to(me).to(friends).emit("chat-message", m);
    });

    socket.on("disconnect", async () => {
      if (socket.handshake.session.passport) {
        console.log("User disconnected: "+ socket.handshake.session.passport.user);
        let user = await ManageUser.findOne({
          email: socket.handshake.session.passport.user
        });
        user.online = false;
        user.last_online = Date.now();
        await user.save();
        io.emit("user-disconnect", user);
      } else {
        console.log("User disconnected: Not verify user");
      }
    });
  });
};