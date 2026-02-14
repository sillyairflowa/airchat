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

// Ensure uploads folder exists
const uploadPath = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.static("public"));

let messages = [];

io.on("connection", (socket) => {

    socket.emit("loadMessages", messages);

    socket.on("chatMessage", (data) => {

        messages.push(data);

        if (messages.length >= 64) {
            messages = [];
            io.emit("clearMessages");
        }

        io.emit("chatMessage", data);
    });
});

app.post("/upload", upload.single("file"), (req, res) => {

    if (!req.file) {
        return res.status(400).send("No file");
    }

    res.json({ file: req.file.filename });
});

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
