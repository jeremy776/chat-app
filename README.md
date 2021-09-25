# Chat App

## Run
```has
$ npm install
$ npm start
```

## Configuration
Go to `.env.example` then rename to `.env`.
```bash
# > .env

# change to your mongo url
MONGOOSEURL=mongourl

# your e-mail
email=example@gmail.com

# your e-mail password
password=manusiaemailpassword

# set port : http://localhost:port
PORT=3000

# set title name
TITLE=mychatApp

# url web
WEBURL=http://localhost:3000
```

## Features
- Register - Create user account
- Login - Login to user account
- email activation when register
- send message privately
  - /me/userID

## Fix error
**1. Invalid Login**
- Make sure check your password
- Internet connection
- Security Settings in Gmail that don't allow third party apps.
  + [Check setting](https://myaccount.google.com/security)

- [Full tutorial by petanikode](https://www.petanikode.com/nodejs-email/)


### Notes
**This project is not completely finished yet**
