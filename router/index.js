const express = require("express");
const app = express.Router();
const csrf = require("csurf");
const isNotLogin = require("../function/isNotLogin");
const nodemailer = require("nodemailer");
const sharedSession = require("express-socket.io-session");
const Protection = csrf({
  cookie: true
});
const passport = require("passport");
const bodyParser = require("body-parser");
const url = bodyParser.urlencoded({
  extended: false,
  parameterLimit: 50000,
});
const title = process.env.TITLE;
const webURL = process.env.WEBURL;

// Generate random id for email activate & reset password
const {
  uuid
} = require("uuidv4");
const uniqID = require("uniqid");

// Mongoose Model
const ManageUser = require("../models/User");
const ManageActivate = require("../models/ActivateManager");
const ManageChat = require("../models/ChatManager");

app.get("/", async function(req, res) {
  res.render("home.ejs", {
    title: title,
    req: req
  });
});

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

app.get("/attachment/avatar/:id", async function(req, res) {
  let user = await ManageUser.findOne({
    id: req.params.id
  });
  const dat = user.avatar;
  const img = Buffer.from(dat, "base64");
  
  let newImg;
  
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': img.length
  });
  res.end(img);
});

app.get('/login', isNotLogin, function(req, res) {
  res.render("login.ejs",
    {
      title: title,
      error: req.flash("error"),
      message: req.flash("message")
    });
});

app.get('/register', isNotLogin, Protection, function(req, res) {
  res.render('register.ejs', {
    title: title,
    error: req.flash('error'),
    csrfToken: req.csrfToken(),
    req: req
  });
});

app.get("/logout", function(req, res) {
  if (!req.user) return res.redirect("/");
  req.logout();
  return res.redirect("/");
});

// POST
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

app.post("/change-avatar", url, Protection, async function(req, res) {
  let data = await ManageUser.findOne({
    email: req.user.email
  });
  data.avatar = req.body.img;
  data.save();
  return res.send(200);
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

module.exports = app;