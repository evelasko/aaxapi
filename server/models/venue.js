let mongoose = require('mongoose');

let Venue = mongoose.model('Venue', 
    {
        name: {
            type: String,
            requires: true,
            trim: true,
            minlength: 1
        },
        area: {
            type: String,
            required: false,
            trim: true,
            minlength: 1
        },
        address: {
            type: String,
            required: true,
            trim: true,
            minlength: 1
        },
        _creator: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        }
    }
);

module.exports = { Venue };