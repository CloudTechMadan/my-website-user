const BASE_API = "https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod";
const markAttendanceUrl = `${BASE_API}/markAttendance`;
const getHistoryUrl = `${BASE_API}/getAttendanceHistory`;
const submitCorrectionUrl = `${BASE_API}/submitCorrectionRequest`;
const getPresignedUrl = `${BASE_API}/getAttendanceImageUrl`;

const token = localStorage.getItem("access_token");
if (!token) {
  alert("You must log in first.");
  window.location.href = "index.html";
}

// Webcam Setup
const video = document.getElementById("webcam");
const captureBtn = document.getElementById("captureBtn");
const previewImg = document.getElementById("capturedPreview");
const statusText = document.getElementById("attendanceStatus");
const captureTime = document.getElementById("captureTime");
const previewSection = document.getElementById("previewSection");

async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (err) {
    alert("Webcam access denied or not available.");
    console.error("Webcam error:", err);
  }
}

// Capture & Mark Attendance
captureBtn.addEventListener("click", async () => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg");
  const blob = await (await fetch(dataUrl)).blob();

  try {
    statusText.textContent = "🔄 Getting upload URL...";
    const res = await fetch(getPresignedUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to get upload URL");

    const { uploadUrl, fileKey } = await res.json();

    // Upload to S3
    statusText.textContent = "⬆️ Uploading image...";
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob
    });

    if (!uploadRes.ok) throw new Error("Failed to upload image to S3");

    // Trigger attendance mark
    statusText.textContent = "🔍 Matching face...";
    const markRes = await fetch(markAttendanceUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fileKey })
    });

    const result = await markRes.json();
    const now = new Date();

    if (markRes.ok) {
      previewImg.src = dataUrl;
      previewSection.style.display = "block";
      captureTime.textContent = `Captured at: ${now.toLocaleTimeString()}`;
      statusText.textContent = `✅ Attendance marked: ${result.message || "Success"}`;
      fetchAttendanceHistory();
    } else {
      statusText.textContent = `❌ Attendance failed: ${result.error || result.message}`;
    }
  } catch (err) {
    console.error("Attendance error:", err);
    statusText.textContent = "❌ An error occurred while marking attendance.";
  }
});

// Load Attendance History
async function fetchAttendanceHistory() {
  const ul = document.getElementById("attendanceHistory");
  ul.innerHTML = "<li>Loading...</li>";

  try {
    const res = await fetch(getHistoryUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await res.json();  // rename to result for clarity
    ul.innerHTML = "";

    const history = result.data; // extract the array

    if (!Array.isArray(history) || history.length === 0) {
      ul.innerHTML = "<li>No attendance records found.</li>";
      return;
    }

    history.forEach(record => {
      const li = document.createElement("li");
      li.textContent = `${record.date} – ${record.status}`;
      ul.appendChild(li);
    });
  } catch (err) {
    console.error("History load error:", err);
    ul.innerHTML = "<li>Error loading attendance history.</li>";
  }
}


// Submit Correction Request
document.getElementById("correctionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("correctionDate").value;
  const reason = document.getElementById("correctionReason").value.trim();
  const status = document.getElementById("correctionStatus");

  if (!date || !reason) {
    status.textContent = "Please fill in both date and reason.";
    return;
  }

  status.textContent = "Submitting correction request...";
  try {
    const res = await fetch(submitCorrectionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ date, reason })
    });

    const result = await res.json();
    if (res.ok) {
      status.textContent = "✅ Correction request submitted.";
      document.getElementById("correctionForm").reset();
    } else {
      status.textContent = `❌ Failed: ${result.error || result.message}`;
    }
  } catch (err) {
    console.error("Correction request error:", err);
    status.textContent = "❌ Error submitting correction request.";
  }
});

// Placeholder Summary
document.getElementById("weeklySummary").textContent = "Feature coming soon...";

// Init
startWebcam();
fetchAttendanceHistory();
