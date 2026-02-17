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

    // =====================
    // Typing Indicator
    // =====================

    socket.on("typing", (username) => {
        socket.broadcast.emit("typing", username);
    });

    socket.on("stopTyping", () => {
        socket.broadcast.emit("stopTyping");
    });

});
