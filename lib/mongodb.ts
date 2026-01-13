import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI not defined. Please set up MongoDB Atlas following SETUP.md');
}

declare global {
  var mongoose: any;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority' as const,
    };

    if (!MONGODB_URI) {
      // Return a mock connection that throws clear errors
      cached.promise = Promise.resolve({
        connection: { readyState: 0 },
        model: (name: string, schema: any) => {
          return {
            findOne: () => Promise.reject(new Error('MongoDB not connected. Please set up MONGODB_URI in .env.local')),
            find: () => Promise.reject(new Error('MongoDB not connected. Please set up MONGODB_URI in .env.local')),
            save: () => Promise.reject(new Error('MongoDB not connected. Please set up MONGODB_URI in .env.local')),
            sort: () => Promise.reject(new Error('MongoDB not connected. Please set up MONGODB_URI in .env.local')),
          };
        },
        close: () => Promise.resolve()
      });
    } else {
      console.log('🔗 Attempting to connect to MongoDB...');
      console.log('📋 Connection URI:', MONGODB_URI?.substring(0, 50) + '...');
      
      cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
        console.log('✅ Successfully connected to MongoDB');
        console.log('📊 Database:', mongoose.connection.name);
        return mongoose;
      }).catch((error) => {
        console.error('❌ MongoDB connection failed:');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('🔧 Troubleshooting:');
        console.error('  1. Check MongoDB Atlas cluster is running');
        console.error('  2. Verify IP whitelist in MongoDB Atlas');
        console.error('  3. Check network connectivity');
        console.error('  4. Verify connection string format');
        console.error('  5. Try using local MongoDB for development');
        
        // Return mock connection that throws clear errors
        return {
          connection: { readyState: 0 },
          model: (name: string, schema: any) => {
            return {
              findOne: () => Promise.reject(new Error(`MongoDB connection failed: ${error.message}`)),
              find: () => Promise.reject(new Error(`MongoDB connection failed: ${error.message}`)),
              save: () => Promise.reject(new Error(`MongoDB connection failed: ${error.message}`)),
              sort: () => Promise.reject(new Error(`MongoDB connection failed: ${error.message}`)),
            };
          },
          close: () => Promise.resolve()
        };
      });
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
