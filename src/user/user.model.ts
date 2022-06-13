const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    gitHubId: Number,
    rating: Number,
    inGame: String,
});

module.exports = mongoose.model('User', userSchema);