const fs = require('fs');
const path = require('path');

const STUDENTS_FILE = path.join(__dirname, '../data/students.json');
const ATTENDANCE_FILE = path.join(__dirname, '../data/attendance.json');

// Ensure the local data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialise the JSON store files if they do not exist
if (!fs.existsSync(STUDENTS_FILE)) fs.writeFileSync(STUDENTS_FILE, '[]');
if (!fs.existsSync(ATTENDANCE_FILE)) fs.writeFileSync(ATTENDANCE_FILE, '[]');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
  readJSON,
  writeJSON,
  STUDENTS_FILE,
  ATTENDANCE_FILE
};
