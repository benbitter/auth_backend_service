import connectDB from './config/db.js';
import dotenv from 'dotenv';
import {app} from './app.js';
import { createClient } from 'redis';

dotenv.config({
    path: './.env'
});

const redisurl = process.env.REDIS_URL;

console.log("Redis URL:", redisurl);

if(!redisurl){
    console.error("REDIS_URL is not defined in environment variables");
    process.exit(1);
}

export const redisClient = createClient({
    url: redisurl, // Your rediss:// URL
    socket: {
        connectTimeout: 30000, // Extend timeout window to 10 seconds
        keepAlive: 5000,       // Keep the connection warm
        // If you are developing locally, sometimes TLS verification fails. 
        // You can uncomment the line below to bypass it for testing:
        // rejectUnauthorized: false 
    }
});

redisClient.
    connect().
    then(()=>{
    console.log("Connected to Redis successfully")}).
    catch((err)=>{
    console.error("Could not connect to Redis:", err);
    process.exit(1)})


const PORT = process.env.PORT || 5000;

await connectDB()

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
