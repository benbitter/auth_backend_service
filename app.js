import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

dotenv.config({
    path: './.env'
});

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(
    {
        origin: process.env.FRONTEND_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE' , 'OPTIONS'],
    }
));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send('Auth Server is running');
});



import userRoutes from './routes/user.js';
app.use('/auth', userRoutes);

export {app}