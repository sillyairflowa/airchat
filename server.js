const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// =======================
// Middleware
// =======================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "airchat-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// =======================
// Ensure Files Exist
// =======================

const uploadPath = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const usersPath = path.join(__dirname, "users.json");
if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, "[]");
}

// =======================
// Multer Setup
// =======================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        cb(null, Date.now() + "-" + safeName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 }
});

// =======================
// Static Files
// =======================

app.use(express.static("public"));

// =======================
// User Helpers
// =======================

function getUsers() {
    return JSON.parse(fs.readFileSync(usersPath));
}

function saveUsers(users) {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

// =======================
// REGISTER
// =======================

app.post("/register", async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ error: "All fields required" });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: "Password too short" });
    }

    const users = getUsers();

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "Email already exists" });
    }

    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        id: Date.now(),
        email,
        username,
        password: hashedPassword
    };

    users.push(newUser);
    saveUsers(users);

    res.json({ success: "Account created" });
});

// =======================
// LOGIN
// =======================

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(400).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        return res.status(400).json({ error: "Invalid email or password" });
    }

    req.session.user = {
        id: user.id,
        username: user.username
    };

    res.json({ success: "Logged in", username: user.username });
});

// =======================
// CHECK LOGIN
// =======================

app.get("/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    res.json(req.session.user);
});

// =======================
// LOGOUT
// =======================

app.post("/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: "Logged out" });
});

// =======================
// Chat System (Same As Before)
// =======================

let messages = [];
const MAX_MESSAGES = 64;
const cooldownMap = new Map();

io.on("connection", (socket) => {

    socket.emit("loadMessages", messages);

    socket.on("chatMessage", (data) => {

        if (!data || !data.username || (!data.message && !data.file)) return;

        const now = Date.now();
        const lastTime = cooldownMap.get(socket.id) || 0;

        if (now - lastTime < 500) return;
        cooldownMap.set(socket.id, now);

        const cleanMessage = {
            username: String(data.username).slice(0, 20),
            message: String(data.message || "").slice(0, 500),
            file: data.file || null,
            time: now
        };

        messages.push(cleanMessage);
        if (messages.length > MAX_MESSAGES) messages.shift();

        io.emit("chatMessage", cleanMessage);
    });

    socket.on("typing", (username) => {
        socket.broadcast.emit("typing", username);
    });

    socket.on("stopTyping", () => {
        socket.broadcast.emit("stopTyping");
    });

    socket.on("disconnect", () => {
        cooldownMap.delete(socket.id);
    });
});

// =======================
// Upload
// =======================

app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });
    res.json({ file: req.file.filename });
});

// =======================
// Start Server
// =======================

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
