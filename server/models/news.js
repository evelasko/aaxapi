let mongoose = require('mongoose');
let moment = require('moment');

let News = mongoose.model('News', 
    {
        title: {
            type: String,
            requires: true,
            trim: true,
            minlength: 1
        },
        subtitle: {
            type: String,
            required: false,
            trim: true,
            minlength: 1
        },
        body: {
            type: String,
            required: true,
            trim: true,
            minlength: 1
        },
        published: {
            type: Boolean,
            required: true,
            default: false
        },
        publishedAt: {
            type: Date,
            required: false
        },
        _creator: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        expire: {
            type: Date,
            required: false,
            default: moment()
        }
    }
);

module.exports = { News };