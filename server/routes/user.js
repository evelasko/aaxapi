// USER ROUTES
const { Router } = require('express');
const _ = require('lodash');

let { mongoose } = require('../../db/mongoose');
let { User } = require('../models/user');
let { authenticate } = require('../middleware/authenticate');

const router = new Router();

router.post('/new', (req, res) => {
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

router.get('/me', authenticate, (req, res) => {
    res.send(req.user);
});

router.post('/login', (req, res) => {
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

router.delete('/me/token', authenticate, (req, res) => {
    req.user.removeToken(req.token)
        .then(() => res.status(200).send(),
             () => res.status(400).send());
});

module.exports = router;