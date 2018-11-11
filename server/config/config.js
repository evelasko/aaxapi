// ENVIRONMENT CONFIGURATION -------------------------------
const local_pgdb = require('./../../secrets/pgdb_config');

let env = process.env.NODE_ENV || 'development';

if (env === 'development') {
    process.env.PORT = 3000;
    process.env.MONGODB_URI = 'mongodb://localhost:27017/aaxapi_dev';
    process.env.DATABASE_URL = local_pgdb.local_pgdb_dev;
} else if (env === 'test') {
    process.env.PORT = 3000;
    process.env.MONGODB_URI = 'mongodb://localhost:27017/aaxapi_tst'
    process.env.DATABASE_URL = local_pgdb.local_pgdb_test;
}
