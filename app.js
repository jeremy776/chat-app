const createError = require('http-errors');
const express = require('express');
const app = express();
const http = require("http");
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const passport = require("passport");
const localStrategy = require("passport-local");
const mongooseLocal = require("passport-local-mongoose");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const csrf = require("csurf");
const nodemailer = require("nodemailer");
const sharedSession = require("express-socket.io-session");
const Protection = csrf({
  cookie: true
});
const url = bodyParser.urlencoded({
  extended: false,
  parameterLimit: 50000,
});

// Mongoose Model
const ManageUser = require("./models/User");
const ManageActivate = require("./models/ActivateManager");
const ManageChat = require("./models/ChatManager");

require("dotenv").config();

mongoose.connect(process.env.MONGOOSEURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);

const title = process.env.TITLE;
const webURL = process.env.WEBURL;

// Set session
const session = require("express-session")({
  secret: "verysecretyo",
  resave: false,
  saveUninitialized: false
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(flash());
app.use(cookieParser());
//app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(bodyParser.json({
  limit: '50mb'
}));
//app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
app.use(express.urlencoded({
  limit: "50mb",
  extended: true
}));

app.use(session);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy({
  usernameField: "email",
  passwordField: "password"
}, ManageUser.authenticate()));
passport.serializeUser(ManageUser.serializeUser());
passport.deserializeUser(ManageUser.deserializeUser());
app.use(express.static(path.join(__dirname, 'public')));

// Generate random id for email activate & reset password
const {
  uuid
} = require("uuidv4");
const uniqID = require("uniqid");

// Handle socket
const listen = app.listen(process.env.PORT);
const sockeT = require("socket.io");
const io = sockeT(listen);

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

// get router
const me = require("./router/me.js");

// use router
app.use("/@me", me);

// get home page
app.get("/", async function(req, res) {
  return res.redirect("/@me");
  /*    {
      title: title,
      req: req
    });*/
});

/* get home from chat
app.get("/@me", mustLogin, async function(req, res) {
  let LastChatList = await ManageChat.find({to: req.user.email});
  let filterLastChat = LastChatList.map(x => x.author);
  let removeDuplicate = [...new Set(filterLastChat)];
  let listUser = [];
  for(let i = 0; i < removeDuplicate.length; i++) {
    let user = await ManageUser.findOne({email: removeDuplicate[i]});
    let body = {
      author: user.email,
      displayName: user.displayName,
      avatar: "https://media.discordapp.net/avatars/834102697477013534/d8af5938eb1ebf31017f25dac10d38df.png"
    };
    listUser.push(body);
  }
  console.log(listUser);
  res.render("me.ejs", {
    req: req,
    title: title,
    list: listUser
  });
});*

// get room page
app.get("/@me/:email", mustLogin, async function(req, res) {
  const PartnerUser = await ManageUser.findOne({email: req.params.email});
  if(!PartnerUser) return res.send({message: "User not found"});
  if(PartnerUser.email === req.user.email) return res.send({message: "Not found"});
  let MyChat = await ManageChat.find({to: req.params.email, author: req.user.email});
  let PartnerChat = await ManageChat.find({to: req.user.email, author: req.params.email});
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
});*/

// Login - GET & POST
app.get('/login', isNotLogin, function(req, res) {
  res.render("login.ejs",
    {
      title: title,
      error: req.flash("error"),
      message: req.flash("message")
    });
});

app.post("/login", async function(req, res, next) {
  const user = await ManageUser.findOne({
    email: req.body.email
  });

  if (!user) {
    req.flash("error", "Email or Password are incorrect");
    return res.redirect("/login");
  }
  if (!user.isActive) {
    req.flash("error", "Please activate your acocunt, check email and click link to activate");
    return res.redirect("/login");
  }

  passport.authenticate("local", {
    successRedirect: "/@me",
    failureRedirect: "/login",
    failureFlash: true
  })(req, res, next);
});

// logout
app.get("/logout", function(req, res) {
  if (!req.user) return res.redirect("/");
  req.logout();
  return res.redirect("/");
});

// Register GET & POST
app.get('/register', isNotLogin, Protection, function(req, res) {
  res.render('register.ejs', {
    title: title,
    error: req.flash('error'),
    csrfToken: req.csrfToken(),
    req: req
  });
});

app.post("/register", url, Protection, async function(req, res) {
  console.log("New user created");
  ManageUser.register(new ManageUser({
    email: req.body.email, chats: [], id: uniqID(req.body.username +"-"), createdAt: Date.now(), info: "User ini tidak memberikan info", online: false, last_online: 0, isActive: false, role: "User", avatar: "https://images-ext-2.discordapp.net/external/6tVaUxectogf8lZc5X8fWTGd2tbzlG6I5AtVbWYYLNI/https/cdn.discordapp.com/embed/avatars/4.pnga", banner: null, displayName: req.body.username
  }), req.body.password, async function(err, user) {
    /*if (err) {
      throw new Error(err);
    }*/

    // Set id
    const setId = new ManageActivate({
      email: req.body.email,
      id: uuid(),
      timestamp: Date.now()
    });
    setId.save();

    // get Id
    const id = await ManageActivate.findOne({
      email: req.body.email
    });

    // Send activation email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });
    const options = {
      from: process.env.EMAIL,
      to: req.body.email,
      subject: "Activate your account",
      html: `<p>You have just created an account at <a href="${webURL}">${title}</a>. and your account must be activated</p><br><p>If you don't think you have created an account at <a href="${webURL}">${title}</a>. Just ignore this message, your email will be deleted from our database within 24 hours</p><br><p>Click the link below to activate your account within 24 hours</p><br><a href="${webURL}/activate/${id.id}">${webURL}/activate/${id.id}</a>`
    };
    transporter.sendMail(options, (err, info) => {
      if (err) {
        throw Error(err);
      }
      console.log("Success send email activation");
      return res.sendStatus(200);
    });
    req.flash("message",
      "Your account has just been created. We have sent an email to activate your account");
    return res.sendStatus(200);
  });
});

app.post("/change-avatar", url, Protection, async function(req, res) {
  let data = await ManageUser.findOne({
    email: req.user.email
  });
  data.avatar = req.body.img;
  data.save();
  return res.send(200);
});
// avatar
app.get("/attachment/avatar/:id", async function(req, res) {
  let user = await ManageUser.findOne({
    id: req.params.id
  });
  const dat = user.avatar;
  const data = dat.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
  const img = Buffer.from(data, "base64");

  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': img.length
  });
  res.end(img);
});
// activate
app.get("/activate/:id", async function(req, res) {
  // get data from id
  let getData = await ManageActivate.findOne({
    id: req.params.id
  });
  if (!getData) return res.sendStatus(404);

  // update status
  let getInfoUser = await ManageUser.findOne({
    email: getData.email
  });
  getInfoUser.isActive = true;
  getInfoUser.save();

  // delete database id
  getData.remove({}, function(err) {
    console.log("Database removed")
  });

  req.flash("message", "Your account is active, now you can login using the account you just created");
  return res.send("Anda berhasil verifikasi akun anda, silahkan login");
});

// user must login to acces the page
function mustLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.redirect("/login");
}

// only users who are not logged in can access the page
function isNotLogin(req, res, next) {
  if (!req.isAuthenticated()) return next();
  return res.redirect("/");
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err: {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;