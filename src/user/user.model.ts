const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    gitHubId: Number,
    rating: Number,
});

module.exports = mongoose.model('User', userSchema);