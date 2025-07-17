// dashboard.js

// AWS Cognito login token retrieval
const token = localStorage.getItem("accessToken");

if (!token) {
  alert("You are not logged in. Redirecting to login page.");
  window.location.href = "index.html";
}

const status = document.getElementById("attendanceStatus");
const captureButton = document.getElementById("captureButton");
const video = document.getElementById("video");
const canvas = document.createElement("canvas");

// Start the webcam
async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (error) {
    console.error("Error accessing webcam:", error);
    status.textContent = "Webcam access denied.";
  }
}

// Capture image and convert to base64
function captureImage() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg");
}

// Upload image to S3 via pre-signed URL
async function uploadImageToS3(imageDataUrl, key) {
  try {
    const blob = await (await fetch(imageDataUrl)).blob();

    const uploadUrlRes = await fetch(
      `https://<your-api-id>.execute-api.us-east-1.amazonaws.com/getAttendanceImageUrl?key=${key}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const { url } = await uploadUrlRes.json();

    await fetch(url, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": "image/jpeg"
      }
    });

    return true;
  } catch (error) {
    console.error("Error uploading image:", error);
    status.textContent = "Image upload failed.";
    return false;
  }
}

// Mark attendance
async function markAttendance(imageDataUrl) {
  try {
    const response = await fetch(
      "https://<your-api-id>.execute-api.us-east-1.amazonaws.com/markAttendance",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image: imageDataUrl })
      }
    );

    const result = await response.json();

    if (response.status === 200) {
      status.textContent = `✅ Attendance marked for Employee ID: ${result.employee_id}`;
    } else {
      status.textContent = `❌ ${result.message || result.error}`;
    }
  } catch (error) {
    console.error("Attendance error:", error);
    status.textContent = "❌ Failed to mark attendance.";
  }
}

// Handle capture button click
captureButton.addEventListener("click", async () => {
  status.textContent = "Processing...";
  const imageDataUrl = captureImage();
  const imageKey = `attendance/${Date.now()}.jpg`;

  const uploaded = await uploadImageToS3(imageDataUrl, imageKey);

  if (uploaded) {
    await markAttendance(imageDataUrl);
  }
});

// Start webcam on page load
startWebcam();
