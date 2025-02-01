document.getElementById("loginBtn").addEventListener("click", async function() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem("username", data.username);
        window.location.href = "index.html";
    } else {
        alert(data.message);
    }
});
