import { useEffect, useState, type CSSProperties } from "react";
import {
  Activity,
  Bell,
  ChevronDown,
  Clock3,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Share2,
  Users,
  WandSparkles,
  PencilRuler,
  MoreHorizontal,
  Pencil,
Trash2,
Check,
X,
} from "lucide-react";
import DocumentEditor from "./DocumentEditor";
import "./App.css";

type DocumentItem = {
  id: number;
  title: string;
  type: "Document" | "Whiteboard";
  updated: string;
  color: string;
  members: string[];
};

const STORAGE_KEY = "collabspace-documents";

const initialDocuments: DocumentItem[] = [
  {
    id: 1,
    title: "Project Architecture",
    type: "Document",
    updated: "Edited recently",
    color: "purple",
    members: ["H"],
  },
  {
    id: 2,
    title: "Semester 5 Project Plan",
    type: "Document",
    updated: "Edited yesterday",
    color: "blue",
    members: ["H"],
  },
  {
    id: 3,
    title: "Brainstorming Board",
    type: "Whiteboard",
    updated: "Edited 2 days ago",
    color: "orange",
    members: ["H"],
  },
  {
    id: 4,
    title: "System Design Notes",
    type: "Document",
    updated: "Edited 3 days ago",
    color: "green",
    members: ["H"],
  },
];

function loadDocuments(): DocumentItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return initialDocuments;

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return initialDocuments;

    return parsed.filter(
      (item): item is DocumentItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "number" &&
        typeof item.title === "string" &&
        (item.type === "Document" || item.type === "Whiteboard") &&
        typeof item.updated === "string" &&
        typeof item.color === "string" &&
        Array.isArray(item.members)
    );
  } catch {
    console.error("Could not restore CollabSpace documents.");
    return initialDocuments;
  }
}

function App() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>(loadDocuments);
  const [message, setMessage] = useState("");
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch {
      setMessage("Your browser could not save the document list.");
    }
  }, [documents]);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesNav =
      activeNav === "Overview" ||
      activeNav === "Recent" ||
      (activeNav === "Documents" && doc.type === "Document") ||
      (activeNav === "Whiteboards" && doc.type === "Whiteboard");

    return matchesSearch && matchesNav;
  });

  function createDocument(type: "Document" | "Whiteboard") {
    const newDocument: DocumentItem = {
      id: Date.now(),
      title: type === "Document" ? "Untitled document" : "Untitled whiteboard",
      type,
      updated: "Created just now",
      color: type === "Document" ? "blue" : "orange",
      members: ["H"],
    };

    setDocuments((current) => [newDocument, ...current]);
    setActiveNav(type === "Document" ? "Documents" : "Whiteboards");
    setSearch("");
    setMessage(
      `${type} created. Changes are saved in this browser; database sync will come later.`
    );
  }

  function updateDocumentTitle(id: number, title: string) {
    setDocuments((current) =>
      current.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              title,
              updated: "Edited just now",
            }
          : doc
      )
    );

    setSelectedDocument((current) =>
      current && current.id === id ? { ...current, title } : current
    );
  }
  const startRename = (doc: DocumentItem) => {
  setEditingDocumentId(doc.id);
  setEditTitle(doc.title);
};

const saveRename = (doc: DocumentItem) => {
  const title = editTitle.trim();
  if (!title) return;

  updateDocumentTitle(doc.id, title);
  setEditingDocumentId(null);
  setEditTitle("");
};

