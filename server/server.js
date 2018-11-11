const express = require('express');
const bodyParser = require('body-parser');
let { mongoose } = require('../db/mongoose');
// MODELS -----------------------------------------------
let { News } = require('./models/news');
let { User } = require('./models/user');
let { Event } = require('./models/event');

const port = process.env.PORT || 3000;
var app = express();

// MIDDLEWARE -------------------------------------------
app.use(bodyParser.json());

// ROUTES -----------------------------------------------
app.post('/news', (req, res) => {
    let news = new News({
        title: req.body.title,
        body: req.body.body
    });
    news.save()
        .then((doc) => {
            res.send(doc);
        }, (e) => { 
            res.status(400).send(e);
        })
});

app.get('/', (req, res) => {
    res.send({
        message: 'Welcome to AliciAlonso REST API',
        version: 0,
        author: 'Enrique Velasco',
        license: 'LSC',
        repo: 'github'
    });
});

app.listen(port, () => {
    console.log(`server listening on port ${port}`);
});

module.exports = { app };