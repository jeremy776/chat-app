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
  extended: false
});

// Mongoose Model
const ManageUser = require("./models/User");
const ManageActivate = require("./models/ActivateManager");

require("dotenv").config();

mongoose.connect(process.env.MONGOOSEURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);

const title = "JustTry";
const webURL = "http://localhost:3000";

// Set session
const session = require("express-session")({
  secret: "verysecretyo",
  resave: false,
  saveUninitialized: false
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(flash());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({
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


// Handle socket
const listen = app.listen(3000);
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
    const listUser = await ManageUser.find({online: true});
    //console.log(listUser);
    io.emit("list-user-connect", listUser);
    let room = socket.handshake.query.me+"-"+socket.handshake.query.partner;
    if(!room) {
      console.log("Not found");
    } else if(room) {
      socket.join(room);
    }
  } else {
    console.log("User connected: Not verify user");
  }
  // chat
  socket.on("chat", m => {
    let me = socket.handshake.query.me+"-"+socket.handshake.query.partner;
    let friends = socket.handshake.query.partner+"-"+socket.handshake.query.me;
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

// get home page
app.get("/", function(req, res) {
  res.render("index.ejs",
    {
      title: title,
      req: req
    });
});

// get room page
app.get("/@me/:email", mustLogin, async function(req, res) {
  const PartnerUser = await ManageUser.findOne({email: req.params.email});
  if(!PartnerUser) return res.send({message: "User not found"});
  if(PartnerUser.email === req.user.email) return res.send({message: "Not found"});
  res.render("roomChat.ejs", {
    title: title,
    partner: PartnerUser,
    req: req
  });
});

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
    successRedirect: "/",
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
    email: req.body.email, chats: [], createdAt: Date.now(), online: false, last_online: 0, isActive: false, role: "User", displayName: req.body.username
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
  return res.redirect("/login");
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