const { Router } = require('express')
const router = Router();
const passport = require('passport');
require('dotenv').config()


const  GitHubStrategy = require('passport-github').Strategy;



passport.use(new GitHubStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:4000/user/auth/github/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
         cb(null,profile)
    }
));

passport.serializeUser(function(user, cb) {
    cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

router.get('/auth/github', passport.authenticate('github'));

router.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/', failureMessage: true ,assignProperty: 'profile'}),
    function(req, res) {
        // Successful authentication, redirect home.

        console.log(req.profile);
        res.json(req.profile)
    });

module.exports = router;