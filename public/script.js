const socket = io();

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const usernameInput = document.getElementById("username");
const fileInput = document.getElementById("fileInput");

// =======================
// Typing Indicator
// =======================

let typingDiv = document.createElement("div");
typingDiv.style.fontStyle = "italic";
typingDiv.style.padding = "5px 20px";
typingDiv.style.color = "gray";
typingDiv.style.display = "none";

messagesDiv.appendChild(typingDiv);

let typingTimeout;

messageInput.addEventListener("input", () => {
    const username = usernameInput.value.trim() || "Anonymous";

    socket.emit("typing", username);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("stopTyping");
    }, 1000);
});

// =======================
// Socket Listeners
// =======================

socket.on("loadMessages", (msgs) => {
    messagesDiv.innerHTML = "";
    messagesDiv.appendChild(typingDiv);
    msgs.forEach(addMessage);
});

socket.on("chatMessage", (data) => {
    addMessage(data);
});

socket.on("typing", (username) => {
    typingDiv.textContent = username + " is typing...";
    typingDiv.style.display = "block";
    scrollToBottom();
});

socket.on("stopTyping", () => {
    typingDiv.style.display = "none";
});

// =======================
// Send Message
// =======================

function send() {

    const message = messageInput.value.trim();
    const username = usernameInput.value.trim() || "Anonymous";

    if (!message && !fileInput.files[0]) return;

    if (message.length > 500) {
        alert("Message too long");
        return;
    }

    if (fileInput.files[0]) {

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        fetch("/upload", {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => {

            socket.emit("chatMessage", {
                username,
                message,
                file: data.file
            });

            messageInput.value = "";
            fileInput.value = "";
            socket.emit("stopTyping");
        });

    } else {

        socket.emit("chatMessage", {
            username,
            message
        });

        messageInput.value = "";
        socket.emit("stopTyping");
    }
}

// =======================
// Add Message (Safe)
// =======================

function addMessage(data) {

    const div = document.createElement("div");

    const strong = document.createElement("strong");
    strong.innerText = data.username + ": ";
    div.appendChild(strong);

    if (data.file) {

        const fileUrl = "uploads/" + data.file;
        const ext = data.file.split(".").pop().toLowerCase();

        let media;

        if (["mp4", "webm", "mov"].includes(ext)) {
            media = document.createElement("video");
            media.controls = true;
            media.width = 200;
        }
        else if (["mp3", "wav", "ogg"].includes(ext)) {
            media = document.createElement("audio");
            media.controls = true;
        }
        else {
            media = document.createElement("img");
            media.width = 140;
        }

        media.src = fileUrl;
        div.appendChild(document.createElement("br"));
        div.appendChild(media);

        if (data.message) {
            const text = document.createElement("div");
            text.innerText = data.message;
            div.appendChild(text);
        }

        const downloadBtn = document.createElement("button");
        downloadBtn.textContent = "Download";
        downloadBtn.style.fontSize = "10px";
        downloadBtn.style.marginTop = "6px";

        downloadBtn.onclick = () => {
            const link = document.createElement("a");
            link.href = fileUrl;
            link.download = data.file;
            link.click();
        };

        div.appendChild(downloadBtn);

    } else {
        const text = document.createElement("span");
        text.innerText = data.message;
        div.appendChild(text);
    }

    messagesDiv.insertBefore(div, typingDiv);
    scrollToBottom();
}

// =======================
// Helpers
// =======================

function pickFile() {
    fileInput.click();
}

function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
