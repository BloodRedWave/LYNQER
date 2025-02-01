const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(cors());

// Statische Dateien aus dem "frontend" Verzeichnis bereitstellen
app.use(express.static(path.join(__dirname, "../frontend")));

// Root-Route um zur login.html umzuleiten
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/sites/login.html"));
});

// Route für das Login-Formular
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/sites/login.html"));
});

// Route für das Register-Formular
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/sites/register.html"));
});

// Route für das Dashboard (index.html)
app.get("/index", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/sites/index.html"));
});

// Registrierung
app.post("/register", async (req, res) => {
    let users = loadUsers();
    const { username, password } = req.body;

    if (users[username]) {
        return res.status(400).json({ message: "Benutzername existiert bereits!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = { password: hashedPassword };
    saveUsers(users);

    res.json({ message: "Registrierung erfolgreich!" });
});

// Login
app.post("/login", async (req, res) => {
    let users = loadUsers();
    const { username, password } = req.body;

    if (!users[username]) {
        return res.status(400).json({ message: "Benutzer nicht gefunden!" });
    }

    const validPassword = await bcrypt.compare(password, users[username].password);
    if (!validPassword) {
        return res.status(400).json({ message: "Falsches Passwort!" });
    }

    res.json({ message: "Login erfolgreich!", username });
});

// Benutzer und Nachrichten
let users = {}; // Speichert eingeloggte Benutzer für den Chat

io.on("connection", (socket) => {
    socket.on("setUsername", (username) => {
        users[username] = socket.id;
        socket.username = username;
        io.emit("updateUserList", Object.keys(users));
    });

    socket.on("sendMessage", (data) => {
        io.to(users[data.to]).emit("receiveMessage", { from: socket.username, message: data.message });
    });

    socket.on("disconnect", () => {
        delete users[socket.username];
        io.emit("updateUserList", Object.keys(users));
    });
});

// Starte den Server
server.listen(8000, () => {
    console.log("✅ Server läuft auf http://localhost:8000");
});
