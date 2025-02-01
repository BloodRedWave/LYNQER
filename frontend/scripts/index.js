const username = localStorage.getItem("username");
if (!username) {
    window.location.href = "login.html";
} else {
    document.getElementById("username").innerText = username;
}

document.getElementById("logoutBtn").addEventListener("click", function() {
    localStorage.removeItem("username");
    window.location.href = "login.html";
});
