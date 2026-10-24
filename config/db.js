import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            family: 4, // Forces IPv4 to bypass cellular IPv6 routing bugs
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("----- RAW MONGO CONNECTION ERROR -----");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if (error.reason) {
            console.error("Topology Description:", JSON.stringify(error.reason, null, 2));
        }
        console.error("--------------------------------------");
        process.exit(1);
    }
};

export default connectDB;