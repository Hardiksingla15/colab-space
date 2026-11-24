const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
    },

    type: {
        type: String,
        enum: ["Document", "Whiteboard"],
        required: true,
    },

    content: {
        type: String,
        default: "",
    },

    collaborationState: {
        type: String,
        default: "",
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
}, { timestamps: true });

module.exports = mongoose.model("Document", documentSchema);