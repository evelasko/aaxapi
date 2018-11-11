const express = require('express');
const bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');
let { mongoose } = require('../db/mongoose');
// MODELS -----------------------------------------------
let { News } = require('./models/news');
let { User } = require('./models/user');
let { Event } = require('./models/event');
// ENV --------------------------------------------------
const port = process.env.PORT || 3000;
var app = express();

// MIDDLEWARE -------------------------------------------
app.use(bodyParser.json());

// ROUTES -----------------------------------------------
app.get('/', (req, res) => {
    res.send({
        message: 'Welcome to AliciAlonso REST API',
        version: 0,
        author: 'Enrique Velasco',
        license: 'LSC',
        repo: 'github'
    });
});

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

app.get('/news', (req, res) => {
    News.find()
        .then((news) => {
            res.send( { news } )
        }, (e) => {
            res.status(400).send(e);
        });
});

app.get('/news/:id', (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }
    News.findById(id)
        .then((news) => {
            if (!news) {
                return res.status(404).send();
            }
            res.send( { news } );
        })
        .catch( (e) => res.status(400).send() )
});

app.delete('/news/:id', (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }
    News.findByIdAndRemove(id)
        .then((news) => {
            if (!news) {
                return res.status(404).send();
            }
            res.send( { news } );
        })
        .catch( (e) => res.status(400).send() )
});

// LISTEN ----------------------------------------
app.listen(port, () => {
    console.log(`server listening on port ${port}`);
});

module.exports = { app };