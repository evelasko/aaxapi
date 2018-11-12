// ENVIRONMENT CONFIGURATION -------------------------------

let env = process.env.NODE_ENV || 'development';

if (env === 'development') {
    process.env.PORT = 3000;
    process.env.MONGODB_URI = 'mongodb://localhost:27017/aaxapi_dev';
    process.env.DATABASE_URL = 'postgresql://potter:810101@localhost:5432/aadb_dev';
} else if (env === 'test') {
    process.env.PORT = 3000;
    process.env.MONGODB_URI = 'mongodb://localhost:27017/aaxapi_tst'
    process.env.DATABASE_URL = 'postgresql://potter:810101@localhost:5432/aadb_test';
}
