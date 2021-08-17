const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require("body-parser");
const passport = require("passport");
const localStrategy = require("passport-local");
const mongooseLocal = require("passport-local-mongoose");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const ManageUser = require("./models/User");
require("dotenv").config();

mongoose.connect(process.env.MONGOOSEURL, { useNewUrlParser: true });

const app = express();
const title = "JustTry";

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(flash());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require("express-session")({
    secret:"verysecretyo",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy({
  usernameField: "email",
  passwordField: "password"
}, ManageUser.authenticate()));
passport.serializeUser(ManageUser.serializeUser());
passport.deserializeUser(ManageUser.deserializeUser());

app.use(express.static(path.join(__dirname, 'public')));

// "/" = Get home page
app.get("/", function(req, res) {
  console.log(process.env.MONGOOSEURL);
  res.render("index.ejs", {
    title: title
  });
});
// end home page


// Login - GET & POST
app.get('/login', function(req, res) {
  res.render("login.ejs", {
    title: title,
    error: req.flash("error")
  });
});

app.post("/login", passport.authenticate("local",{
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}), function(req, res){
    
});
// END LOGIN

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;