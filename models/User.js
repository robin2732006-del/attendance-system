const mongoose = require('mongoose');
const db = require('./db');

let userMongooseModel;
try {
  const schema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
  });
  userMongooseModel = mongoose.models.User || mongoose.model('User', schema);
} catch (e) {
  console.error("Mongoose schema compilation error for User:", e);
}

function isDbConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

// Initialise the JSON store file for users if it does not exist
const USERS_FILE = require('path').join(__dirname, '../data/users.json');
if (!require('fs').existsSync(USERS_FILE)) {
  require('fs').writeFileSync(USERS_FILE, JSON.stringify([
    { _id: "u_admin", username: "admin", password: "1234" }
  ], null, 2));
}

class UserModel {
  constructor(data) {
    this._id = data._id || 'u_' + Math.random().toString(36).substr(2, 9);
    this.username = data.username;
    this.password = data.password;
  }

  async save() {
    if (isDbConnected() && userMongooseModel) {
      try {
        const doc = new userMongooseModel({
          username: this.username,
          password: this.password
        });
        await doc.save();
        this._id = doc._id.toString();
        return this;
      } catch (err) {
        console.error("Mongoose User save error:", err);
        throw err;
      }
    }

    if (process.env.MONGODB_URI) {
      throw new Error("Database connection is offline. Unable to save user.");
    }

    const users = db.readJSON(USERS_FILE);
    const existingIdx = users.findIndex(u => u.username === this.username);
    const userData = {
      _id: this._id,
      username: this.username,
      password: this.password
    };
    if (existingIdx >= 0) {
      users[existingIdx] = userData;
    } else {
      users.push(userData);
    }
    db.writeJSON(USERS_FILE, users);
    return this;
  }

  static async findOne(query) {
    // 1. Seed default user on-demand if MongoDB is connected
    if (isDbConnected() && userMongooseModel) {
      try {
        const adminExists = await userMongooseModel.findOne({ username: 'admin' });
        if (!adminExists) {
          const admin = new userMongooseModel({
            username: 'admin',
            password: '1234'
          });
          await admin.save();
          console.log("👤 Default admin user seeded in MongoDB (on demand).");
        }
        return await userMongooseModel.findOne(query);
      } catch (err) {
        console.error("Mongoose User findOne error:", err);
        throw err;
      }
    }

    if (process.env.MONGODB_URI) {
      throw new Error("Database connection is offline. Unable to query user.");
    }

    // 2. Seed default user on-demand in local JSON file database
    const users = db.readJSON(USERS_FILE);
    const adminExists = users.some(u => u.username === 'admin');
    if (!adminExists) {
      users.push({ _id: "u_admin", username: "admin", password: "1234" });
      db.writeJSON(USERS_FILE, users);
    }

    if (query.username) {
      return users.find(u => u.username === query.username) || null;
    }
    return null;
  }
}

// Seed on server load as backup
async function seedDefaultUser() {
  try {
    if (isDbConnected() && userMongooseModel) {
      const existing = await userMongooseModel.findOne({ username: 'admin' });
      if (!existing) {
        const admin = new userMongooseModel({
          username: 'admin',
          password: '1234'
        });
        await admin.save();
        console.log("👤 Default admin user seeded in MongoDB (on startup check).");
      }
    }
  } catch (err) {
    console.error("Error seeding default admin:", err);
  }
}

setTimeout(seedDefaultUser, 3000);

module.exports = UserModel;
