// NEWS ROUTES
const { Router } = require('express');
const _ = require('lodash');
const { ObjectID } = require('mongodb');

let { mongoose } = require('../../db/mongoose');
let { News } = require('../models/news');
let { authenticate } = require('../middleware/authenticate');

const router = new Router();

router.post('/new', authenticate, (req, res) => {
    let published = false;
    let publishedAt = null;

    if (_.isBoolean(req.body.published) && req.body.published) {
        publishedAt = new Date().getTime();
    }

    //------- REVIEW REVIEW REVIEW REVIEW THIS FULL FUNCTION !!!!!!!!!
    //------- BUILD THE LOGIC FOR EXPIRATION DATE OF NEWS !!!!!!!!!!!!

    let news = new News({
        title: req.body.title,
        body: req.body.body,
        published,
        publishedAt,
        expire: moment().add(10, 'days').valueOf(),
        _creator: req.user._id
    });
    news.save()
        .then((doc) => {
            res.send(doc);
        }, (e) => { 
            res.status(400).send(e);
        })
});

router.get('/all', authenticate, (req, res) => {
    News.find( { _creator: req.user._id } )
        .then((news) => {
            res.send( { news } )
        }, (e) => res.status(400).send(e));
});

router.get('/:id', authenticate, (req, res) => {
    let id = req.params.id;
    
    if (!ObjectID.isValid(id)) return res.status(404).send();

    News.findOne( { _id: id, _creator: req.user._id } )
        .then((news) => {
            if (!news) {
                return res.status(404).send();
            }
            res.send( { news } );
        })
        .catch( (e) => res.status(400).send(e) )
});

router.delete('/:id', authenticate, (req, res) => {
    let id = req.params.id;
    
    if (!ObjectID.isValid(id)) return res.status(404).send();

    News.findOneAndRemove({ _id: id, _creator: req.user._id })
        .then((news) => {
            if (!news) {
                return res.status(404).send();
            }
            res.send( { news } );
        })
        .catch( (e) => res.status(400).send(e) )
});

router.patch('/:id', authenticate, (req, res) => {
    let id = req.params.id;
    let body = _.pick(req.body, ['title', 'subtitle', 'body', 'published']);

    if (!ObjectID.isValid(id)) return res.status(404).send();

    if (_.isBoolean(body.published) && body.published) {
        body.publishedAt = new Date().getTime();
    } else {
        body.published = false;
        body.publishedAt = null;
    }

    News.findOneAndUpdate({ _id: id, _creator: req.user._id }, {$set: body}, {new: true})
        .then((news) => {
            if (!news) {
                return res.status(404).send();
            }
            res.send({ news });
        })
        .catch((e) => res.status(400).send(e));
});

module.exports = router;