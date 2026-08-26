const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// Load env variables
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...val] = trimmed.split("=");
      if (key) process.env[key.trim()] = val.join("=").trim().replace(/(^["']|["']$)/g, "");
    }
  });
}

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/attendance";

const Student = require("./models/Student");
const Attendance = require("./models/Attendance");

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");
  
  const students = await Student.find();
  const attendance = await Attendance.find().populate("student");
  
  console.log(`\n--- DATABASE SUMMARY ---`);
  console.log(`Total Students: ${students.length}`);
  students.forEach(s => console.log(` - ${s.name} (${s.rollNo}) [${s.department}]`));
  
  console.log(`Total Attendance Records: ${attendance.length}`);
  attendance.forEach(a => console.log(` - Student: ${a.student ? a.student.name : "none"}, Status: ${a.status}, Date: ${new Date(a.date).toLocaleString()}`));
  
  await mongoose.disconnect();
}

check().catch(console.error);
