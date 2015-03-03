"use strict";

var User
  , MONGO_ERROR_DUPLICATE_KEY = 11000
  , httpStatus = require('http-status-codes');

function register(req, res) {
  var newUser = new User({
    email: req.body.username,
    password: req.body.password
  });

  newUser.save(function(err, savedUser, numAffected) {
    if(err) {
      if (MONGO_ERROR_DUPLICATE_KEY == err) {
        var conflictMsg = 'A user with that email address already exists.';
        return res.status(httpStatus.CONFLICT).send(conflictMsg);
      }

      return res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
    }

    // Automatically log in the newly saved user.
    req.login();
    res.send(savedUser);
  });
}

// We are using [Passport](http://passportjs.org/guide/username-password/) for
// authentication.
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({ email: username }, function(err, user) {
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      user.checkPassword(password, function(err, isValid) {
        if (err) {
          console.log('Error checking password.\n' + err);
          return done(err);
        }

        if (!isValid) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        done(null, user);
      });
    });
  }
));

module.exports = function(app) {
  User = require('../model/user.js')(app);
  app.use(passport.initialize());
  
  app.post('/user/register', register);
  app.post('/user/login', passport.authenticate('local'), function(req, res) {
    res.send(req.user.toObject());
  });
  app.get('/user/current', function(req,res) {
    if(req.user) {
      return res.send(req.user.toObject());
    }

    res.status(httpStatus.UNAUTHORIZED).send('UNAUTHORIZED');
  });
  app.get('logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });
};
