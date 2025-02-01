document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    // Redirect if already logged in
    if (window.location.pathname === "/sites/register.html" && token) {
        window.location.href = "index.html";
        return;
    }

    // Redirect if not logged in and on any page except register page
    if (!token && window.location.pathname !== "/sites/register.html") {
        window.location.href = "register.html";
        return;
    }

    // Handle registration form submission
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault(); // Prevent default form submission

            const username = document.getElementById("newUsername").value;
            const password = document.getElementById("newPassword").value;

            // Validation: Ensure fields are filled out and inputs are reasonable
            if (!username || !password) {
                alert("Benutzername und Passwort sind erforderlich!");
                return;
            }
            if (username.length < 3) {
                alert("Der Benutzername muss mindestens 3 Zeichen lang sein.");
                return;
            }
            if (password.length < 6) {
                alert("Das Passwort muss mindestens 6 Zeichen lang sein.");
                return;
            }

            try {
                // First, check if the username already exists
                const checkResponse = await fetch("http://localhost:8000/checkUsername", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username }),
                });

                const checkData = await checkResponse.json();
                if (checkData.exists) {
                    alert(checkData.message || "Dieser Benutzername ist bereits vergeben.");
                    return;
                }

                // Send the request to register the user
                const response = await fetch("http://localhost:8000/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username, password }),
                });

                // Check if the registration request was successful
                if (!response.ok) {
                    const data = await response.json();
                    alert(data.message || "Fehler bei der Registrierung.");
                    return;
                }

                // Successful registration
                alert("Registrierung erfolgreich! Du wirst jetzt weitergeleitet.");
                window.location.href = "login.html"; // Redirect to login page
            } catch (error) {
                // Handle request error
                console.error("Fehler bei der Anfrage:", error);
                alert("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.");
            }
        });
    }
});
