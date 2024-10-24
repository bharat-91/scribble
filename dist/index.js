"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
    },
});
const PORT = process.env.PORT || 8080;
const words = ["apple", "banana", "cherry", "grape", "orange"]; // List of words
let currentWord = "";
let currentDrawer = null;
const users = [];
const incorrectGuesses = {}; // Store incorrect guesses for each user
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
io.on("connection", (socket) => {
    console.log("a user connected");
    users.push(socket.id);
    incorrectGuesses[socket.id] = []; // Initialize incorrect guesses for new user
    // Randomly assign a drawer when a user connects
    if (users.length === 1) {
        assignNewWordAndDrawer();
    }
    // Notify all clients about the current drawer
    io.emit("current drawer", currentDrawer);
    // Handle drawing events
    socket.on("drawing", (data) => {
        if (socket.id === currentDrawer) {
            socket.broadcast.emit("drawing", data);
        }
    });
    // Handle guessing the word
    socket.on("guess word", (guessedWord) => {
        if (guessedWord.toLowerCase() === currentWord) {
            // Notify all clients of the correct guess
            io.emit("game over", socket.id);
            assignNewWordAndDrawer(); // Assign new word and drawer
        }
        else {
            // Store incorrect guess for the user
            if (incorrectGuesses[socket.id]) {
                incorrectGuesses[socket.id].push(guessedWord);
            }
            else {
                incorrectGuesses[socket.id] = [guessedWord];
            }
            io.emit("incorrect guess", {
                userId: socket.id,
                guesses: incorrectGuesses[socket.id],
            });
        }
    });
    socket.on("disconnect", () => {
        console.log("user disconnected");
        users.splice(users.indexOf(socket.id), 1);
        // Handle drawer disconnect
        if (socket.id === currentDrawer) {
            assignNewWordAndDrawer(); // Assign new drawer if the current one disconnects
        }
    });
});
// Function to assign a new word and drawer
function assignNewWordAndDrawer() {
    currentDrawer = users[Math.floor(Math.random() * users.length)];
    currentWord = words[Math.floor(Math.random() * words.length)];
    io.emit("current drawer", currentDrawer);
    // Send the word only to the current drawer
    io.to(currentDrawer).emit("your word", currentWord);
    io.emit("game restarted", currentDrawer); // Notify all players that the game has restarted
    // Reset incorrect guesses for the new round
    for (const userId in incorrectGuesses) {
        incorrectGuesses[userId] = [];
    }
}
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
