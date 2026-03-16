const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const Student = require("./models/Student");
const Attendance = require("./models/Attendance");

const app = express();

mongoose.set("strictPopulate", false);

// ======================
// Middleware
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ======================
// MongoDB Connection
// ======================
const uri = "mongodb+srv://robin2006:2006@cluster0.oexgujo.mongodb.net/attendance?retryWrites=true&w=majority&appName=Cluster0";

async function connectDB() {
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  }
}

connectDB();


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
        a => a.student.toString() === student._id.toString()
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
// START SERVER
// ======================
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});