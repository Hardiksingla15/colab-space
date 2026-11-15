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

type DocumentItem = {
  id: number;
  title: string;
  type: "Document" | "Whiteboard";
  updated: string;
  color: string;
  members: string[];
};

const STORAGE_KEY = "collabspace-documents";
const TOKEN_KEY = "collabspace-token";

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
  // ── Auth state ─────────────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem(TOKEN_KEY)
  );
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [backendError, setBackendError] = useState("");

  // ── Document / UI state ────────────────────────────────────────────────────
  const [activeNav, setActiveNav] = useState("Overview");
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>(loadDocuments);
  const [message, setMessage] = useState("");
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentItem | null>(null);

  // ── Persist documents to localStorage ─────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch {
      setMessage("Your browser could not save the document list.");
    }
  }, [documents]);

  // ── Session verification ───────────────────────────────────────────────────
  //
  // HOW IT WORKS
  // ------------
  // `runVerification` is a stable async function (useCallback with [] deps).
  // It reads sessionStorage directly so it has no React state dependencies.
  //
  // WHY NOT [token] AS THE DEPENDENCY?
  // The previous implementation used `useEffect(..., [token])` with a
  // `verifyingRef` guard to prevent re-entry. The guard worked by returning
  // early when `verifyingRef.current === true`. But React StrictMode (dev)
  // fires every effect twice: the cleanup of the first run sets `cancelled =
  // true` but does NOT reset `verifyingRef`, so the second run sees the ref
  // as `true` and returns immediately — without ever calling
  // `setAuthChecked(true)`. The spinner then stayed on screen forever.
  //
  // FIX: verify once at mount using a stable callback. Login/logout update
  // auth state directly — no re-verification needed.
  //
  // STRICT-MODE SAFETY
  // In dev, StrictMode fires the mount effect twice (mount → unmount → mount).
  // The `verifyingRef` guards against a duplicate concurrent fetch. If the
  // first run's fetch is still in-flight when the second mount fires, the
  // second call returns immediately and the first completes normally.
  //
  // TIMEOUT / ABORT
  // An 8-second AbortController timeout prevents a stalled server from leaving
  // the spinner on screen indefinitely.
  const verifyingRef = useRef(false);

  const runVerification = useCallback(async () => {
    // Block concurrent calls (React StrictMode double-fire in dev).
    if (verifyingRef.current) return;
    verifyingRef.current = true;

    setBackendError("");
    // Note: do NOT set authChecked(false) here on retry — the Retry button
    // handling below does that before calling this function.

    const savedToken = sessionStorage.getItem(TOKEN_KEY);

    if (!savedToken) {
      // No stored token → show login immediately.
      setToken(null);
      setCurrentUser(null);
      setAuthChecked(true);
      verifyingRef.current = false;
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        // Backend shape: { message: string, user: { id, name, email } }
        setCurrentUser(data.user ?? null);
        setToken(savedToken);
      } else {
        // 401 / 403 — token invalid or expired; force re-login.
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setCurrentUser(null);
      }
    } catch (err) {
      // Network failure or timeout. Keep the stored token so the user
      // doesn't lose their session just because the server was briefly down.
      const isTimeout = (err as Error).name === "AbortError";
      setBackendError(
        isTimeout
          ? "Request timed out. Make sure the CollabSpace server is running on port 5000."
          : "Cannot connect to the CollabSpace backend. Make sure the server is running on port 5000."
      );
    } finally {
      clearTimeout(timeoutId);
      // This MUST run in every code path — it is the only place authChecked
      // is set to true for the initial verification.
      setAuthChecked(true);
      verifyingRef.current = false;
    }
  }, []); // no state deps — reads sessionStorage directly

  // Run once on mount only.
  useEffect(() => {
    runVerification();
  }, [runVerification]);

  // ── Auth callbacks ─────────────────────────────────────────────────────────
  function handleLogin(newToken: string, user: { name: string; email: string }) {
    sessionStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setCurrentUser(user);
    setBackendError("");
    // authChecked is already true at this point (user was on the login screen).
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
    setBackendError("");
    // Keep authChecked as true — no need to re-verify, just show login.
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
        <p>Checking your session…</p>
      </div>
    );
  }

  // ── Backend unreachable ────────────────────────────────────────────────────
  if (backendError && !currentUser) {
    return (
      <div className="auth-loading">
        <p className="auth-backend-error">{backendError}</p>
        <button
          className="button button-primary"
          onClick={() => {
            // Reset the guard and re-show the spinner before retrying.
            verifyingRef.current = false;
            setAuthChecked(false);
            // runVerification reads sessionStorage and sets authChecked(true)
            // when done — whether success, failure, or timeout.
            runVerification();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!token || !currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  // ── Document / Whiteboard editor ───────────────────────────────────────────
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

  // ── Derived values & helpers ───────────────────────────────────────────────
  const userInitial = currentUser.name.charAt(0).toUpperCase();

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
      members: [userInitial],
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
        doc.id === id ? { ...doc, title, updated: "Edited just now" } : doc
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
    setDocuments((current) => current.filter((item) => item.id !== doc.id));
    localStorage.removeItem(`collabspace-content-${doc.id}`);
    localStorage.removeItem(`collabspace-title-${doc.id}`);
  };

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
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === doc.id ? null : doc.id);
                        }}
                        aria-label="Document options"
                      >
                        <MoreHorizontal size={19} />
                      </button>
                    </div>

                    {openMenuId === doc.id && (
                      <div
                        className="document-menu"
                        onClick={(e) => e.stopPropagation()}
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
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRename(doc);
                                if (e.key === "Escape")
                                  setEditingDocumentId(null);
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
