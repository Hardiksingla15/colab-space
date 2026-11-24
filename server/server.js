require("dotenv").config();
const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/document");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authenticateToken = require("./middleware/auth");
const app = express();
const PORT = process.env.PORT || 5000;
const collaborationRoutes = require("./routes/collaboration");

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/collaboration", collaborationRoutes);
app.get("/", (req, res) => {
    res.json({
        message: "CollabSpace backend is running!",
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        project: "CollabSpace",
        database: mongoose.connection.readyState === 1 ?
            "connected" : "disconnected",
    });
});

async function startServer() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from server/.env");
        }

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(
                `CollabSpace backend running at http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error("Failed to start CollabSpace:", error.message);
        process.exit(1);
    }
}
app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json({
        message: "Authentication verified",
        user: req.user,
    });
});
startServer();