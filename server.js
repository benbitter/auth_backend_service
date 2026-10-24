import connectDB from './config/db.js';
import dotenv from 'dotenv';
import {app} from './app.js';
import {Redis} from "@upstash/redis"

dotenv.config({
    path: './.env'
});

const redisurl = process.env.UPSTASH_REDIS_REST_URL;

console.log("Redis URL:", redisurl);

if(!redisurl){
    console.error("REDIS_URL is not defined in environment variables");
    process.exit(1);
}

export const redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// redisClient.
//     connect().
//     then(()=>{
//     console.log("Connected to Redis successfully")}).
//     catch((err)=>{
//     console.error("Could not connect to Redis:", err);
//     process.exit(1)})


const PORT = process.env.PORT || 5000;

await connectDB()

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
