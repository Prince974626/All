import mongoose from 'mongoose';
import dns from 'dns';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB:', mongoose.connection.name);
  } catch (error) {
    if (
      error.message.includes('querySrv') ||
      error.code === 'ECONNREFUSED' ||
      error.syscall === 'querySrv'
    ) {
      console.warn(
        'DNS SRV resolution failed. Retrying with Google DNS servers (8.8.8.8)...'
      );
      try {
        dns.setServers(['8.8.8.8', '8.8.4.4']);
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(
          'Connected to MongoDB (via Google DNS fallback):',
          mongoose.connection.name
        );
        return;
      } catch (retryError) {
        console.error(`Retry Connection Error: ${retryError.message}`);
      }
    }
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
