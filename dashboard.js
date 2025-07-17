// dashboard.js

const clientId = "4vu39fr2kccnb6kdk67v8ejsak"; // Cognito App Client ID
const domain = "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com";
const redirectUri = "https://cloudtechmadan.github.io/my-website-user/index.html";
const BASE_API_URL = "https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod";

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

// === Authentication ===
function isAuthenticated() {
  return !!localStorage.getItem("accessToken");
}

function logout() {
  localStorage.clear();
  window.location.href = `${domain}/logout?client_id=${clientId}&logout_uri=${redirectUri}`;
}

// === Username from ID Token ===
function displayUsername() {
  const idToken = localStorage.getItem("idToken");
  if (!idToken) return;

  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const name = payload.name || payload.email || "Employee";
    document.getElementById("username").textContent = name;
  } catch (e) {
    console.warn("Failed to decode ID token:", e);
  }
}

// === Webcam Setup ===
async function setupWebcam() {
  const video = document.getElementById("webcam");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (error) {
    console.error("Failed to access webcam:", error);
    alert("Webcam access denied or unavailable.");
  }
}

// === Submit Attendance ===
document.getElementById("captureBtn").addEventListener("click", async () => {
  const video = document.getElementById("webcam");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg"));
  const statusEl = document.getElementById("attendanceStatus");
  const accessToken = localStorage.getItem("accessToken");

  try {
    const presignRes = await fetch(`${BASE_API_URL}/getPresignedUrl`, {
      method: "POST",
      headers: {
        Authorization: accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename: `attendance-${Date.now()}.jpg` }),
    });

    if (!presignRes.ok) throw new Error("Failed to get presigned URL");

    const { url } = await presignRes.json();

    await fetch(url, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": "image/jpeg",
      },
    });

    statusEl.textContent = "✅ Attendance submitted successfully!";
  } catch (err) {
    console.error("Error submitting attendance:", err);
    statusEl.textContent = "❌ Failed to submit attendance.";
  }
});

// === Load Attendance History ===
async function loadAttendanceHistory() {
  const accessToken = localStorage.getItem("accessToken");
  const list = document.getElementById("attendanceHistory");
  list.innerHTML = "<li>Loading...</li>";

  try {
    const res = await fetch(`${BASE_API_URL}/getAttendanceHistory`, {
      headers: { Authorization: accessToken },
    });

    if (!res.ok) throw new Error("Failed to fetch attendance history");

    const data = await res.json();
    list.innerHTML = "";

    if (!data.records || data.records.length === 0) {
      list.innerHTML = "<li>No records found.</li>";
    } else {
      data.records.forEach(({ date, status }) => {
        const li = document.createElement("li");
        li.textContent = `📅 ${date} — ${status}`;
        list.appendChild(li);
      });
    }
  } catch (err) {
    console.error("Error loading attendance history:", err);
    list.innerHTML = "<li>Error loading data.</li>";
  }
}

// === Submit Correction Request ===
document.getElementById("correctionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const accessToken = localStorage.getItem("accessToken");
  const date = document.getElementById("correctionDate").value;
  const reason = document.getElementById("correctionReason").value.trim();
  const status = document.getElementById("correctionStatus");

  try {
    const res = await fetch(`${BASE_API_URL}/submitCorrectionRequest`, {
      method: "POST",
      headers: {
        Authorization: accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ date, reason }),
    });

    if (!res.ok) throw new Error("Failed to submit correction request");

    status.textContent = "✅ Request submitted!";
    document.getElementById("correctionForm").reset();
  } catch (err) {
    console.error("Error submitting correction request:", err);
    status.textContent = "❌ Failed to submit request.";
  }
});

// === Init ===
window.addEventListener("load", () => {
  parseTokens();

  if (!isAuthenticated()) {
    window.location.href = `${domain}/login?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}`;
    return;
  }

  displayUsername();
  setupWebcam();
  loadAttendanceHistory();
  document.getElementById("logoutBtn").addEventListener("click", logout);
});
