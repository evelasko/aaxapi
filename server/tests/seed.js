const { ObjectID } = require('mongodb');
const { News } = require('./../models/news');
const { User } = require('./../models/user');
const jwt = require('jsonwebtoken');

const userOneId = new ObjectID;
const userTwoId = new ObjectID;
const users = [
    { _id: userOneId, email: 'some@ex.com', password: 'user1pass', tokens:[
        { access: 'auth', token: jwt.sign({_id: userOneId, access: 'auth'}, 'abc123').toString() }
    ] },
    { _id: userTwoId, email: 'same@ef.com', password: 'user2pass' }
];

const dummyNews = [
    { _id: new ObjectID, title: 'News 1', body: 'Body of news 1', published: false },
    { _id: new ObjectID, title: 'News 2', body: 'Body of news 2', published: true, publishedAt: new Date().getTime() }
];

const populateDB = (done) => {
    News.remove({})
        .then(() => News.insertMany(dummyNews))
        .then(() => done());
};

const populateUsers = (done) => {
    User.remove({})
        .then(() => {
            let userOne = new User(users[0]).save();
            let userTwo = new User(users[1]).save();
            return Promise.all([userOne, userTwo])
        })
        .then(() => done());
};

module.exports = { dummyNews, populateDB, users, populateUsers };