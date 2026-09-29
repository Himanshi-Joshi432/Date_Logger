const express = require('express');
const app = express();
const cors = require('cors');
const authRoute=require('../src/routes/auth.route')
const postRoute=require('../src/routes/post.route')

app.use(cors());


app.use(express.json());

app.get('/intro', (req, res) => {
    res.json({
        message: "Success"
    });
});

app.use('/api/auth',authRoute);
app.use('/api/post',postRoute);


module.exports = app;