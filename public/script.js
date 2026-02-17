const socket = io();

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const usernameInput = document.getElementById("username");
const fileInput = document.getElementById("fileInput");


// =======================
// Typing Indicator Setup
// =======================

let typingDiv = document.createElement("div");
typingDiv.style.fontStyle = "italic";
typingDiv.style.padding = "5px 20px";
typingDiv.style.color = "gray";
typingDiv.style.display = "none";

messagesDiv.parentNode.insertBefore(typingDiv, messagesDiv.nextSibling);

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
    msgs.forEach(addMessage);
});

socket.on("chatMessage", (data) => {
    addMessage(data);
});

socket.on("clearMessages", () => {
    messagesDiv.innerHTML = "";
});

socket.on("typing", (username) => {
    typingDiv.textContent = username + " is typing...";
    typingDiv.style.display = "block";
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
// Add Message
// =======================

function addMessage(data) {

    const div = document.createElement("div");

    if (data.file) {

        div.innerHTML = `
            <strong>${data.username}:</strong><br>
            <img src="uploads/${data.file}" width="140"><br>
            ${data.message || ""}
        `;

        const downloadBtn = document.createElement("button");
        downloadBtn.textContent = "download";
        downloadBtn.style.fontSize = "8px";
        downloadBtn.style.padding = "4px 6px";
        downloadBtn.style.marginTop = "10px";

        downloadBtn.onclick = function () {
            const link = document.createElement("a");
            link.href = "uploads/" + data.file;
            link.download = data.file;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        div.appendChild(downloadBtn);

    } else {

        div.innerHTML = `
            <strong>${data.username}:</strong>
            ${data.message}
        `;
    }

    messagesDiv.appendChild(div);
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
