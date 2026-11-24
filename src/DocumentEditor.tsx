import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  FileText,
  Save,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
} from "lucide-react";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

import {
  getDocumentById,
  updateDocument,
  initializeCollaboration,
} from "./services/documentService";

type DocumentEditorProps = {
  documentId: string | number;
  initialTitle: string;
  onBack: () => void;
  onTitleChange: (title: string) => void;
};

type CollaborationSession = {
  document: Y.Doc;
  provider: HocuspocusProvider;
};

export default function DocumentEditor({
  documentId,
  initialTitle,
  onBack,
  onTitleChange,
}: DocumentEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saved, setSaved] = useState("Loading document...");
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [collaborationSession, setCollaborationSession] =
    useState<CollaborationSession | null>(null);

  const documentLoadedRef = useRef(false);
  const editorRef = useRef<any>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor(
    {
      extensions: collaborationSession
        ? [
            StarterKit.configure({ undoRedo: false }),
            Collaboration.configure({
              document: collaborationSession.document,
            }),
            CollaborationCaret.configure({
              provider: collaborationSession.provider,
              user: {
                name: title || "Collaborator",
                color: "#6558df",
              },
            }),
          ]
        : [StarterKit],

      content: "",

      editorProps: {
        attributes: {
          class: "collab-editor-content",
          "aria-label": "Document content",
        },
      },

      onUpdate: ({ editor }) => {
        if (!documentLoadedRef.current) return;

        setSaved("Unsaved changes");

        if (contentTimer.current) clearTimeout(contentTimer.current);

        const content = editor.getHTML();

        contentTimer.current = setTimeout(async () => {
          try {
            setSaved("Saving to cloud...");
            await updateDocument(String(documentId), { content });
            setSaved("Saved to cloud");
          } catch (error) {
            console.error("Document save failed:", error);
            setSaved("Save failed");
          }
        }, 1000);
      },
    },
    [collaborationSession]
  );

  editorRef.current = editor;

  // Load content, seed Yjs once, then connect the realtime provider.
  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      documentLoadedRef.current = false;
      setDocumentLoaded(false);
      setLoadError("");
      setSaved("Loading document...");

      try {
        const cloudDocument = await getDocumentById(String(documentId));
        if (cancelled) return;

        setTitle(cloudDocument.title);
        onTitleChange(cloudDocument.title);

        const currentEditor = editorRef.current;

        // Load the existing HTML into the temporary non-collaborative editor.
        if (currentEditor && !collaborationSession) {
          currentEditor.commands.setContent(cloudDocument.content || "", {
            emitUpdate: false,
          });
        }

        // Seed Yjs from the editor JSON. The server prevents overwriting
        // an already initialized collaboration state.
        const jsonContent =
          currentEditor?.getJSON() || {
            type: "doc",
            content: [{ type: "paragraph" }],
          };

        await initializeCollaboration(String(documentId), jsonContent);
        if (cancelled) return;

        const token = sessionStorage.getItem("collabspace-token");
        if (!token) throw new Error("Authentication token not found");

        const ydoc = new Y.Doc();

        const provider = new HocuspocusProvider({
          url: import.meta.env.VITE_COLLAB_URL || "ws://localhost:1234",
          name: String(documentId),
          document: ydoc,
          token,
        });

        providerRef.current = provider;

        provider.on("status", ({ status }: { status: string }) => {
          if (!cancelled) {
            setSaved(status === "connected" ? "Realtime connected" : "Connecting...");
          }
        });

        setCollaborationSession({ document: ydoc, provider });
        documentLoadedRef.current = true;
        setDocumentLoaded(true);
      } catch (error) {
        if (cancelled) return;

        console.error("Document loading failed:", error);
        setLoadError(
          "Could not load this document from the server. Please go back and try again."
        );
        setSaved("Load failed");
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
      documentLoadedRef.current = false;

      if (contentTimer.current) clearTimeout(contentTimer.current);
      if (titleTimer.current) clearTimeout(titleTimer.current);
    };
  }, [documentId]);

  // Clean up collaboration session when leaving this document.
  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
      providerRef.current = null;
    };
  }, [documentId]);

  function updateTitle(value: string) {
    setTitle(value);
    onTitleChange(value);

   if (!documentLoadedRef.current || collaborationSession) return;

    if (titleTimer.current) clearTimeout(titleTimer.current);

    if (!value.trim()) {
      setSaved("Title cannot be empty");
      return;
    }

    setSaved("Unsaved changes");

    titleTimer.current = setTimeout(async () => {
      try {
        setSaved("Saving to cloud...");
        await updateDocument(String(documentId), { title: value });
        setSaved("Saved to cloud");
      } catch (error) {
        console.error("Title save failed:", error);
        setSaved("Save failed");
      }
    }, 800);
  }

  const toolbarButton = (
    label: string,
    active: boolean,
    action: () => void,
    icon: ReactNode
  ) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      className={`editor-toolbar-button ${active ? "active" : ""}`}
      onClick={action}
      disabled={!documentLoaded || !editor}
    >
      {icon}
    </button>
  );

  return (
    <main className="collab-editor-page">
      <header className="collab-editor-header">
        <button onClick={onBack} className="editor-back-button">
          <ArrowLeft size={17} /> Back
        </button>

        <FileText color="#6558df" size={21} />

        <input
          aria-label="Document title"
          value={title}
          onChange={(event) => updateTitle(event.target.value)}
          placeholder="Untitled document"
          className="editor-title-input"
          disabled={!documentLoaded}
        />

        <span className="editor-save-status">
          <Save size={16} /> {saved}
        </span>
      </header>

      <section className="collab-editor-paper">
        <p className="editor-eyebrow">DOCUMENT · PERSONAL WORKSPACE</p>

        {loadError ? (
          <div className="empty-state">
            <h3>Document unavailable</h3>
            <p>{loadError}</p>
            <button className="button button-primary" onClick={onBack}>
              Go back
            </button>
          </div>
        ) : (
          <>
            <div className="editor-toolbar">
              {editor && (
                <>
                  {toolbarButton(
                    "Bold",
                    editor.isActive("bold"),
                    () => editor.chain().focus().toggleBold().run(),
                    <Bold size={17} />
                  )}

                  {toolbarButton(
                    "Italic",
                    editor.isActive("italic"),
                    () => editor.chain().focus().toggleItalic().run(),
                    <Italic size={17} />
                  )}

                  <span className="editor-toolbar-divider" />

                  {toolbarButton(
                    "Heading 1",
                    editor.isActive("heading", { level: 1 }),
                    () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
                    <Heading1 size={18} />
                  )}

                  {toolbarButton(
                    "Heading 2",
                    editor.isActive("heading", { level: 2 }),
                    () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                    <Heading2 size={18} />
                  )}

                  <span className="editor-toolbar-divider" />

                  {toolbarButton(
                    "Bullet list",
                    editor.isActive("bulletList"),
                    () => editor.chain().focus().toggleBulletList().run(),
                    <List size={18} />
                  )}

                  {toolbarButton(
                    "Numbered list",
                    editor.isActive("orderedList"),
                    () => editor.chain().focus().toggleOrderedList().run(),
                    <ListOrdered size={18} />
                  )}
                </>
              )}
            </div>

            <EditorContent editor={editor} />
          </>
        )}
      </section>
    </main>
  );
}