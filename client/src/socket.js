import { io } from "socket.io-client";

// For local development
export const socket = io("https://collab-wox8.onrender.com");

// When deployed to Render, update this to:
// export const socket = io("https://your-render-url.onrender.com");