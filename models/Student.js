const mongoose = require('mongoose');
const db = require('./db');

// Define Mongoose Schema if mongoose is required
let studentMongooseModel;
try {
  const schema = new mongoose.Schema({
    name: { type: String, required: true },
    rollNo: { type: String, required: true, unique: true },
    department: { type: String, required: true }
  });
  studentMongooseModel = mongoose.models.Student || mongoose.model('Student', schema);
} catch (e) {
  console.error("Mongoose schema compilation error for Student:", e);
}

function isDbConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

class StudentModel {
  constructor(data) {
    this._id = data._id || 's_' + Math.random().toString(36).substr(2, 9);
    this.name = data.name;
    this.rollNo = data.rollNo;
    this.department = data.department;
  }

  async save() {
    if (isDbConnected() && studentMongooseModel) {
      try {
        if (this._id && !this._id.toString().startsWith('s_')) {
          // Valid MongoDB ObjectId update
          await studentMongooseModel.findByIdAndUpdate(this._id, {
            name: this.name,
            rollNo: this.rollNo,
            department: this.department
          }, { upsert: true, new: true });
        } else {
          // Attempt update by rollNo, or insert new
          const existing = await studentMongooseModel.findOne({ rollNo: this.rollNo });
          if (existing) {
            existing.name = this.name;
            existing.department = this.department;
            await existing.save();
            this._id = existing._id.toString();
          } else {
            const doc = new studentMongooseModel({
              name: this.name,
              rollNo: this.rollNo,
              department: this.department
            });
            await doc.save();
            this._id = doc._id.toString();
          }
        }
        return this;
      } catch (err) {
        console.error("Mongoose Student save error, falling back to JSON:", err);
      }
    }

    // Local JSON File Database Fallback
    const students = db.readJSON(db.STUDENTS_FILE);
    const existingIdx = students.findIndex(s => s._id === this._id || s.rollNo === this.rollNo);
    const studentData = {
      _id: this._id,
      name: this.name,
      rollNo: this.rollNo,
      department: this.department
    };
    if (existingIdx >= 0) {
      studentData._id = students[existingIdx]._id;
      students[existingIdx] = studentData;
      this._id = studentData._id;
    } else {
      students.push(studentData);
    }
    db.writeJSON(db.STUDENTS_FILE, students);
    return this;
  }

  static find() {
    if (isDbConnected() && studentMongooseModel) {
      return studentMongooseModel.find();
    }

    // Fallback: Return a chainable object with sort helper to mimic Mongoose
    const students = db.readJSON(db.STUDENTS_FILE);
    const chain = {
      sort: (criteria) => {
        const sorted = [...students];
        if (criteria && criteria.name) {
          sorted.sort((a, b) => a.name.localeCompare(b.name) * criteria.name);
        }
        return sorted;
      },
      then: (resolve) => resolve(students)
    };
    
    return chain;
  }

  static async findOne(query) {
    if (isDbConnected() && studentMongooseModel) {
      try {
        return await studentMongooseModel.findOne(query);
      } catch (err) {
        console.error("Mongoose findOne error, falling back to JSON:", err);
      }
    }

    const students = db.readJSON(db.STUDENTS_FILE);
    if (query.rollNo) {
      return students.find(s => s.rollNo === query.rollNo) || null;
    }
    if (query._id) {
      return students.find(s => s._id === query._id) || null;
    }
    return null;
  }

  static async findByIdAndDelete(id) {
    if (isDbConnected() && studentMongooseModel) {
      try {
        if (!id.toString().startsWith('s_')) {
          return await studentMongooseModel.findByIdAndDelete(id);
        }
      } catch (err) {
        console.error("Mongoose findByIdAndDelete error, falling back to JSON:", err);
      }
    }

    let students = db.readJSON(db.STUDENTS_FILE);
    const removed = students.find(s => s._id === id);
    if (removed) {
      students = students.filter(s => s._id !== id);
      db.writeJSON(db.STUDENTS_FILE, students);
    }
    return removed || null;
  }

  static async deleteMany(query) {
    if (isDbConnected() && studentMongooseModel) {
      try {
        return await studentMongooseModel.deleteMany(query || {});
      } catch (err) {
        console.error("Mongoose Student deleteMany error:", err);
      }
    }
    db.writeJSON(db.STUDENTS_FILE, []);
    return { deletedCount: 0 };
  }
}

module.exports = StudentModel;