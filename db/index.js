const { Pool } = require('pg');
const {user, host, database, password, port} = require('../secrets/db_config');

const pool = new Pool({user, host, database, password, port});

pool.query('SELECT * FROM aca_subjects', (err, res) => {
    if (err) return console.log(err);
    console.log(res);
});