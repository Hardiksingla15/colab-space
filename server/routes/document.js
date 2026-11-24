const express = require("express");
const Document = require("../models/Document");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// GET: Fetch all documents belonging to logged-in user
router.get("/", authenticateToken, async(req, res) => {
    try {
        const documents = await Document.find({
            owner: req.user.id,
        }).sort({ updatedAt: -1 });

        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch documents" });
    }
});

// POST: Create a new document
router.post("/", authenticateToken, async(req, res) => {
    try {
        const { title, type, content } = req.body;

        if (!title || !["Document", "Whiteboard"].includes(type)) {
            return res.status(400).json({ message: "Invalid title or type" });
        }

        const document = await Document.create({
            title: title.trim(),
            type,
            content: content || "",
            owner: req.user.id,
        });

        res.status(201).json(document);
    } catch (error) {
        res.status(500).json({ message: "Failed to create document" });
    }
});

// GET: Fetch one document belonging to logged-in user
router.get("/:id", authenticateToken, async(req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            owner: req.user.id,
        });

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        res.json(document);
    } catch (error) {
        res.status(400).json({ message: "Invalid document ID" });
    }
});

// PUT: Update document title or content
router.put("/:id", authenticateToken, async(req, res) => {
    try {
        const { title, content } = req.body;

        const updates = {};

        if (typeof title === "string") {
            if (!title.trim() || title.trim().length > 150) {
                return res.status(400).json({ message: "Invalid title" });
            }
            updates.title = title.trim();
        }

        if (typeof content === "string") {
            updates.content = content;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No valid updates provided" });
        }

        const document = await Document.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, { $set: updates }, { new: true, runValidators: true });

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        res.json(document);
    } catch (error) {
        res.status(400).json({ message: "Failed to update document" });
    }
});

// DELETE: Delete document belonging to logged-in user
router.delete("/:id", authenticateToken, async(req, res) => {
    try {
        const document = await Document.findOneAndDelete({
            _id: req.params.id,
            owner: req.user.id,
        });

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        res.json({ message: "Document deleted successfully" });
    } catch (error) {
        res.status(400).json({ message: "Invalid document ID" });
    }
});

module.exports = router;