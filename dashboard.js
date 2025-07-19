// dashboard.js
const BASE_API = "https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod";
const markAttendanceUrl = `${BASE_API}/markAttendance`;
const getHistoryUrl = `${BASE_API}/getAttendanceHistory`;
const submitCorrectionUrl = `${BASE_API}/submitCorrectionRequest`;

const token = localStorage.getItem("access_token");

if (!token) {
  alert("Login required");
  window.location.href = "index.html";
}

const video = document.getElementById("video");
const status = document.getElementById("status");
const historyOutput = document.getElementById("historyOutput");

// Start camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => console.error("Camera error:", err));

// Capture image and return blob
async function captureImageBlob() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
  return await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
}

// Upload image and mark attendance
document.getElementById("markAttendanceBtn").addEventListener("click", async () => {
  status.textContent = "Marking attendance...";
  const imageBlob = await captureImageBlob();

  const formData = new FormData();
  formData.append("file", imageBlob, "selfie.jpg");

  const response = await fetch(markAttendanceUrl, {
    method: "POST",
    headers: {
      Authorization: token
    },
    body: imageBlob
  });

  const result = await response.json();
  status.textContent = result.message || "Attendance marked!";
});

// View attendance history
document.getElementById("viewHistoryBtn").addEventListener("click", async () => {
  historyOutput.textContent = "Fetching attendance history...";
  const response = await fetch(getHistoryUrl, {
    method: "GET",
    headers: { Authorization: token }
  });

  const data = await response.json();
  if (data.items) {
    historyOutput.textContent = JSON.stringify(data.items, null, 2);
  } else {
    historyOutput.textContent = "No records found.";
  }
});

// Request correction
document.getElementById("requestCorrectionBtn").addEventListener("click", async () => {
  const note = prompt("Enter correction reason:");
  if (!note) return;

  const response = await fetch(submitCorrectionUrl, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: note })
  });

  const result = await response.json();
  alert(result.message || "Correction request submitted.");
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  alert("Logged out");
  window.location.href = "index.html";
});
