
import { useState } from "react";
import { ArrowLeft, FileText, Save, Bold, Italic, Heading1, Heading2, List, ListOrdered } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type DocumentEditorProps = {
  documentId: number;
  initialTitle: string;
  onBack: () => void;
  onTitleChange: (title: string) => void;
};

export default function DocumentEditor({
  documentId,
  initialTitle,
  onBack,
  onTitleChange,
}: DocumentEditorProps) {
  const contentKey = `collabspace-content-${documentId}`;
  const titleKey = `collabspace-title-${documentId}`;

  const [title, setTitle] = useState(
    () => localStorage.getItem(titleKey) ?? initialTitle
  );

  const [saved, setSaved] = useState(true);

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: localStorage.getItem(contentKey) ?? "",
      editorProps: {
        attributes: {
          class: "collab-editor-content",
          "aria-label": "Document content",
        },
      },
      onUpdate: ({ editor }) => {
        localStorage.setItem(contentKey, editor.getHTML());
        setSaved(true);
      },
    },
    [documentId]
  );

  function updateTitle(value: string) {
    setTitle(value);
    localStorage.setItem(titleKey, value);
    onTitleChange(value);
  }

  const toolbarButton = (
    label: string,
    active: boolean,
    action: () => void,
    icon: React.ReactNode
  ) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      className={`editor-toolbar-button ${active ? "active" : ""}`}
      onClick={action}
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
        />

        <span className="editor-save-status">
          <Save size={16} /> {saved ? "Saved locally" : "Saving..."}
        </span>
      </header>

      <section className="collab-editor-paper">
        <p className="editor-eyebrow">
          DOCUMENT · PERSONAL WORKSPACE
        </p>

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
      </section>
    </main>
  );
}
