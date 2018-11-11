const expect = require('expect');
const request = require('supertest');

const { app } = require('./../server');
const { News } = require('./../models/news');

let newsCount = undefined;

beforeEach((done) => {
    News.find().count()
         .then((count) => {
             newsCount = count;
             done();
            }, (e) => { done(err) });
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
                        expect(newss[0].title).toBe(title);
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