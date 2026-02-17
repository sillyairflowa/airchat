const socket = io();

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const usernameInput = document.getElementById("username");
const fileInput = document.getElementById("fileInput");

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
        });

    } else {

        socket.emit("chatMessage", {
            username,
            message
        });

        messageInput.value = "";
    }
}

function addMessage(data) {

    const div = document.createElement("div");

    if (data.file) {

        div.innerHTML = `
            <strong>${data.username}:</strong><br>
            <img src="uploads/${data.file}" width="150"><br>
            ${data.message || ""}
        `;

        // Create download button
        const downloadBtn = document.createElement("button");
        downloadBtn.textContent = "⬇";
        downloadBtn.style.fontSize = "10px";
        downloadBtn.style.padding = "8px 5px";
        downloadBtn.style.marginTop = "9px";

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


function pickFile() {
    fileInput.click();
}

function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
