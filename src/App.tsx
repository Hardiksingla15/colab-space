
import { useCallback, useEffect, useRef, useState } from "react";

import Auth from "./auth";
import Whiteboard from "./Whiteboard";
import {
  Activity,
  Bell,
  ChevronDown,
  Clock3,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
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

import {
  getDocuments,
  createDocument as createCloudDocument,
  updateDocument as updateCloudDocument,
  deleteDocument as deleteCloudDocument,
  type CloudDocument,
} from "./services/documentService";

// ── Types ────────────────────────────────────────────────────────────────────

type DocumentItem = {
  id: string;
  title: string;
  type: "Document" | "Whiteboard";
  updated: string;
  color: string;
  members: string[];
};

type User = {
  name: string;
  email: string;
};

const TOKEN_KEY = "collabspace-token";

// Use localhost during development and the deployed backend URL in production.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

// Convert MongoDB document data into the format used by the dashboard.
function mapCloudDocument(
  document: CloudDocument,
  userInitial: string
): DocumentItem {
  return {
    id: document._id,
    title: document.title,
    type: document.type,
    updated: document.updatedAt
      ? `Updated ${new Date(document.updatedAt).toLocaleString()}`
      : "Recently updated",
    color: document.type === "Document" ? "blue" : "orange",
    members: [userInitial],
  };
}

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  // ── Authentication state ──────────────────────────────────────────────────

  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_KEY)
  );

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [backendError, setBackendError] = useState("");

  const verifyingRef = useRef(false);

  // ── Dashboard state ───────────────────────────────────────────────────────

  const [activeNav, setActiveNav] = useState("Overview");
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [selectedDocument, setSelectedDocument] =
    useState<DocumentItem | null>(null);

  // ── Session verification ──────────────────────────────────────────────────

  const runVerification = useCallback(async () => {
    if (verifyingRef.current) return;

    verifyingRef.current = true;
    setBackendError("");

    const savedToken = sessionStorage.getItem(TOKEN_KEY);

    if (!savedToken) {
      setToken(null);
      setCurrentUser(null);
      setAuthChecked(true);
      verifyingRef.current = false;
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();

        setCurrentUser(data.user ?? null);
        setToken(savedToken);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setCurrentUser(null);
      }
    } catch (error) {
      const isTimeout = (error as Error).name === "AbortError";

      setBackendError(
        isTimeout
          ? "Request timed out. Make sure the CollabSpace backend is running."
          : "Cannot connect to the CollabSpace backend. Check whether the server is running."
      );
    } finally {
      clearTimeout(timeoutId);
      setAuthChecked(true);
      verifyingRef.current = false;
    }
  }, []);

  useEffect(() => {
    runVerification();
  }, [runVerification]);

  // ── Load documents from MongoDB ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function loadCloudDocuments() {
      if (!token || !currentUser) {
        setDocuments([]);
        setDocumentsLoading(false);
        return;
      }

      setDocumentsLoading(true);

      try {
        const cloudDocuments = await getDocuments();

        if (cancelled) return;

        const initial = currentUser.name.charAt(0).toUpperCase();

        setDocuments(
          cloudDocuments.map((document) =>
            mapCloudDocument(document, initial)
          )
        );
      } catch (error) {
        if (cancelled) return;

        console.error("Failed to load documents:", error);
        setMessage(
          "Could not load your documents from the server. Please refresh and try again."
        );
      } finally {
        if (!cancelled) {
          setDocumentsLoading(false);
        }
      }
    }

    loadCloudDocuments();

    return () => {
      cancelled = true;
    };
  }, [token, currentUser]);

  // ── Authentication callbacks ──────────────────────────────────────────────

  function handleLogin(newToken: string, user: User) {
    sessionStorage.setItem(TOKEN_KEY, newToken);

    setToken(newToken);
    setCurrentUser(user);
    setBackendError("");
    setMessage("");
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);

    setToken(null);
    setCurrentUser(null);
    setDocuments([]);
    setSelectedDocument(null);
    setBackendError("");
    setMessage("");
    setSearch("");
    setActiveNav("Overview");
  }

  // ── User information ──────────────────────────────────────────────────────

  const userInitial = currentUser
    ? currentUser.name.charAt(0).toUpperCase()
    : "";

  // ── Update document title in dashboard state ──────────────────────────────
  // DocumentEditor handles its own cloud save.
  // This function only updates the visible dashboard title.

  function updateDocumentTitle(id: string, title: string) {
    setDocuments((current) =>
      current.map((doc) =>
        doc.id === id
          ? { ...doc, title, updated: "Edited just now" }
          : doc
      )
    );

    setSelectedDocument((current) =>
      current && current.id === id ? { ...current, title } : current
    );
  }

  // ── Create document in MongoDB ─────────────────────────────────────────────

  async function createDocument(type: "Document" | "Whiteboard") {
    const title =
      type === "Document" ? "Untitled document" : "Untitled whiteboard";

    try {
      setMessage("");

      const createdDocument = await createCloudDocument(title, type, "");

      const newDocument = mapCloudDocument(createdDocument, userInitial);

      setDocuments((current) => [newDocument, ...current]);

      setActiveNav(type === "Document" ? "Documents" : "Whiteboards");
      setSearch("");

      setMessage(`${type} created and saved to the cloud.`);
    } catch (error) {
      console.error("Document creation failed:", error);
      setMessage(`Could not create the ${type.toLowerCase()}. Please try again.`);
    }
  }

  // ── Rename document in MongoDB ────────────────────────────────────────────

  const startRename = (doc: DocumentItem) => {
    setEditingDocumentId(doc.id);
    setEditTitle(doc.title);
  };

  async function saveRename(doc: DocumentItem) {
    const title = editTitle.trim();

    if (!title) {
      setMessage("Document title cannot be empty.");
      return;
    }

    try {
      await updateCloudDocument(doc.id, { title });

      updateDocumentTitle(doc.id, title);

      setEditingDocumentId(null);
      setEditTitle("");
      setMessage("Document renamed successfully.");
    } catch (error) {
      console.error("Document rename failed:", error);
      setMessage("Could not rename the document. Please try again.");
    }
  }

  // ── Delete document from MongoDB ──────────────────────────────────────────

  async function deleteDocument(doc: DocumentItem) {
    const confirmed = window.confirm(`Delete "${doc.title}"?`);

    if (!confirmed) return;

    try {
      await deleteCloudDocument(doc.id);

      setDocuments((current) =>
        current.filter((item) => item.id !== doc.id)
      );

      if (selectedDocument?.id === doc.id) {
        setSelectedDocument(null);
      }

      setMessage("Document deleted successfully.");
    } catch (error) {
      console.error("Document deletion failed:", error);
      setMessage("Could not delete the document. Please try again.");
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (!authChecked) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
        <p>Checking your session…</p>
      </div>
    );
  }

  // ── Backend unreachable ───────────────────────────────────────────────────

  if (backendError && !currentUser) {
    return (
      <div className="auth-loading">
        <p className="auth-backend-error">{backendError}</p>

        <button
          className="button button-primary"
          onClick={() => {
            verifyingRef.current = false;
            setAuthChecked(false);
            runVerification();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Unauthenticated ───────────────────────────────────────────────────────

  if (!token || !currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  // ── Open document or whiteboard ───────────────────────────────────────────

  if (selectedDocument) {
    if (selectedDocument.type === "Whiteboard") {
      return (
        <Whiteboard
          documentId={selectedDocument.id}
          initialTitle={selectedDocument.title}
          onTitleChange={(title) =>
            updateDocumentTitle(selectedDocument.id, title)
          }
          onBack={() => setSelectedDocument(null)}
        />
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

  // ── Filter documents ──────────────────────────────────────────────────────

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

  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Recent", icon: Clock3 },
    { label: "Documents", icon: FileText },
    { label: "Whiteboards", icon: PencilRuler },
    { label: "Shared with me", icon: Users },
  ];

  // ── Dashboard UI ──────────────────────────────────────────────────────────

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

          <button
            className="nav-item"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>

          <div className="profile-row">
            <div className="profile-avatar">{userInitial}</div>

            <div className="profile-copy">
              <strong>{currentUser.name}</strong>
              <small>{currentUser.email}</small>
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

            <div className="topbar-avatar" title={currentUser.name}>
              {userInitial}
            </div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">YOUR CREATIVE WORKSPACE</p>

              <h1>
                Good to have you here, {currentUser.name} <span>✦</span>
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
              {documentsLoading ? (
                <div className="empty-state">
                  <div className="auth-loading-spinner" />
                  <h3>Loading your documents...</h3>
                  <p>Fetching your workspace from the cloud.</p>
                </div>
              ) : (
                <>
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

                          <button
                            className="more-button"
                            onClick={(event) => {
                              event.stopPropagation();

                              setOpenMenuId(
                                openMenuId === doc.id ? null : doc.id
                              );
                            }}
                            aria-label="Document options"
                          >
                            <MoreHorizontal size={19} />
                          </button>
                        </div>

                        {openMenuId === doc.id && (
                          <div
                            className="document-menu"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setSelectedDocument(doc);
                              }}
                            >
                              <FileText size={15} /> Open
                            </button>

                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                startRename(doc);
                              }}
                            >
                              <Pencil size={15} /> Rename
                            </button>

                            <button
                              className="delete-menu-item"
                              onClick={() => {
                                setOpenMenuId(null);
                                deleteDocument(doc);
                              }}
                            >
                              <Trash2 size={15} /> Delete
                            </button>
                          </div>
                        )}

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
                                  onChange={(event) =>
                                    setEditTitle(event.target.value)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      saveRename(doc);
                                    }

                                    if (event.key === "Escape") {
                                      setEditingDocumentId(null);
                                      setEditTitle("");
                                    }
                                  }}
                                  autoFocus
                                  aria-label="Document title"
                                />

                                <button
                                  onClick={() => saveRename(doc)}
                                  title="Save"
                                >
                                  <Check size={16} />
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingDocumentId(null);
                                    setEditTitle("");
                                  }}
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <h3>{doc.title}</h3>
                              </div>
                            )}

                            <p>
                              {doc.type} · {doc.updated}
                            </p>
                          </div>

                          <div
                            className="member-stack"
                            aria-label="Workspace owner"
                          >
                            {doc.members.map((member, index) => (
                              <span key={`${doc.id}-${index}`}>{member}</span>
                            ))}
                          </div>
                        </div>

                        <div className="document-footer">
                          <span
                            className={`type-badge ${
                              doc.type === "Document"
                                ? "doc-badge"
                                : "board-badge"
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

                      <p>
                        Try another search or create a new document.
                      </p>

                      <button
                        className="button button-primary"
                        onClick={() => createDocument("Document")}
                      >
                        <Plus size={17} /> Create document
                      </button>
                    </div>
                  )}
                </>
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
