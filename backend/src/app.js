const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoute=require('../src/routes/auth.route')

app.use(cors());
app.use(cookieParser());


app.use(express.json());

app.get('/intro', (req, res) => {
    res.json({
        message: "Success"
    });
});

app.use('/api/auth',authRoute);


module.exports = app;