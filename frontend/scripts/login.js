document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    // Redirect if already logged in
    if (window.location.pathname === "/sites/login.html" && token) {
        window.location.href = "index.html";
        return;
    }

    // Redirect if not logged in and on any page except login page
    if (!token && window.location.pathname !== "/sites/login.html") {
        window.location.href = "login.html";
        return;
    }

    // Handle login form submission
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault(); // Prevent default form submission

            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            // Validation: Ensure fields are filled out
            if (!username || !password) {
                alert("Benutzername und Passwort sind erforderlich!");
                return;
            }

            try {
                // Send the login request to the server
                const response = await fetch("http://localhost:8000/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username, password }),
                });

                // Check if the login request was successful
                if (!response.ok) {
                    const data = await response.json();
                    alert(data.message || "Fehler beim Login.");
                    return;
                }

                const loginData = await response.json();
                if (loginData.token) {
                    localStorage.setItem("token", loginData.token);
                    window.location.href = "index.html"; // Redirect to main page after successful login
                } else {
                    alert("Login fehlgeschlagen.");
                }
            } catch (error) {
                // Handle request error
                console.error("Fehler bei der Anfrage:", error);
                alert("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.");
            }
        });
    }
});
