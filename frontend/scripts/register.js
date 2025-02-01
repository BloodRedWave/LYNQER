document.getElementById("registerBtn").addEventListener("click", async function() {
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;

    const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
        window.location.href = "login.html";
    } else {
        alert(data.message);
    }
});
