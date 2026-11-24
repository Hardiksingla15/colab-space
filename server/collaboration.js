require("dotenv").config();

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Y = require("yjs");

const { Server } = require("@hocuspocus/server");
const { TiptapTransformer } = require("@hocuspocus/transformer");
const { generateHTML } = require("@tiptap/html");
const StarterKit = require("@tiptap/starter-kit").default;

const User = require("./models/User");
const Document = require("./models/Document");

const COLLAB_PORT = process.env.COLLAB_PORT || 1234;

async function startCollaborationServer() {
    try {
        if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
            throw new Error("Missing MONGODB_URI or JWT_SECRET");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Realtime server connected to MongoDB");

        const collaborationServer = new Server({
            port: Number(COLLAB_PORT),

            async onAuthenticate({ token, documentName }) {
                if (!token) {
                    throw new Error("Authentication token required");
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                const user = await User.findById(decoded.userId);
                if (!user) {
                    throw new Error("User not found");
                }

                const document = await Document.findById(documentName);
                if (!document) {
                    throw new Error("Document not found");
                }

                if (document.owner.toString() !== user._id.toString()) {
                    throw new Error("Access denied");
                }

                if (!document.collaborationState) {
                    throw new Error("Document requires collaboration initialization");
                }

                return {
                    user: {
                        id: user._id.toString(),
                        name: user.name,
                    },
                };
            },

            async onLoadDocument({ documentName }) {
                const record = await Document.findById(documentName);

                if (!record) {
                    throw new Error("Document not found");
                }

                if (!record.collaborationState) {
                    throw new Error("Document not initialized for collaboration");
                }

                const update = Uint8Array.from(
                    Buffer.from(record.collaborationState, "base64")
                );

                const ydoc = new Y.Doc();
                Y.applyUpdate(ydoc, update);

                return ydoc;
            },

            async onStoreDocument({ documentName, document }) {
                try {
                    // Save authoritative Yjs state
                    const state = Y.encodeStateAsUpdate(document);
                    const base64State = Buffer.from(state).toString("base64");

                    // Convert Yjs document back into Tiptap JSON
                    const editorJSON = TiptapTransformer.fromYdoc(document);

                    // Convert editor JSON into HTML for legacy document compatibility
                    const html = generateHTML(editorJSON, [StarterKit]);

                    await Document.updateOne({ _id: documentName }, {
                        $set: {
                            collaborationState: base64State,
                            content: html,
                        },
                    });

                    console.log(`Collaborative document saved: ${documentName}`);
                } catch (error) {
                    console.error(
                        `Failed to save collaborative document ${documentName}:`,
                        error
                    );
                }
            },
        });

        await collaborationServer.listen();

        console.log(
            `CollabSpace realtime server running at ws://localhost:${COLLAB_PORT}`
        );
    } catch (error) {
        console.error("Realtime server startup failed:", error.message);
        process.exit(1);
    }
}

startCollaborationServer();
I do mind where led or already systm, that is called a starvation but convoy fact me, System A, like Jury, Agreo First, convert convoy effect, yeah, cooking cay bar norandomly utake pouch left it, then a shatati, interprocess communication, captain, task data comunica, flour, to obviously joke systement, to came multiple processes, comunicate
case no ball, so
for climate hinding charge, basic process, synchronization primitivs, to subsequent tax, molth mutual sclusion law.So I 's cabinary locked zero, lock, ms , do values zero, unlock unlock. Values provide. Luce only the threat that locks can unlock, whisper lock h h h h, to unlock busy weighting or spin lock problem, to show likehora, important interview my pharta, or nice kwselve, to kiss it. Buzy weight charga, for usa unlock phase, to absmafore interview, nice questions dring so kiss, what chlock है, usem unlocked, us mutex wrake, use, coiz lock है, but case busy wet legal, zero start of learn charte, to absorph captain, semafar cata, indicator variable accessed while atomic weight and signal operation, so yeser variable, joke accessed atomic weight and signal operations, or ye powerful muts around. Or signal, scalu, battle. Weight signal, hot sorry, marat, or are signal. Just chm, or signal, negative value, shit, blocking. Riga, less than equal to zero, him up a dring processes signal lug greater than equal to zero, so positive value huh, Is process corange. Do types are binary sem number, or counting semfor. Agerity zero on linguist, like mu tax, to have hogary me, or values, positive, to hair. Thing, do I or zero printr one printer two printer three हो गया, so next process me chlenging, or it starts prints values sign, you can reach print, conge, in going signals came anging. Four horge, fire weight me three hora, two hora, so I need to say, him zero curte channels series comments and drive revision case kwent konsco concept trying to are revisions, questions trying, and the simple questions andstart to knew basically shown duplicate characteristic. Duplication, skill remove, remove and now the next time is whatever thing is left, this is a kind of radiation which you can keep in your minda if you know this, find the you will be able to follow the questions again sets and thenshow something shame that is very very simple question of understanding high base, second, such as spack stack and small and plucking second question, just for your sake of understanding and huge member, style and based members, let'
s see how think of question number two
lets s hown line, Is
case to move, I basically e ok, I have removed.That 's fine. Correct, so I bring remove to most statements, previous question, changing doctors. Basically, elements if yes, if not, again plushback in spare modern trying to