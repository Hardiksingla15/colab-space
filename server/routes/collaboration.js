const express = require("express");
const router = express.Router();
const Y = require("yjs");
const { TiptapTransformer } = require("@hocuspocus/transformer");

const authenticateToken = require("../middleware/auth");
const Document = require("../models/Document");

// Initialize Yjs state only once, for an owned document.
router.post("/:id/initialize", authenticateToken, async(req, res) => {
    try {
        const { content } = req.body;

        if (!content || typeof content !== "object") {
            return res.status(400).json({ message: "Valid editor JSON required" });
        }

        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Already initialized — never overwrite collaborative data.
        if (document.collaborationState) {
            return res.json({ initialized: false, message: "Already initialized" });
        }

        const ydoc = TiptapTransformer.toYdoc(content, "default");
        const update = Y.encodeStateAsUpdate(ydoc);
        const state = Buffer.from(update).toString("base64");

        // Atomic guard: only the first initialization can win.
        const result = await Document.updateOne({
            _id: document._id,
            collaborationState: "",
        }, {
            $set: { collaborationState: state },
        });

        if (result.modifiedCount === 1) {
            return res.json({ initialized: true });
        }

        return res.json({ initialized: false, message: "Initialization already completed" });
    } catch (error) {
        console.error("Collaboration initialization error:", error.message);
        return res.status(500).json({ message: "Initialization failed" });
    }
});

module.exports = router;