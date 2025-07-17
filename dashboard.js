// dashboard.js

const clientId = "4vu39fr2kccnb6kdk67v8ejsak"; // Cognito App Client ID
const domain = "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com";
const redirectUri = "https://cloudtechmadan.github.io/my-website-user/index.html";

// === Token Parsing ===
function parseTokens() {
  const hash = window.location.hash.substr(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const idToken = params.get("id_token");

  if (accessToken && idToken) {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("idToken", idToken);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// === Auth Check ===
function isAuthenticated() {
  return !!localStorage.getItem("accessToken");
}

// === Logout ===
function logout() {
  localStorage.clear();
  window.location.href = `${domain}/logout?client_id=${clientId}&logout_uri=${redirectUri}`;
}
document.getElementById("logoutBtn").addEventListener("click", logout);

// === On Load ===
parseTokens();
if (!isAuthenticated()) {
  window.location.href = `${domain}/login?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}`;
}
document.getElementById("username").textContent = "Employee";

// === Webcam Attendance Capture ===
document.getElementById("captureBtn").addEventListener("click", async () => {
  const video = document.getElementById("webcam");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg"));

  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) return alert("Unauthorized");

  // Replace with your actual presigned URL endpoint
  const presignRes = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod/getPresignedUrl", {
    method: "POST",
    headers: {
      Authorization: accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename: `attendance-${Date.now()}.jpg` }),
  });

  const { url } = await presignRes.json();

  await fetch(url, {
    method: "PUT",
    body: blob,
    headers: {
      "Content-Type": "image/jpeg",
    },
  });

  document.getElementById("attendanceStatus").textContent = "Attendance submitted.";
});

// === 📅 Load Attendance History ===
async function loadAttendanceHistory() {
  const accessToken = localStorage.getItem("accessToken");
  const list = document.getElementById("attendanceHistory");

  try {
    const response = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod/getAttendanceHistory", {
      method: "GET",
      headers: {
        Authorization: accessToken
      }
    });

    if (!response.ok) throw new Error("Failed to fetch attendance history");

    const data = await response.json();
    list.innerHTML = "";

    if (!data.records || data.records.length === 0) {
      list.innerHTML = "<li>No records found</li>";
    } else {
      data.records.forEach(record => {
        const li = document.createElement("li");
        li.textContent = `Date: ${record.date}, Status: ${record.status}`;
        list.appendChild(li);
      });
    }
  } catch (error) {
    console.error("Error loading attendance history:", error);
    list.innerHTML = "<li>Error loading data</li>";
  }
}

// === ✍️ Submit Correction Request ===
document.getElementById("correctionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const accessToken = localStorage.getItem("accessToken");
  const date = document.getElementById("correctionDate").value;
  const reason = document.getElementById("correctionReason").value.trim();
  const status = document.getElementById("correctionStatus");

  try {
    const response = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod/submitCorrectionRequest", {
      method: "POST",
      headers: {
        Authorization: accessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ date, reason })
    });

    if (!response.ok) throw new Error("Failed to submit request");

    status.textContent = "Correction request submitted successfully.";
    document.getElementById("correctionForm").reset();
  } catch (error) {
    console.error("Error submitting correction:", error);
    status.textContent = "Error submitting correction request.";
  }
});

// === Webcam Setup ===
async function setupWebcam() {
  const video = document.getElementById("webcam");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (error) {
    console.error("Failed to access webcam:", error);
  }
}

// === Init All Features ===
window.addEventListener("load", () => {
  setupWebcam();
  loadAttendanceHistory();
});
