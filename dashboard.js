// dashboard.js

const clientId = "4vu39fr2kccnb6kdk67v8ejsak"; // Your Cognito App Client ID
const domain = "https://cloudtechmadan.auth.us-east-1.amazoncognito.com";
const redirectUri = "https://cloudtechmadan.github.io/my-website-user/index.html";

// Parse tokens from URL fragment and store them
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

// Check if logged in
function isAuthenticated() {
  return !!localStorage.getItem("accessToken");
}

// Logout
function logout() {
  localStorage.clear();
  window.location.href = `${domain}/logout?client_id=${clientId}&logout_uri=${redirectUri}`;
}

document.getElementById("logoutBtn").addEventListener("click", logout);

// On load
parseTokens();

if (!isAuthenticated()) {
  window.location.href = `${domain}/login?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}`;
}

// Example placeholder - update DOM with greeting
const usernameSpan = document.getElementById("username");
usernameSpan.textContent = "Employee"; // You can decode idToken to get name if needed

// Attendance upload handler (replace with presigned URL logic)
document.getElementById("captureAttendance").addEventListener("click", async () => {
  const video = document.getElementById("webcam");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg"));

  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) return alert("Unauthorized");

  // Get presigned URL from your backend (Lambda via API Gateway)
  const presignRes = await fetch("https://YOUR_API/presign-url", {
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

  document.getElementById("captureStatus").textContent = "Attendance submitted.";
});

// TODO: Add fetch logic for Attendance History, Weekly Summary, Correction Form submission
