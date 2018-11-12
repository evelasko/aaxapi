require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');

let { mongoose } = require('../db/mongoose');
// pgdb check:
require('../db/pgdb');

// MODELS -----------------------------------------------
let { News } = require('./models/news');
let { User } = require('./models/user');
let { Event } = require('./models/event');
let { authenticate } = require('./middleware/authenticate');

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
        }, (e) => res.status(400).send(e));
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
        .catch( (e) => res.status(400).send(e) )
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
        .catch( (e) => res.status(400).send(e) )
});

app.patch('/news/:id', (req, res) => {
    let id = req.params.id;
    let body = _.pick(req.body, ['title', 'subtitle', 'body', 'published']);
    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }
    if (_.isBoolean(body.published) && body.published) {
        body.publishedAt = new Date().getTime();
    } else {
        body.published = false;
        body.publishedAt = null;
    }

    News.findByIdAndUpdate(id, {$set: body}, {new: true})
        .then((news) => {
            if (!news) {
                return res.status(404).send();
            }
            res.send({ news });
        })
        .catch((e) => res.status(400).send(e));
});

app.post('/user', (req, res) => {
    let body = _.pick(req.body, ['email', 'password']);
    let user = new User(body);

    user.save()
        .then(() => {
            return user.generateAuthToken();
        })
        .then((token) => {
            res.header('x-auth', token).send(user);
        })
        .catch((e) => res.status(400).send(e));
});

app.get('/user/me', authenticate, (req, res) => {
    res.send(req.user);
});

app.post('/user/login', (req, res) => {
    let body = _.pick(req.body, ['email', 'password']);
    User.findByCredentials(body.email, body.password)
        .then((user) => {
            user.generateAuthToken()
                .then((token) => {
                    res.header('x-auth', token).send(user);
                })
        })
        .catch((e) => res.status(400).send(e));
});


// LISTEN ----------------------------------------
const port = process.env.PORT;
app.listen(port, () => {
    console.log(`server listening on port ${port}`);
});

module.exports = { app };