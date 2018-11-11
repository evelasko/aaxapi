let mongoose = require('mongoose');

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
        }    
    }
);

module.exports = { News };