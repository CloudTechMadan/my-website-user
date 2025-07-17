const token = localStorage.getItem("access_token");
const video = document.getElementById("webcam");
const captureBtn = document.getElementById("captureBtn");
const statusMsg = document.getElementById("attendanceStatus");

// Setup webcam
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    console.error("Webcam error:", err);
    statusMsg.textContent = "Unable to access webcam.";
  });

// Upload captured image and call face-user-attendance-check
captureBtn.addEventListener("click", async () => {
  statusMsg.textContent = "Submitting attendance...";
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg"));

  try {
    // 1. Generate a unique filename
    const imageKey = `attendance/${Date.now()}.jpg`;
    const uploadUrl = `https://face-attendance-system-using-rek.s3.amazonaws.com/${imageKey}`;

    // 2. Upload to S3 directly (bucket must allow PUT via CORS and public write for this key)
    await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": "image/jpeg"
      }
    });

    // 3. Call the backend to process the uploaded image
    const attendanceResp = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/face-user-attendance-check", {
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
    } else {
      throw new Error(result.error || "Attendance failed");
    }

  } catch (err) {
    console.error("Attendance error:", err);
    statusMsg.textContent = "❌ Error marking attendance.";
  }
});

// Attendance history
async function loadAttendanceHistory() {
  const list = document.getElementById("attendanceHistory");
  list.innerHTML = "<li>Loading...</li>";

  try {
    const resp = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/get-attendance-history", {
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
    console.error(err);
    list.innerHTML = "<li>Error loading history.</li>";
  }
}

// Weekly summary placeholder
function displayWeeklySummary() {
  const summary = document.getElementById("weeklySummary");
  summary.innerHTML = "Coming soon...";
}

// Correction request
const correctionForm = document.getElementById("correctionForm");
const correctionStatus = document.getElementById("correctionStatus");

correctionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("correctionDate").value;
  const reason = document.getElementById("correctionReason").value;

  correctionStatus.textContent = "Submitting request...";

  try {
    const resp = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/submit-correction-request", {
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
    console.error(error);
    correctionStatus.textContent = "❌ Failed to submit correction.";
  }
});

// Load on startup
loadAttendanceHistory();
displayWeeklySummary();
