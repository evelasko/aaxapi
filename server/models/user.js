let mongoose = require('mongoose');
let User = mongoose.model('User', {});

module.exports = { User };