 const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;


// =======================
// Ensure uploads folder exists
// =======================

const uploadPath = path.join(__dirname, "public/uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}


// =======================
// Multer Setup (Safer)
// =======================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 8 * 1024 * 1024 } // 8MB max
});


// =======================
// Static Files
// =======================

app.use(express.static("public"));


// =======================
// Message Storage
// =======================

let messages = [];
const MAX_MESSAGES = 64;


// =======================
// Basic Rate Limit Map
// =======================

const messageCooldown = new Map();


// =======================
// Socket.IO
// =======================

io.on("connection", (socket) => {

    socket.emit("loadMessages", messages);

    socket.on("chatMessage", (data) => {

        if (!data || !data.username || !data.message) return;

        // Limit message length
        if (data.message.length > 500) return;

        // Rate limit (1 message per 500ms)
        const now = Date.now();
        const lastMessage = messageCooldown.get(socket.id) || 0;

        if (now - lastMessage < 500) return;

        messageCooldown.set(socket.id, now);

        const cleanMessage = {
            username: String(data.username).slice(0, 20),
            message: String(data.message).slice(0, 500),
            time: now
        };

        messages.push(cleanMessage);

        if (messages.length > MAX_MESSAGES) {
            messages.shift(); // remove oldest instead of clearing all
        }

        io.emit("chatMessage", cleanMessage);
    });

    socket.on("typing", (username) => {
        socket.broadcast.emit("typing", String(username).slice(0, 20));
    });

    socket.on("stopTyping", () => {
        socket.broadcast.emit("stopTyping");
    });

    socket.on("disconnect", () => {
        messageCooldown.delete(socket.id);
    });
});


// =======================
// File Upload Route
// =======================

app.post("/upload", upload.single("file"), (req, res) => {

    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }

    res.json({ file: req.file.filename });

});


// =======================
// Start Server
// =======================

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
