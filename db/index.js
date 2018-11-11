const { Client } = require('pg');
const localDB = require('./../secrets/pgdb_config');

const client = new Client({
    connectionString: process.env.DATABASE_URL || localDB,
    ssl: process.env.DATABASE_URL ? true : false
  });

client.connect();

client.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
  client.end();
});

// pool.query('SELECT * FROM aca_subjects', (err, res) => {
//     if (err) return console.log(err);
//     console.log(res);
// });







