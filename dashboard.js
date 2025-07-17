const BASE_API = "https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod";
const markAttendanceUrl = `${BASE_API}/mark-attendance`;
const getHistoryUrl = `${BASE_API}/get-attendance-history`;
const submitCorrectionUrl = `${BASE_API}/submit-correction-request`;
const getPresignedUrl = `${BASE_API}/get-presigned-url`;

const token = localStorage.getItem("access_token");
if (!token) {
  alert("You must log in first.");
  window.location.href = "index.html";
}

// 📷 Webcam setup
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
    console.error(err);
  }
}

// 📸 Capture image and upload
captureBtn.addEventListener("click", async () => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg");

  const blob = await (await fetch(dataUrl)).blob();

  try {
    statusText.textContent = "Uploading image...";
    // 1. Get pre-signed URL
    const res = await fetch(getPresignedUrl, {
      method: "GET",
      headers: { Authorization: token }
    });
    const { uploadUrl, fileKey } = await res.json();

    // 2. Upload image to S3
    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob
    });

    // 3. Call mark attendance API
    statusText.textContent = "Checking face and logging attendance...";
    const markRes = await fetch(markAttendanceUrl, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fileKey })
    });

    const result = await markRes.json();
    if (markRes.ok) {
      const now = new Date();
      previewImg.src = dataUrl;
      previewSection.style.display = "block";
      captureTime.textContent = `Captured at: ${now.toLocaleTimeString()}`;
      statusText.textContent = `✅ Attendance marked: ${result.message || "Success"}`;
      fetchAttendanceHistory();
    } else {
      statusText.textContent = `❌ Failed: ${result.error || result.message}`;
    }
  } catch (err) {
    console.error(err);
    statusText.textContent = "❌ Error occurred while submitting attendance.";
  }
});

// 📜 Load Attendance History
async function fetchAttendanceHistory() {
  const ul = document.getElementById("attendanceHistory");
  ul.innerHTML = "<li>Loading...</li>";

  try {
    const res = await fetch(getHistoryUrl, {
      method: "GET",
      headers: { Authorization: token }
    });

    const data = await res.json();
    ul.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      ul.innerHTML = "<li>No attendance records found.</li>";
      return;
    }

    data.forEach(record => {
      const li = document.createElement("li");
      li.textContent = `${record.date} – ${record.status}`;
      ul.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    ul.innerHTML = "<li>Error loading history.</li>";
  }
}

// 📝 Submit Correction Request
document.getElementById("correctionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("correctionDate").value;
  const reason = document.getElementById("correctionReason").value.trim();
  const status = document.getElementById("correctionStatus");

  if (!date || !reason) {
    status.textContent = "Please fill in both date and reason.";
    return;
  }

  status.textContent = "Submitting request...";
  try {
    const res = await fetch(submitCorrectionUrl, {
      method: "POST",
      headers: {
        Authorization: token,
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
    console.error(err);
    status.textContent = "❌ Error submitting correction request.";
  }
});

// ⏳ Weekly Summary (Placeholder)
document.getElementById("weeklySummary").textContent = "Feature coming soon...";

// ▶️ Start everything
startWebcam();
fetchAttendanceHistory();
