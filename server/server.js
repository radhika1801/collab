import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle draw events
    socket.on("draw", (data) => {
        socket.broadcast.emit("draw", data);
    });

    // Handle clear events
    socket.on("clear", () => {
        socket.broadcast.emit("clear");
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});