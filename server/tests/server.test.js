const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { app } = require('./../server');
const { News } = require('./../models/news');
const { User } = require('./../models/user');

const { dummyNews, populateDB, users, populateUsers } = require('./seed');

let newsCount = dummyNews.length;
beforeEach(populateUsers);
beforeEach(populateDB);

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

describe('PATCH /news/:id', () => {
    it('should update title, published to true, and set createdAt', (done) => {
        
        let hexId = dummyNews[0]._id.toHexString();
        let title = 'Test Title';

        request(app)
            .patch(`/news/${hexId}`)
            .send({ published: true, title})
            .expect(200)
            .expect((res) => {
                expect(res.body.news.title).toBe(title);
                expect(res.body.news.published).toBe(true);
                expect(typeof res.body.news.publishedAt).toBe('string');
            })
            .end(done);
    });
    it('should clear publishedAt when published is set to false', (done) => {
                
        let hexId = dummyNews[1]._id.toHexString();

        request(app)
            .patch(`/news/${hexId}`)
            .send({ published: false })
            .expect(200)
            .expect((res) => {
                expect(res.body.news.published).toBe(false);
                expect(res.body.news.publishedAt).toBe(null);
            })
            .end(done);
    })
});

describe('GET /user/me', () => {
    it('should return a user if authenticated', (done) => {
        request(app)
            .get('/user/me')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body._id).toBe(users[0]._id.toHexString());
                expect(res.body.email).toBe(users[0].email);
            })
            .end(done);
    });
    it('should return a 401 if not authenticated', (done) => {
        request(app)
            .get('/user/me')
            .expect(401)
            .expect((res) => {
                expect(res.body).toEqual({});
            })
            .end(done);
    });
});

describe('POST /user', () => {
    it('should create user', (done) => {
        let email = 'ex@ex.com';
        let password = '123abcd';

        request(app)
            .post('/user')
            .send({email, password})
            .expect(200)
            .expect((res) => {
                expect(res.headers['x-auth']).toBeTruthy();
                expect(res.body._id).toBeTruthy();
                expect(res.body.email).toBe(email);
            })
            .end((err) => {
                if (err) return done(err);
                User.findOne({email})
                    .then((user) => {
                        expect(user).toBeTruthy();
                        expect(user.password).not.toBe(password);
                        done();
                    })
            });
    });
    it('should return validation errors if request invalid', (done) => {
        request(app)
            .post('/user')
            .send({email: 'ap', password: '123'})
            .expect(400)
            .end(done);
    });
    it('should not create user if email in use', (done) => {
        request(app)
            .post('/user')
            .send({email: users[0].email, password: '123abc!'})
            .expect(400)
            .end(done);
    });
});

describe('POST /user/login', () => {
    it('should login user and return auth token', (done) => {
        request(app)
            .post('/user/login')
            .send( { email: users[1].email, password: users[1].password } )
            .expect(200)
            .expect((res) => {
                expect(res.headers['x-auth']).toBeTruthy();
            })
            .end((err, res) => {
                if (err) return (done(err));
                User.findById(users[1]._id)
                    .then((user) => {
                        expect(user.tokens[0]).toHaveProperty('token', res.headers['x-auth']);
                    done();
                })
            .catch((e) => done(e));     
            });
    });

    it('should reject invalid login', (done) => {
        request(app)
            .post('/user/login')
            .send( { email: users[1].email, password: users[1].password + '1' } )
            .expect(400)
            .expect((res) => {
                expect(res.headers['x-auth']).toBeFalsy();
            })
            .end((err, res) => {
                if (err) return (done(err));
                User.findById(users[1]._id)
                    .then((user) => {
                        expect(user.tokens.length).toBe(0);
                    done();
                })
            .catch((e) => done(e));     
            });
    });
});

describe('DELETE /users/me/token', () => {
    it('should remove auth token on logout', (done) => {
        request(app)
            .delete('/user/me/token')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                User.findById(users[0]._id)
                    .then((user) => {
                        expect(user.tokens.length).toBe(0);
                        done();
                    })
                    .catch((e) => done(e));
            });
    });
});