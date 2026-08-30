const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

// Load Environment Variables from .env if it exists
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

const Student = require("./models/Student");
const Attendance = require("./models/Attendance");
const User = require("./models/User");

const app = express();

mongoose.set("strictPopulate", false);

// ======================
// Middleware
// ======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ======================
// MongoDB Connection
// ======================
let MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/attendance";
if (typeof MONGO_URI === "string") {
  MONGO_URI = MONGO_URI.trim().replace(/(^["']|["']$)/g, "");
}
let dbConnectionError = null;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected (Atlas/Local)");
    startServer();
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
    dbConnectionError = err.message || err.toString();
    console.log("⚠️ MongoDB Server connection failed. Falling back to the self-contained, offline-compatible Local JSON File Database.");
    startServer();
  });


// ======================
// ADD STUDENT
// ======================
app.post("/add-student", async (req, res) => {
  try {

    const { name, rollNo, department } = req.body;

    if (!name || !rollNo || !department) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existing = await Student.findOne({ rollNo });

    if (existing) {
      return res.status(400).json({ message: "Roll number already exists" });
    }

    const student = new Student({
      name,
      rollNo,
      department
    });

    await student.save();

    res.json({ message: "Student added successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ======================
// GET STUDENTS WITH TODAY STATUS
// ======================
app.get("/students", async (req, res) => {

  try {

    const students = await Student.find().sort({ name: 1 });

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);

    const attendance = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd }
    });

    const result = students.map(student => {

      const record = attendance.find(
        a => a.student && a.student.toString() === student._id.toString()
      );

      return {
        _id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        department: student.department,
        status: record ? record.status : null
      };

    });

    res.json(result);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


// ======================
// DELETE STUDENT
// ======================
app.delete("/delete-student/:id", async (req, res) => {

  try {

    const id = req.params.id;

    await Student.findByIdAndDelete(id);

    await Attendance.deleteMany({ student: id });

    res.json({ message: "Student deleted successfully" });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


// ======================
// MARK ATTENDANCE
// ======================
app.post("/mark-attendance", async (req, res) => {

  try {

    const { studentId, status } = req.body;

    if (!studentId || !status) {
      return res.status(400).json({ message: "Missing data" });
    }

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);

    const alreadyMarked = await Attendance.findOne({
      student: studentId,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (alreadyMarked) {
      return res.status(400).json({ message: "Attendance already marked today" });
    }

    const attendance = new Attendance({
      student: studentId,
      status: status,
      date: new Date()
    });

    await attendance.save();

    res.json({ message: "Attendance marked successfully" });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


// ======================
// ATTENDANCE REPORT
// ======================
app.get("/attendance-report", async (req, res) => {

  try {

    const records = await Attendance.find()
      .populate("student","name rollNo department")
      .sort({ date:-1 });

    const formatted = records
      .filter(r => r.student)
      .map(r => ({
        id: r._id,
        name: r.student.name,
        rollNo: r.student.rollNo,
        department: r.student.department,
        status: r.status,
        date: r.date
      }));

    res.json(formatted);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


// ======================
// DOWNLOAD REPORT
// ======================

app.get("/download-report", async (req, res) => {

  try {

    const records = await Attendance.find()
      .populate("student","name rollNo department")
      .sort({ date:-1 });

    let csv = "Name,Roll No,Department,Status,Date\n";

    records.forEach(r => {

      if(!r.student) return;

      csv += `${r.student.name},${r.student.rollNo},${r.student.department},${r.status},${new Date(r.date).toLocaleDateString()}\n`;

    });

    const filePath = path.join(__dirname,"attendance_report.csv");

    fs.writeFileSync(filePath,csv);

    res.download(filePath,"attendance_report.csv");

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


// ======================
// DELETE ATTENDANCE
// ======================
app.delete("/delete-attendance/:id", async (req, res) => {

  try {

    await Attendance.findByIdAndDelete(req.params.id);

    res.json({ message: "Attendance deleted" });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


// ======================
// USER LOGIN
// ======================
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(400).json({ message: "Invalid Username or Password" });
    }
    res.json({ message: "Login successful", success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});






// ======================
// START SERVER
// ======================
function startServer() {
  if (app.locals.serverStarted) return;
  app.locals.serverStarted = true;
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
  });
}