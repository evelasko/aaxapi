let mongoose = require('mongoose');
let Event = mongoose.model('Event', {});

module.exports = { Event };