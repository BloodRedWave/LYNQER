const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USERS_FILE = path.join(__dirname, "user.db");
const dbPath = USERS_FILE; // Verwendung der gemeinsamen Konstante

// Funktion zum Erstellen eines SHA-3-512 Hashes
const hashPassword = (password) => {
    const hash = crypto.createHash('sha3-512');
    hash.update(password);
    return hash.digest('hex');
};

// Funktion zum Vergleichen von Passwörtern
const comparePassword = (candidatePassword, storedPassword) => {
    const hashedCandidatePassword = hashPassword(candidatePassword); // Hashen des eingegebenen Passworts
    return hashedCandidatePassword === storedPassword; // Vergleiche mit dem gespeicherten Hash
};

// Funktion zur AES-256-CBC Verschlüsselung
const encryptPassword = (password, secret) => {
    const key = Buffer.from(secret, 'utf8'); // Umwandeln des Geheimnisses in einen Buffer
    const iv = Buffer.alloc(16, 0); // Initialisierungsvektor (16 Bytes für CBC-Modus)
    
    // Sicherstellen, dass der Schlüssel 32 Bytes lang ist (256 Bit für aes-256-cbc)
    const key256 = key.length === 32 ? key : Buffer.concat([key, Buffer.alloc(32 - key.length)], 32);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key256, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

// Laden der Benutzerdaten aus der Datei
const loadUsers = () => {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath));
};

// Speichern der Benutzerdaten in der Datei
const saveUsers = (users) => {
    fs.writeFileSync(dbPath, JSON.stringify(users, null, 2));
};

// Funktion zum Abrufen eines Benutzers anhand einer Abfrage (Benutzername oder ID)
const getUserByQuery = (query) => {
    const users = loadUsers();
    return Object.values(users).find(u => u.username === query || u.id === query) || null;
};

// Funktion zum Hinzufügen eines Freundes
const addFriend = (userID, friendID) => {
    const users = loadUsers();
    if (!users[userID] || !users[friendID]) return { error: "Benutzer nicht gefunden" };
    
    if (!users[userID].friends) users[userID].friends = [];
    if (users[userID].friends.includes(friendID)) return { message: "Bereits in der Freundesliste" };

    users[userID].friends.push(friendID);
    saveUsers(users);
    return { message: "Freund hinzugefügt!" };
};

module.exports = { loadUsers, saveUsers, hashPassword, encryptPassword, getUserByQuery, addFriend, comparePassword }; 
