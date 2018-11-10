const express = require('express');

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

app.listen(3000, () => {
    console.log(`server listening thru port 3000`);
});