const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

const USERS_FILE = path.join(__dirname, "user.db");
const dbPath = USERS_FILE; // Verwendung der gemeinsamen Konstante

// Funktion zum Hashen eines Passworts
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Funktion zum Vergleichen von Passwörtern
const comparePassword = async (candidatePassword, storedPassword) => {
    return await bcrypt.compare(candidatePassword, storedPassword);
};

// Laden der Benutzerdaten aus der Datei
const loadUsers = () => {
    try {
        if (!fs.existsSync(dbPath)) {
            return {}; // Rückgabe eines leeren Objekts, wenn die Datei nicht existiert
        }
        return JSON.parse(fs.readFileSync(dbPath)); // JSON-Daten laden
    } catch (error) {
        console.error("❌ Fehler beim Laden der Benutzerdaten:", error);
        return {}; // Rückgabe eines leeren Objekts bei Fehlern
    }
};

// Speichern der Benutzerdaten in der Datei
const saveUsers = (users) => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(users, null, 2)); // Daten sicher speichern
    } catch (error) {
        console.error("❌ Fehler beim Speichern der Benutzerdaten:", error);
    }
};

// Funktion zum Abrufen eines Benutzers anhand einer Abfrage (Benutzername oder ID)
const getUserByQuery = (query) => {
    const users = loadUsers();
    return Object.values(users).find(u => u.username === query || u["user-id"] === query) || null;
};

// Funktion zum Hinzufügen eines Freundes
const addFriend = (userID, friendID) => {
    const users = loadUsers();
    if (!users[userID] || !users[friendID]) return { error: "Benutzer nicht gefunden" };

    if (!users[userID].friends) users[userID].friends = []; // Wenn keine Freunde vorhanden, Initialisierung
    if (users[userID].friends.includes(friendID)) return { message: "Bereits in der Freundesliste" };

    users[userID].friends.push(friendID); // Freund hinzufügen
    if (!users[friendID].friends) users[friendID].friends = []; // Sicherstellen, dass der Freund auch eine Liste hat
    users[friendID].friends.push(userID); // Gegenseitig hinzufügen
    
    saveUsers(users); // Speichern der aktualisierten Benutzer
    return { message: "Freund hinzugefügt!" };
};

// Funktion zum Hinzufügen eines Benutzers
const addUser = (user) => {
    const users = loadUsers();
    const userID = user["user-id"];
    
    if (users[userID]) return { error: "Benutzer existiert bereits" };

    users[userID] = user;
    saveUsers(users); // Speichern der Benutzerdaten
    return { message: "Benutzer erfolgreich hinzugefügt" };
};

// Funktion zur Überprüfung der Benutzerrolle
const checkRole = (userID) => {
    const users = loadUsers();
    const user = users[userID];

    if (!user) return { error: "Benutzer nicht gefunden" };
    return { role: user.role };
};

module.exports = { loadUsers, saveUsers, hashPassword, comparePassword, getUserByQuery, addFriend, addUser, checkRole };
