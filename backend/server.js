require("dotenv").config(); // Lädt die .env-Datei

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { loadUsers, saveUsers, hashPassword, comparePassword, encryptPassword, getUserByQuery, addFriend } = require("./db"); // Funktionen importieren

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL, // Stelle sicher, dass du deine URL hier konfigurierst
        credentials: true,
    },
});

app.use(bodyParser.json());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, "../frontend")));

// Routen für verschiedene Seiten
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../frontend/sites/login.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "../frontend/sites/login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "../frontend/sites/register.html")));
app.get("/index", (req, res) => res.sendFile(path.join(__dirname, "../frontend/sites/index.html")));

// Registrierung
app.post("/register", async (req, res) => {
    try {
        let users = loadUsers();
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Benutzername und Passwort erforderlich!" });
        }
        if (users[username]) {
            return res.status(400).json({ message: "Benutzername existiert bereits!" });
        }

        const hashedPassword = await hashPassword(password);
        users[username] = { password: hashedPassword };
        saveUsers(users);

        res.status(201).json({ message: "Registrierung erfolgreich!" });
    } catch (error) {
        console.error("❌ Registrierungsfehler:", error);
        res.status(500).json({ message: "Serverfehler bei der Registrierung" });
    }
});

// Login
app.post("/login", async (req, res) => {
    try {
        let users = loadUsers();
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Benutzername und Passwort erforderlich!" });
        }
        if (!users[username]) {
            return res.status(400).json({ message: "Benutzer nicht gefunden!" });
        }

        const isValidPassword = await comparePassword(password, users[username].password);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Falsches Passwort!" });
        }

        res.json({ message: "Login erfolgreich!", username });
    } catch (error) {
        console.error("❌ Loginfehler:", error);
        res.status(500).json({ message: "Serverfehler beim Login" });
    }
});

// WebSocket-Handling
let usersOnline = {}; // Speichert eingeloggte Benutzer für den Chat

io.on("connection", (socket) => {
    console.log("🔗 Neuer Benutzer verbunden:", socket.id);

    socket.on("setUsername", (username) => {
        if (!username) return;
        usersOnline[username] = socket.id;
        socket.username = username;
        io.emit("updateUserList", Object.keys(usersOnline));
        console.log(`✅ ${username} ist online`);
    });

    socket.on("sendMessage", (data) => {
        if (usersOnline[data.to]) {
            io.to(usersOnline[data.to]).emit("receiveMessage", { from: socket.username, message: data.message });
        } else {
            console.warn(`⚠ Nachricht konnte nicht zugestellt werden: ${data.to} ist offline`);
        }
    });

    // WebRTC Signalisierung
    socket.on("offer", (data) => {
        // Weitersenden der offer-Nachricht an den Empfänger
        const targetSocket = usersOnline[data.to];
        if (targetSocket) {
            io.to(targetSocket).emit("offer", {
                from: socket.username,
                offer: data.offer,
            });
        }
    });

    socket.on("answer", (data) => {
        // Weitersenden der answer-Nachricht an den Absender
        const targetSocket = usersOnline[data.to];
        if (targetSocket) {
            io.to(targetSocket).emit("answer", {
                from: socket.username,
                answer: data.answer,
            });
        }
    });

    socket.on("candidate", (data) => {
        // Weitersenden der ICE-Kandidaten an den Empfänger
        const targetSocket = usersOnline[data.to];
        if (targetSocket) {
            io.to(targetSocket).emit("candidate", {
                from: socket.username,
                candidate: data.candidate,
            });
        }
    });

    socket.on("disconnect", () => {
        if (socket.username) {
            delete usersOnline[socket.username];
            io.emit("updateUserList", Object.keys(usersOnline));
            console.log(`❌ ${socket.username} ist offline`);
        }
    });
});

// Abrufen eines Benutzers anhand einer Abfrage (Benutzername oder ID)
app.get("/getUser", (req, res) => {
    const user = getUserByQuery(req.query.query);
    if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden" });
    res.json(user);
});

// Hinzufügen eines Freundes
app.post("/addFriend", (req, res) => {
    const { userID, friendID } = req.body;

    if (!userID || !friendID) {
        return res.status(400).json({ message: "Benutzer-ID und Freund-ID sind erforderlich!" });
    }

    // Sicherstellen, dass beide Benutzer existieren
    const users = loadUsers();
    const user = users[userID];
    const friend = users[friendID];

    if (!user || !friend) {
        return res.status(404).json({ message: "Benutzer oder Freund nicht gefunden!" });
    }

    const result = addFriend(userID, friendID);
    res.json(result);
});

// Route, um ICE-Server von Xirsys zu holen
app.get("/getIceServers", (req, res) => {
    const https = require("https");

    // Optionen für die Xirsys-API
    const options = {
        host: "global.xirsys.net",
        path: "/_turn/LYNQER",
        method: "PUT",
        headers: {
            "Authorization": "Basic " + Buffer.from("CallMeKira:fe1f29b4-e0dc-11ef-92ef-0242ac130006").toString("base64"),
            "Content-Type": "application/json",
        },
    };

    const bodyString = JSON.stringify({ format: "urls" });

    const httpreq = https.request(options, (httpres) => {
        let str = "";
        httpres.on("data", (data) => { str += data; });
        httpres.on("end", () => {
            try {
                const iceServers = JSON.parse(str);
                res.json(iceServers.v); // Die ICE-Server zurückgeben
            } catch (error) {
                console.error("❌ Fehler beim Parsen der ICE-Server-Daten:", error);
                res.status(500).json({ message: "Fehler beim Abrufen der ICE-Server" });
            }
        });
    });

    httpreq.on("error", (e) => {
        console.error("❌ Fehler bei der Anfrage:", e);
        res.status(500).send("Fehler bei der Verbindung zu Xirsys");
    });

    httpreq.write(bodyString);
    httpreq.end();
});

// Fehlerbehandlung für ungültige Routen
app.use((req, res) => res.status(404).send("404 - Seite nicht gefunden"));

// Server starten
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
