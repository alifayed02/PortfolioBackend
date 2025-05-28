import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

import chatRoutes from './routes/chat_routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Set FRONTEND_URL based on environment
const frontendUrl = isProduction 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000';

app.use(helmet());

app.use(cors({
    origin: frontendUrl,
    credentials: true,
}));

// Log requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.use('/api/v1/ai', chatRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ msg: err.message || 'Server Error' });
});

app.listen(PORT, (err) => {
    if (err) {
        console.error(`Failed to start server: ${err.message}`);
        process.exit(1);
    }
    console.log(`Running on Port ${PORT}`);
    console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`CORS origin set to: ${frontendUrl}`);
});