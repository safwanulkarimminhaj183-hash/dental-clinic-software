import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Availability from '../models/Availability.js';

import net from 'net';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Check if MongoDB port is open
const isMongoPortOpen = (port = 27017, host = '127.0.0.1', timeout = 1000) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
};

// Auto-start mongod binary if local port 27017 is offline
const autoStartMongoIfDown = async () => {
  try {
    const isOpen = await isMongoPortOpen(27017, '127.0.0.1', 800);
    if (isOpen) {
      return true;
    }

    console.log('🔄 MongoDB is offline on 127.0.0.1:27017. Attempting to start local mongod...');
    const possiblePaths = [
      process.env.MONGOD_PATH,
      'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
      'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
      'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe',
    ].filter(Boolean);

    const mongodBin = possiblePaths.find((p) => fs.existsSync(p));
    if (!mongodBin) {
      console.warn('ℹ️ No local mongod executable found at standard paths. Continuing with connection attempt...');
      return false;
    }

    const dbPath = 'C:\\data\\db';
    if (!fs.existsSync(dbPath)) {
      try {
        fs.mkdirSync(dbPath, { recursive: true });
      } catch {}
    }

    const child = spawn(
      mongodBin,
      ['--dbpath', dbPath, '--bind_ip', '127.0.0.1', '--port', '27017'],
      { detached: true, stdio: 'ignore' }
    );
    child.unref();

    console.log(`🚀 Spawned mongod background process (pid ${child.pid}). Waiting for port 27017...`);
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 600));
      if (await isMongoPortOpen(27017, '127.0.0.1', 600)) {
        console.log('✅ Local MongoDB instance active and listening on 127.0.0.1:27017.');
        return true;
      }
    }
  } catch (err) {
    console.warn('Auto-start mongod warning:', err.message);
  }
  return false;
};

// Disable buffering so queries fail immediately when not connected instead of hanging
mongoose.set('bufferCommands', false);

// Mask credentials in MongoDB connection string
const maskMongoUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/i, '$1****$3');
};

// Mask credentials in error messages
const sanitizeErrorMessage = (msg) => {
  if (!msg) return '';
  return msg.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/gi, '$1****$3');
};

// Database connection state check helper
const isDbConnected = () => mongoose.connection.readyState === 1;

// Express middleware returning HTTP 503 if MongoDB is not connected
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database not connected',
    });
  }
  next();
};

let retryTimer = null;
let isConnecting = false;
let eventListenersAttached = false;

const scheduleRetry = (connUri) => {
  if (retryTimer || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;
  console.log('🔄 Will retry MongoDB connection in 5 seconds...');
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    await connectWithRetry(connUri);
  }, 5000);
};

const connectWithRetry = async (connUri) => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2 || isConnecting) {
    return;
  }
  isConnecting = true;

  try {
    // Skip auto-start MongoDB in serverless environments
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION;
    if (!isServerless && (connUri.includes('127.0.0.1') || connUri.includes('localhost'))) {
      await autoStartMongoIfDown();
    }

    const maskedUri = maskMongoUri(connUri);
    console.log(`Connecting to MongoDB (${maskedUri})...`);

    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: isServerless ? 10000 : 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: isServerless ? 10000 : 5000,
      maxPoolSize: isServerless ? 1 : 10,
      minPoolSize: isServerless ? 0 : 2,
      retryWrites: true,
      retryReads: true,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  } catch (error) {
    const maskedError = sanitizeErrorMessage(error.message);
    console.error(`❌ MongoDB connection error: ${maskedError}`);
    // Don't retry in serverless - it will cause timeout
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_VERSION) {
      scheduleRetry(connUri);
    }
  } finally {
    isConnecting = false;
  }
};

const connectDB = async () => {
  const connUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dentist_db';

  if (!eventListenersAttached) {
    eventListenersAttached = true;
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB Error: ${sanitizeErrorMessage(err.message)}`);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
      scheduleRetry(connUri);
    });
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connection active.');
    });
  }

  await connectWithRetry(connUri);
};

// Database queries helper object
const queries = {
  // Appointment Queries
  async createAppointment(data) {
    const appointment = new Appointment(data);
    return await appointment.save();
  },

  async getAllAppointments(filter = {}, sort = { createdAt: -1 }) {
    return await Appointment.find(filter).sort(sort);
  },

  async getAppointmentById(id) {
    return await Appointment.findById(id);
  },

  async updateAppointment(id, updateData) {
    return await Appointment.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  },

  async updateAppointmentStatus(id, status) {
    return await Appointment.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  },

  async deleteAppointment(id) {
    return await Appointment.findByIdAndDelete(id);
  },

  // User Queries
  async findUserByEmail(email) {
    return await User.findOne({ email });
  },

  async findUserById(id) {
    return await User.findById(id).select('-password');
  },

  async createUser(userData) {
    const user = new User(userData);
    return await user.save();
  },

  async getAllUsers(filter = {}) {
    return await User.find(filter).select('-password');
  },

  async updateUser(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password');
  },

  async deleteUser(id) {
    return await User.findByIdAndDelete(id);
  },

  // Availability Queries
  async createAvailability(data) {
    const availability = new Availability(data);
    return await availability.save();
  },

  async getAllAvailabilities(filter = {}) {
    return await Availability.find(filter);
  },

  async getAvailabilityById(id) {
    return await Availability.findById(id);
  },

  async updateAvailability(id, updateData) {
    return await Availability.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  },

  async deleteAvailability(id) {
    return await Availability.findByIdAndDelete(id);
  }
};

// Attach properties to connectDB for backward-compatibility with default import
connectDB.connectDB = connectDB;
connectDB.queries = queries;
connectDB.checkDbConnection = checkDbConnection;
connectDB.isDbConnected = isDbConnected;

export { connectDB, queries, checkDbConnection, isDbConnected };
export default connectDB;
