const mongoose = require('mongoose');
const db = require('./db');

let attendanceMongooseModel;
try {
  const schema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, required: true },
    date: { type: Date, default: Date.now }
  });
  attendanceMongooseModel = mongoose.models.Attendance || mongoose.model('Attendance', schema);
} catch (e) {
  console.error("Mongoose schema compilation error for Attendance:", e);
}

function isDbConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

class AttendanceModel {
  constructor(data) {
    this._id = data._id || 'a_' + Math.random().toString(36).substr(2, 9);
    this.student = data.student; // String ID (JSON) or ObjectId (Mongoose)
    this.status = data.status;
    this.date = data.date ? new Date(data.date) : new Date();
  }

  async save() {
    if (isDbConnected() && attendanceMongooseModel) {
      try {
        // If student ID is a JSON fallback ID (starts with s_), it cannot be saved to MongoDB ref field
        // as Mongoose expects a valid ObjectId. We verify it's a valid hex ObjectId.
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(this.student.toString());
        if (isValidObjectId) {
          const doc = new attendanceMongooseModel({
            student: this.student,
            status: this.status,
            date: this.date
          });
          await doc.save();
          this._id = doc._id.toString();
          return this;
        } else {
          throw new Error("Invalid student ID format for MongoDB reference.");
        }
      } catch (err) {
        console.error("Mongoose Attendance save error:", err);
        throw err;
      }
    }



    // JSON fallback
    const records = db.readJSON(db.ATTENDANCE_FILE);
    const existingIdx = records.findIndex(r => r._id === this._id);
    const recordData = {
      _id: this._id,
      student: this.student,
      status: this.status,
      date: this.date instanceof Date ? this.date.toISOString() : new Date(this.date).toISOString()
    };
    if (existingIdx >= 0) {
      records[existingIdx] = recordData;
    } else {
      records.push(recordData);
    }
    db.writeJSON(db.ATTENDANCE_FILE, records);
    return this;
  }

  static find(query) {
    if (isDbConnected() && attendanceMongooseModel) {
      const dbQuery = {};
      if (query) {
        if (query.student) {
          const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(query.student.toString());
          if (isValidObjectId) {
            dbQuery.student = query.student;
          }
        }
        if (query.date) {
          dbQuery.date = {};
          if (query.date.$gte) dbQuery.date.$gte = new Date(query.date.$gte);
          if (query.date.$lte) dbQuery.date.$lte = new Date(query.date.$lte);
        }
      }
      return attendanceMongooseModel.find(dbQuery);
    }



    // JSON fallback
    let records = db.readJSON(db.ATTENDANCE_FILE);
    
    // Filter by date range if provided
    if (query && query.date && (query.date.$gte || query.date.$lte)) {
      const gte = query.date.$gte ? new Date(query.date.$gte) : null;
      const lte = query.date.$lte ? new Date(query.date.$lte) : null;
      records = records.filter(r => {
        const d = new Date(r.date);
        if (gte && d < gte) return false;
        if (lte && d > lte) return false;
        return true;
      });
    }

    // Return a chainable thenable object to mimic Mongoose chain
    const helper = {
      populate: (field, selectFields) => {
        const students = db.readJSON(db.STUDENTS_FILE);
        records.forEach(r => {
          if (r.student && typeof r.student === 'string') {
            const stud = students.find(s => s._id === r.student);
            r.student = stud || null;
          }
        });
        return helper;
      },
      sort: (criteria) => {
        if (criteria && criteria.date) {
          records.sort((a, b) => (new Date(a.date) - new Date(b.date)) * criteria.date);
        }
        return helper;
      },
      then: (resolve) => {
        resolve(records);
      }
    };
    
    return helper;
  }

  static async findOne(query) {
    if (isDbConnected() && attendanceMongooseModel) {
      try {
        const dbQuery = {};
        if (query.student) {
          const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(query.student.toString());
          if (isValidObjectId) {
            dbQuery.student = query.student;
          } else {
            return null;
          }
        }
        if (query.date) {
          dbQuery.date = {};
          if (query.date.$gte) dbQuery.date.$gte = new Date(query.date.$gte);
          if (query.date.$lte) dbQuery.date.$lte = new Date(query.date.$lte);
        }
        return await attendanceMongooseModel.findOne(dbQuery);
      } catch (err) {
        console.error("Mongoose findOne error:", err);
        throw err;
      }
    }



    // JSON fallback
    let records = db.readJSON(db.ATTENDANCE_FILE);
    
    if (query.student) {
      records = records.filter(r => r.student === query.student);
    }
    
    if (query.date && (query.date.$gte || query.date.$lte)) {
      const gte = query.date.$gte ? new Date(query.date.$gte) : null;
      const lte = query.date.$lte ? new Date(query.date.$lte) : null;
      records = records.filter(r => {
        const d = new Date(r.date);
        if (gte && d < gte) return false;
        if (lte && d > lte) return false;
        return true;
      });
    }
    
    return records[0] || null;
  }

  static async deleteMany(query) {
    if (isDbConnected() && attendanceMongooseModel) {
      try {
        const dbQuery = {};
        if (query.student) {
          const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(query.student.toString());
          if (isValidObjectId) {
            dbQuery.student = query.student;
            return await attendanceMongooseModel.deleteMany(dbQuery);
          }
        }
      } catch (err) {
        console.error("Mongoose deleteMany error:", err);
        throw err;
      }
    }



    // JSON fallback
    let records = db.readJSON(db.ATTENDANCE_FILE);
    if (query.student) {
      records = records.filter(r => r.student !== query.student);
      db.writeJSON(db.ATTENDANCE_FILE, records);
    }
    return { deletedCount: 1 };
  }

  static async findByIdAndDelete(id) {
    if (isDbConnected() && attendanceMongooseModel) {
      try {
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id.toString());
        if (isValidObjectId) {
          return await attendanceMongooseModel.findByIdAndDelete(id);
        }
      } catch (err) {
        console.error("Mongoose findByIdAndDelete error:", err);
        throw err;
      }
    }



    // JSON fallback
    let records = db.readJSON(db.ATTENDANCE_FILE);
    const removed = records.find(r => r._id === id);
    if (removed) {
      records = records.filter(r => r._id !== id);
      db.writeJSON(db.ATTENDANCE_FILE, records);
    }
    return removed || null;
  }
}

module.exports = AttendanceModel;