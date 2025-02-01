const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "user.db");

const loadUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

module.exports = { loadUsers, saveUsers };
