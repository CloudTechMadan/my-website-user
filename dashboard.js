const token = localStorage.getItem("access_token");

// Redirect to login if token is missing
if (!token) {
  alert("Session expired. Please log in again.");
  window.location.href = "index.html";
}

const video = document.getElementById("webcam");
const captureBtn = document.getElementById("captureBtn");
const statusMsg = document.getElementById("attendanceStatus");
const imagePreview = document.getElementById("imagePreview");

// Initialize webcam
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    console.error("Webcam error:", err);
    statusMsg.textContent = "❌ Unable to access webcam.";
  });

// Click to capture and mark attendance
captureBtn.addEventListener("click", async () => {
  statusMsg.textContent = "📸 Capturing image...";
  
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg"));

  // Optional preview
  imagePreview.src = URL.createObjectURL(blob);
  imagePreview.style.display = "block";

  try {
    // Step 1: Get presigned URL from backend
    const presignResp = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/getAttendanceImageUrl", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json"
      }
    });

    const { uploadUrl, imageKey } = await presignResp.json();

    if (!uploadUrl || !imageKey) throw new Error("Presigned URL fetch failed.");

    // Step 2: Upload the image to S3 via presigned URL
    const s3Resp = await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": "image/jpeg"
      }
    });

    if (!s3Resp.ok) throw new Error("Upload to S3 failed");

    // Step 3: Call markAttendance with imageKey
    const attendanceResp = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/markAttendance", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ imageKey })
    });

    const result = await attendanceResp.json();

    if (attendanceResp.ok) {
      statusMsg.textContent = "✅ Attendance marked successfully!";
      loadAttendanceHistory(); // Refresh
    } else {
      throw new Error(result.error || "Attendance failed");
    }

  } catch (err) {
    console.error("Attendance error:", err);
    statusMsg.textContent = "❌ Error marking attendance.";
  }
});

// Load attendance history
async function loadAttendanceHistory() {
  const list = document.getElementById("attendanceHistory");
  list.innerHTML = "<li>Loading...</li>";

  try {
    const resp = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/getAttendanceHistory", {
      headers: { Authorization: token }
    });

    const data = await resp.json();

    if (resp.ok && Array.isArray(data.history)) {
      list.innerHTML = "";
      data.history.forEach(entry => {
        const li = document.createElement("li");
        li.textContent = `${entry.date} - ${entry.status}`;
        list.appendChild(li);
      });
    } else {
      list.innerHTML = "<li>No history found.</li>";
    }

  } catch (err) {
    console.error("History error:", err);
    list.innerHTML = "<li>⚠️ Error loading history.</li>";
  }
}

// Weekly summary (placeholder for now)
function displayWeeklySummary() {
  const summary = document.getElementById("weeklySummary");
  summary.innerHTML = "<em>Coming soon...</em>";
}

// Correction request
const correctionForm = document.getElementById("correctionForm");
const correctionStatus = document.getElementById("correctionStatus");

correctionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("correctionDate").value;
  const reason = document.getElementById("correctionReason").value;

  correctionStatus.textContent = "📤 Submitting request...";

  try {
    const resp = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/submitCorrectionRequest", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ date, reason })
    });

    const result = await resp.json();

    if (resp.ok) {
      correctionStatus.textContent = "✅ Correction request submitted.";
      correctionForm.reset();
    } else {
      throw new Error(result.error || "Submission failed.");
    }

  } catch (error) {
    console.error("Correction error:", error);
    correctionStatus.textContent = "❌ Failed to submit correction.";
  }
});

// Logout button
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("access_token");
  window.location.href = "index.html";
});

// Load initial data
loadAttendanceHistory();
displayWeeklySummary();
