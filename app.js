const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const passport = require("passport");
const localStrategy = require("passport-local");
const mongooseLocal = require("passport-local-mongoose");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const ManageUser = require("./models/User");
const csrf = require("csurf");
const Protection = csrf({ cookie: true });
const url = bodyParser.urlencoded({ extended: false });

require("dotenv").config();

mongoose.connect(process.env.MONGOOSEURL, { useNewUrlParser: true });

const app = express();
const title = "JustTry";

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(flash());
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
}, ManageUser.createStrategy()));
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

// Register GET & POST
app.get('/register', Protection, function(req, res) {
  res.render('register.ejs', {
    title: title,
    error: req.flash('error'),
    csrfToken: req.csrfToken(),
    req: req
  });
});

app.post("/register", url, Protection, function(req, res) {
  console.log(req.body);
  ManageUser.register(new ManageUser({email: req.body.email, isActive: false, role: "User", displayName: req.body.username}), req.body.password, function(err, user) {
    if(err) {
      throw Error(err);
    }
    return res.sendStatus(200);
  });
});
//END REGISTER

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