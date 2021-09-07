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
require("dotenv").config();

// Mongoose Model
const ManageUser = require("./models/User");
const ManageActivate = require("./models/ActivateManager");
const ManageChat = require("./models/ChatManager");

mongoose.connect(process.env.MONGOOSEURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);


const session = require("express-session")({
  secret: "verysecretyo",
  resave: false,
  saveUninitialized: false
});
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(flash());
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json({
  limit: '5mb'
}));
app.use(express.urlencoded({
  limit: "5mb",
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

const listen = app.listen(process.env.PORT);
require("./handle-socket/socket-io.connection.js")(listen, sharedSession, session);

const me = require("./router/me.js");
const index = require("./router/index.js");

app.use("/me", me);
app.use("/", index);

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err: {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;