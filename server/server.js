require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');

let { mongoose } = require('../db/mongoose');

// pgdb check:
require('../db/pgdb');

let { user, news, event, venue } = require('./routes');

var app = express();
app.use(bodyParser.json());
app.use('/news', news);
app.use('/user', user);

const port = process.env.PORT;
app.listen(port, () => {
    console.log(`server listening on port ${port}`);
});

module.exports = { app };