const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');

app.use(cors());
app.use(cookieParser());


app.use(express.json());

app.get('/intro', (req, res) => {
    res.json({
        message: "Success"
    });
});

app.use('/api/login', require('./routes/login'));


module.exports = app;