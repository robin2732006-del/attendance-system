// ======================
// FRONTEND JS FOR ATTENDANCE SYSTEM
// ======================

const BASE_URL = ""; // relative URL works both locally and online
let students = [];

// ======================
// CUSTOM POPUP
// ======================
function showMessage(message) {
    let box = document.getElementById("popupBox");
    if (!box) {
        box = document.createElement("div");
        box.id = "popupBox";
        box.innerHTML = `
        <div style="
            background:white;
            padding:25px;
            border-radius:10px;
            text-align:center;
            min-width:250px;
            box-shadow:0 4px 15px rgba(0,0,0,0.2);
        ">
            <p id="popupText"></p><br>
            <button onclick="closePopup()" style="
                padding:8px 18px;
                background:#2a5298;
                color:white;
                border:none;
                border-radius:6px;
                cursor:pointer;
            ">OK</button>
        </div>
        `;
        box.style.position = "fixed";
        box.style.top = "0";
        box.style.left = "0";
        box.style.width = "100%";
        box.style.height = "100%";
        box.style.background = "rgba(0,0,0,0.4)";
        box.style.display = "flex";
        box.style.justifyContent = "center";
        box.style.alignItems = "center";
        document.body.appendChild(box);
    }
    document.getElementById("popupText").innerText = message;
    box.style.display = "flex";
}

function closePopup() {
    const box = document.getElementById("popupBox");
    if (box) box.style.display = "none";
}

// ======================
// ADD STUDENT
// ======================
async function addStudent() {
    try {
        const name = document.getElementById("name").value.trim();
        const rollNo = document.getElementById("roll").value.trim();
        const department = document.getElementById("department").value.trim();

        if (!name || !rollNo || !department) {
            showMessage("Please fill all fields");
            return;
        }

        const res = await fetch(`${BASE_URL}/add-student`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, rollNo, department })
        });

        const data = await res.json();
        showMessage(data.message || "Student added");

        document.getElementById("name").value = "";
        document.getElementById("roll").value = "";
        document.getElementById("department").value = "";

        loadStudents();
    } catch (error) {
        console.error(error);
        showMessage("Error adding student");
    }
}

// ======================
// LOAD STUDENTS
// ======================
async function loadStudents() {
    const tableBody = document.getElementById("studentTableBody");
    if (!tableBody) return;

    try {
        const res = await fetch(`${BASE_URL}/students`);
        students = await res.json();

        tableBody.innerHTML = "";

        students.forEach(student => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${student.name}</td>
                <td>${student.rollNo}</td>
                <td>${student.department}</td>
                <td>${student.status || "Not Marked"}</td>
                <td>
                    <button class="present-btn" onclick="markAttendance('${student._id}','Present')">Present</button>
                    <button class="absent-btn" onclick="markAttendance('${student._id}','Absent')">Absent</button>
                </td>
                <td>
                    <button class="delete-btn" onclick="deleteStudent('${student._id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        updateStats();
    } catch (error) {
        console.error(error);
        showMessage("Error loading students");
    }
}

// ======================
// UPDATE DASHBOARD
// ======================
function updateStats() {
    const totalStudents = document.getElementById("totalStudents");
    const presentCount = document.getElementById("presentCount");
    const percentBox = document.getElementById("attendancePercent");

    if (!totalStudents) return;

    const total = students.length;
    const present = students.filter(s => (s.status || "").toLowerCase() === "present").length;
    const percent = total ? Math.round((present / total) * 100) : 0;

    totalStudents.innerText = total;
    if (presentCount) presentCount.innerText = present;
    if (percentBox) percentBox.innerText = percent + "%";
}

// ======================
// DELETE STUDENT
// ======================
async function deleteStudent(id) {
    if (!confirm("Delete this student?")) return;

    try {
        const res = await fetch(`${BASE_URL}/delete-student/${id}`, { method: "DELETE" });
        const data = await res.json();
        showMessage(data.message || "Student deleted");
        loadStudents();
    } catch (error) {
        console.error(error);
        showMessage("Delete failed");
    }
}

// ======================
// MARK ATTENDANCE
// ======================
async function markAttendance(studentId, status) {
    try {
        const res = await fetch(`${BASE_URL}/mark-attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, status })
        });
        const data = await res.json();
        showMessage(data.message || "Attendance updated");
        loadStudents();
    } catch (error) {
        console.error(error);
        showMessage("Attendance marking failed");
    }
}

// ======================
// SEARCH STUDENT
// ======================
function searchStudent() {
    const input = document.getElementById("searchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#studentTableBody tr");

    rows.forEach(row => {
        const name = row.children[0].innerText.toLowerCase();
        const roll = row.children[1].innerText.toLowerCase();
        row.style.display = (name.includes(input) || roll.includes(input)) ? "" : "none";
    });
}

// ======================
// DOWNLOAD REPORT
// ======================
function downloadReport() {
    window.location.href = `${BASE_URL}/download-report`;
}

// ======================
// LOAD REPORT
// ======================
async function loadReport() {
    const tableBody = document.getElementById("reportTableBody");
    if (!tableBody) return;

    try {
        const res = await fetch(`${BASE_URL}/attendance-report`);
        const data = await res.json();
        tableBody.innerHTML = "";

        data.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.name}</td>
                <td>${row.rollNo}</td>
                <td>${row.department}</td>
                <td>${row.status}</td>
                <td>${new Date(row.date).toLocaleDateString()}</td>
                <td>
                    <button class="delete-btn" onclick="deleteAttendance('${row.id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Report load error:", error);
    }
}

// ======================
// DELETE ATTENDANCE
// ======================
async function deleteAttendance(id) {
    if (!confirm("Delete this record?")) return;

    try {
        const res = await fetch(`${BASE_URL}/delete-attendance/${id}`, { method: "DELETE" });
        const data = await res.json();
        showMessage(data.message || "Record deleted");
        loadReport();
    } catch (error) {
        console.error(error);
        showMessage("Delete failed");
    }
}

// ======================
// RESET SYSTEM (CLEAR ALL STUDENTS & ATTENDANCE)
// ======================
async function resetSystem() {
    if (!confirm("This will delete ALL students and attendance records. Continue?")) return;

    try {
        const res = await fetch(`${BASE_URL}/reset-system`, { method: "DELETE" });
        const data = await res.json();
        showMessage(data.message || "System reset successfully");
        loadStudents();
        loadReport();
    } catch (error) {
        console.error(error);
        showMessage("Failed to reset system");
    }
}

// ======================
// PAGE LOAD
// ======================
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("studentTableBody")) loadStudents();
    if (document.getElementById("reportTableBody")) loadReport();

    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.addEventListener("keyup", searchStudent);
});

// ======================
// LOGOUT
// ======================
function logout() {
    localStorage.removeItem("loggedIn");
    window.location.href = "login.html";
}