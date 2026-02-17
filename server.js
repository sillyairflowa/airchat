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
// Multer Setup
// =======================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 40 * 1024 * 1024 }
});


// =======================
// Static Files
// =======================

app.use(express.static("public"));


// =======================
// Message Storage
// =======================

let messages = [];


// =======================
// Socket.IO
// =======================

io.on("connection", (socket) => {

    // Send existing messages
    socket.emit("loadMessages", messages);

    // Handle chat message
    socket.on("chatMessage", (data) => {

        messages.push(data);

        if (messages.length >= 64) {
            messages = [];
            io.emit("clearMessages");
        }

        io.emit("chatMessage", data);
    });

    // Typing indicator
    socket.on("typing", (username) => {
        socket.broadcast.emit("typing", username);
    });

    socket.on("stopTyping", () => {
        socket.broadcast.emit("stopTyping");
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
