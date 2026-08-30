const mongoose = require('mongoose');

const uri = "mongodb+srv://robin2006:2006@cluster0.oexgujo.mongodb.net/attendance?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB Atlas.");
    
    // Define the schema
    const schema = new mongoose.Schema({
      username: { type: String },
      password: { type: String }
    }, { collection: 'users' });
    
    const User = mongoose.models.UserTemp || mongoose.model('UserTemp', schema);
    const users = await User.find({});
    console.log("Users in database:");
    console.dir(users.map(u => ({ username: u.username, password: u.password })), { depth: null });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run();
