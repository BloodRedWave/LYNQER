const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const { loadUsers, addUser, addFriend, getUserByQuery, comparePassword, hashPassword, checkRole } = require("./db.js");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());

// Stelle statische Dateien aus dem 'public'-Ordner bereit
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8000;

// Middleware zur Überprüfung des JWT-Tokens
const authenticateJWT = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) return res.status(403).json({ error: "Zugang verweigert. Kein Token" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Ungültiges Token" });
        req.user = user;
        next();
    });
};

// Route zum Hinzufügen eines Benutzers
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) return res.status(400).json({ error: "Fehlende Felder" });

    const userID = Date.now().toString(); // Benutzer-ID basierend auf der Zeit erstellen
    const timestamp = Math.floor(Date.now() / 1000); // Unix-Timestamp für den Erstellungszeitpunkt

    const hashedPassword = await hashPassword(password);

    const newUser = {
        "user-id": userID,
        username,
        email,
        role: "member", // Standardrolle: member
        timestamp,
        password: hashedPassword
    };

    const result = addUser(newUser);
    if (result.error) return res.status(400).json(result);

    res.status(201).json({ message: "Benutzer registriert", userID });
});

// Route zum Login
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const user = getUserByQuery(username);
    if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden" });

    comparePassword(password, user.password).then(isValid => {
        if (!isValid) return res.status(401).json({ error: "Falsches Passwort" });

        const token = jwt.sign(
            { sub: user["user-id"], username: user.username, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1y" } // 1 Jahr
        );

        res.json({ token });
    });
});

// Route zum Hinzufügen eines Freundes
app.post("/add-friend", authenticateJWT, (req, res) => {
    const { friendID } = req.body;
    const userID = req.user.sub;

    const result = addFriend(userID, friendID);
    res.json(result);
});

// Route zum Überprüfen der Benutzerrolle
app.get("/check-role", authenticateJWT, (req, res) => {
    const result = checkRole(req.user.sub);
    res.json(result);
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
