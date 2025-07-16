// auth.js
function getTokenFromUrl() {
  const hash = window.location.hash.substr(1); // Remove the #
  const params = new URLSearchParams(hash);
  return {
    idToken: params.get("id_token"),
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token")
  };
}

function storeTokens() {
  const tokens = getTokenFromUrl();
  if (tokens.idToken) {
    localStorage.setItem("idToken", tokens.idToken);
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Run this on every page load
storeTokens();

// Utility to get stored token
function getIdToken() {
  return localStorage.getItem("idToken");
}
