const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { app } = require('./../server');
const { News } = require('./../models/news');

let newsCount = undefined;
const dummyNews = [
    { _id: new ObjectID, title: 'News 1', body: 'Body of news 1' },
    { _id: new ObjectID, title: 'News 2', body: 'Body of news 2' }
]

beforeEach((done) => {
    News.remove({})
        .then(() => News.insertMany(dummyNews))
        .then(() => {
            News.find().count()
            .then((count) => {
                newsCount = count;
                done();
                }, (e) => { done(err) });
        });
});

describe('POST /news', () => {
    //----------------------------------------------
    it('should create a new News', (done) => {
        let title = 'Some test title';
        let body = 'Some test body';

        request(app)
            .post('/news')
            .send({ title, body })
            .expect(200)
            .expect((res) => {
                expect(res.body.title).toBe(title);
            })
            .end((err, res) =>{
                if (err) return done(err);
                News.find()
                    .then((newss) => {
                        expect(newss.length).toBe(newsCount + 1);
                        expect(newss[ newsCount ].title).toBe(title);
                        done();
                    })
                    .catch((e) => done(e));
            });
    });
    //----------------------------------------------
    it('should not create news with invalid body data', (done) => {
        request(app)
            .post('/news')
            .send({})
            .expect(400)
            .end((err, res) => {
                if (err) return done(err);
                News.find()
                    .then((newss) => {
                        expect(newss.length).toBe(newsCount);
                        done();
                    }).catch((e) => done(e));
            });
    });
});

describe('GET /news', () => {
    it('should get all news', (done) => {
        request(app)
            .get('/news')
            .expect(200)
            .expect((res) => {
                expect(res.body.news.length).toBe(newsCount);
            })
            .end(done);
    });
});

describe('GET /news/:id', () => {
    //----------------------------------------------
    it('should return news doc', (done) => {
        request(app)
            .get(`/news/${dummyNews[0]._id.toHexString()}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.news.title).toBe(dummyNews[0].title);
            })
            .end(done);
    });

    //----------------------------------------------
    it('should return 404 if id not found', (done) => {
        request(app)
            .get(`/news/${ new ObjectID().toHexString() }`)
            .expect(404)
            .end(done);
    });

    //----------------------------------------------
    it('should return 404 for non-object id', (done) => {
        request(app)
            .get('/news/1a2b3c')
            .expect(404)
            .end(done);
    });
});

describe('DELETE /news/:id', () => {
    it('should remove a todo', (done) => {
        var hexId = dummyNews[1]._id.toHexString();
        request(app)
            .delete(`/news/${ hexId }`)
            .expect(200)
            .expect((res) => {
                expect(res.body.news._id).toBe(hexId);
            })
            .end((err, res) => {
                if (err) return done(err);
                News.findById(hexId)
                    .then((news) => {
                        expect(news).toBeFalsy();
                        done();
                    })
                    .catch((e) => done(e));
            });
    });

    it('should return 404 if news not found', (done) => {
        request(app)
            .delete(`/news/${ new ObjectID().toHexString() }`)
            .expect(404)
            .end(done);
    });

    it('should return 404 if object id is invalid', (done) => {
        request(app)
            .delete('/news/1a2b3c')
            .expect(404)
            .end(done);
    });
});