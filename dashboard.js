document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    alert("You are not logged in.");
    window.location.href = "https://cloudtechmadan.github.io/my-website-user/"; // Redirect to login
    return;
  }

  // Attendance Submission
  document.getElementById("submitAttendance").addEventListener("click", async () => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve(video.play());
        };
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg");
      const blobData = await (await fetch(imageData)).blob();

      const presignedRes = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod/presigned-url", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { uploadURL, filename } = await presignedRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        body: blobData,
        headers: { "Content-Type": "image/jpeg" },
      });

      await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod/face-user-attendance-check", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });

      alert("Attendance submitted!");
    } catch (error) {
      console.error(error);
      alert("Failed to mark attendance.");
    }
  });

  // View Attendance History
  document.getElementById("viewHistory").addEventListener("click", async () => {
    try {
      const res = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod/get-attendance-history", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      const outputDiv = document.getElementById("output");
      outputDiv.innerHTML = "<h3>Your Attendance History:</h3>";

      data.forEach((entry) => {
        outputDiv.innerHTML += `<p>${entry.date} - ${entry.status}</p>`;
      });
    } catch (error) {
      console.error(error);
      alert("Failed to load attendance history.");
    }
  });

  // Submit Correction Request
  document.getElementById("submitCorrection").addEventListener("click", async () => {
    const date = document.getElementById("correctionDate").value;
    const reason = document.getElementById("correctionReason").value;

    try {
      await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod/submit-correction-request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date, reason }),
      });

      alert("Correction request submitted.");
    } catch (error) {
      console.error(error);
      alert("Failed to submit correction.");
    }
  });

  // Logout
  document.getElementById("logout").addEventListener("click", () => {
    localStorage.removeItem("access_token");
    alert("Logged out.");
    window.location.href = "https://cloudtechmadan.github.io/my-website-user/";
  });
});
