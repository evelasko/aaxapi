const express = require('express');

const port = process.env.PORT || 3000;
var app = express();

app.get('/', (req, res) => {
    res.send({
        message: 'Welcome to AliciAlonso REST API',
        version: 0,
        author: 'Enrique Velasco',
        license: 'LSC',
        repo: 'github'
    });
});

app.listen(port, () => {
    console.log(`server listening thru port ${port}`);
});