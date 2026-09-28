
const express = require('express');
const http = require('http');
const { connect } = require('mongoose');
const app = require('./src/app');
const connectDB =require('./src/db/db')

connectDB ();

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
