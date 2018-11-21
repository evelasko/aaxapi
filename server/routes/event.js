// EVENT ROUTES
const { Router } = require('express');

let { mongoose } = require('../../db/mongoose');
let { Event } = require('../models/event');
let { authenticate } = require('../middleware/authenticate');

const router = new Router();


module.exports = router;