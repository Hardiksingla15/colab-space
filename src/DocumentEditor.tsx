
import { useState } from "react";
import { ArrowLeft, FileText, Save } from "lucide-react";

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

  const [content, setContent] = useState(
    () => localStorage.getItem(contentKey) ?? ""
  );

  function updateTitle(value: string) {
    setTitle(value);
    localStorage.setItem(titleKey, value);
    onTitleChange(value);
  }

  function updateContent(value: string) {
    setContent(value);
    localStorage.setItem(contentKey, value);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f7f8fc" }}>
      <header style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 5%",
        background: "white",
        borderBottom: "1px solid #e9eaf1",
      }}>
        <button onClick={onBack} style={buttonStyle}>
          <ArrowLeft size={17} /> Back
        </button>

        <FileText color="#6558df" size={21} />

        <input
          aria-label="Document title"
          value={title}
          onChange={(event) => updateTitle(event.target.value)}
          placeholder="Untitled document"
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: "none",
            fontSize: 18,
            fontWeight: 700,
            color: "#202437",
          }}
        />

        <span style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#299579",
          fontSize: 12,
        }}>
          <Save size={16} /> Saved locally
        </span>
      </header>

      <section style={{
        maxWidth: 850,
        margin: "35px auto",
        padding: "40px 48px",
        background: "white",
        border: "1px solid #e9eaf1",
        borderRadius: 12,
        minHeight: 600,
      }}>
        <p style={{
          color: "#858ba0",
          fontSize: 12,
          marginBottom: 24,
        }}>
          DOCUMENT · PERSONAL WORKSPACE
        </p>

        <textarea
          aria-label="Document content"
          value={content}
          onChange={(event) => updateContent(event.target.value)}
          placeholder="Start writing your ideas here..."
          style={{
            display: "block",
            width: "100%",
            minHeight: 450,
            resize: "vertical",
            border: 0,
            outline: "none",
            font: "16px/1.9 'DM Sans', sans-serif",
            color: "#34364a",
          }}
        />
      </section>
    </main>
  );
}

const buttonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 12px",
  background: "white",
  border: "1px solid #e5e6ee",
  borderRadius: 8,
  cursor: "pointer",
};
