require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set; refusing to start.');
    process.exit(1);
}

const PORT = process.env.PORT || 8000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