const deleteDocument = (doc: DocumentItem) => {
  if (!window.confirm(`Delete "${doc.title}"?`)) return;

  setDocuments((current) =>
    current.filter((item) => item.id !== doc.id)
  );

  localStorage.removeItem(`collabspace-content-${doc.id}`);
  localStorage.removeItem(`collabspace-title-${doc.id}`);
};
  if (selectedDocument) {
    if (selectedDocument.type === "Whiteboard") {
      return (
        <main className="editor-placeholder">
          <button
            className="button button-secondary"
            onClick={() => setSelectedDocument(null)}
          >
            ← Back to workspace
          </button>
          <h1>{selectedDocument.title}</h1>
          <p>
            The whiteboard canvas is planned for a later phase. Your whiteboard
            card is saved in this browser.
          </p>
        </main>
      );
    }

    return (
      <DocumentEditor
        key={selectedDocument.id}
        documentId={selectedDocument.id}
        initialTitle={selectedDocument.title}
        onBack={() => setSelectedDocument(null)}
        onTitleChange={(title) =>
          updateDocumentTitle(selectedDocument.id, title)
        }
      />
    );
  }

  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Recent", icon: Clock3 },
    { label: "Documents", icon: FileText },
    { label: "Whiteboards", icon: PencilRuler },
    { label: "Shared with me", icon: Users },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setActiveNav("Overview");
            setSearch("");
            setMessage("");
          }}
        >
          <span className="brand-mark">
            <Share2 size={21} />
          </span>
          <span>
            Collab<span className="brand-accent">Space</span>
          </span>
        </a>

        <button
          className="workspace-switcher"
          onClick={() =>
            setMessage("Workspace switching will be added in a later phase.")
          }
        >
          <span className="workspace-avatar">C</span>
          <span className="workspace-copy">
            <strong>My Workspace</strong>
            <small>Personal workspace</small>
          </span>
          <ChevronDown size={16} />
        </button>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              onClick={() => {
                if (label === "Shared with me") {
                  setMessage("Shared workspaces will be connected later.");
                  return;
                }

                setActiveNav(label);
                setSearch("");
                setMessage("");
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <span className="upgrade-icon">
              <WandSparkles size={18} />
            </span>
            <strong>Made for teamwork</strong>
            <p>Your documents and ideas, together in one place.</p>
          </div>

          <button
            className="nav-item"
            onClick={() => setMessage("Settings will be implemented later.")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <div className="profile-row">
            <div className="profile-avatar">H</div>
            <div className="profile-copy">
              <strong>Hardik</strong>
              <small>Workspace owner</small>
            </div>
            <MoreHorizontal size={19} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activeNav}</strong>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search documents..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>/</kbd>
            </label>

            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() =>
                setMessage(
                  "You're all caught up. Notifications will be added later."
                )
              }
            >
              <Bell size={19} />
              <span className="notification-dot" />
            </button>

            <div className="topbar-avatar">H</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">YOUR CREATIVE WORKSPACE</p>
              <h1>
                Good to have you here, Hardik <span>✦</span>
              </h1>
              <p className="welcome-description">
                Bring your documents, ideas and team collaboration together.
              </p>
            </div>

            <div className="create-actions">
              <button
                className="button button-secondary"
                onClick={() => createDocument("Whiteboard")}
              >
                <PencilRuler size={17} /> New whiteboard
              </button>
              <button
                className="button button-primary"
                onClick={() => createDocument("Document")}
              >
                <Plus size={18} /> Create document
              </button>
            </div>
          </section>

          {message && (
            <div className="notice" role="status">
              <span>{message}</span>
              <button
                aria-label="Dismiss message"
                onClick={() => setMessage("")}
              >
                ×
              </button>
            </div>
          )}

          <section className="summary-grid">
            <article className="summary-card">
              <div className="summary-icon purple-icon">
                <FileText size={20} />
              </div>
              <span>Total documents</span>
              <strong>
                {documents.filter((doc) => doc.type === "Document").length}
              </strong>
              <small>Your document collection</small>
            </article>

            <article className="summary-card">
              <div className="summary-icon orange-icon">
                <PencilRuler size={20} />
              </div>
              <span>Whiteboards</span>
              <strong>
                {documents.filter((doc) => doc.type === "Whiteboard").length}
              </strong>
              <small>Your visual workspaces</small>
            </article>

            <article className="summary-card">
              <div className="summary-icon green-icon">
                <Activity size={20} />
              </div>
              <span>Collaboration</span>
              <strong>Coming soon</strong>
              <small>Real-time sync is a later phase</small>
            </article>
          </section>

          <section className="documents-section">
            <div className="section-heading">
              <div>
                <h2>
                  {activeNav === "Overview" || activeNav === "Recent"
                    ? "Your workspace"
                    : activeNav}
                </h2>
                <p>Pick up where you left off.</p>
              </div>

              <button
                className="text-button"
                onClick={() => {
                  setActiveNav("Overview");
                  setSearch("");
                  setMessage("");
                }}
              >
                View all <span>→</span>
              </button>
            </div>

            <div className="document-grid">
              {filteredDocuments.map((doc) => (
                <article className="document-card" key={doc.id}>
                  <button
                    className={`document-preview preview-${doc.color}`}
                    onClick={() => setSelectedDocument(doc)}
                    aria-label={`Open ${doc.title}`}
                  >
                    <div className="preview-top">
                      <span className="preview-file">
                        {doc.type === "Document" ? (
                          <FileText size={18} />
                        ) : (
                          <PencilRuler size={18} />
                        )}
                      </span>
                      <MoreHorizontal size={19} />
                    </div>

                    {doc.type === "Document" ? (
                      <div className="preview-lines">
                        <i className="line-title" />
                        <i />
                        <i />
                        <i className="line-short" />
                      </div>
                    ) : (
                      <div className="preview-board">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                  </button>

                  <div className="document-info">
                   <div className="document-title-row">
                      <div>
                        {editingDocumentId === doc.id ? (
                          <div>
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRename(doc);
                                if (e.key === "Escape") setEditingDocumentId(null);
                              }}
                              autoFocus
                              aria-label="Document title"
                            />

                            <button onClick={() => saveRename(doc)} title="Save">
                              <Check size={16} />
                            </button>

                            <button
                              onClick={() => setEditingDocumentId(null)}
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <h3>{doc.title}</h3>

                            <button onClick={() => startRename(doc)} title="Rename">
                              <Pencil size={16} />
                            </button>

                            <button
                              onClick={() => deleteDocument(doc)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}

                        <p>
                          {doc.type} · {doc.updated}
                        </p>
                      </div>

                      <div className="member-stack" aria-label="Workspace owner">
                        {doc.members.map((member, index) => (
                          <span key={`${doc.id}-${index}`}>{member}</span>
                        ))}
                      </div>
                    </div>
                    <div className="document-footer">
                      <span
                        className={`type-badge ${
                          doc.type === "Document" ? "doc-badge" : "board-badge"
                        }`}
                      >
                        {doc.type === "Document" ? "DOC" : "BOARD"}
                      </span>
                      <FolderOpen size={16} />
                    </div>
                  </div>
                </article>
              ))}

              {filteredDocuments.length === 0 && (
                <div className="empty-state">
                  <Search size={26} />
                  <h3>No matching items</h3>
                  <p>Try another search or create a new document.</p>
                  <button
                    className="button button-primary"
                    onClick={() => createDocument("Document")}
                  >
                    <Plus size={17} /> Create document
                  </button>
                </div>
              )}
            </div>
          </section>

          <footer className="page-footer">
            <span>CollabSpace · Semester 5 Project</span>
            <span>
              <span className="status-dot" /> Frontend prototype
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
