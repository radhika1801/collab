import { io } from "socket.io-client";

// Replace this with your Render backend URL:
export const socket = io("https://collab-wox8.onrender.com", {
  transports: ["websocket"],
});