
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Eraser,
  Trash2,
} from "lucide-react";

import {
  getDocumentById,
  updateDocument,
} from "./services/documentService";

type WhiteboardProps = {
  documentId: string;
  initialTitle: string;
  onTitleChange: (title: string) => void;
  onBack: () => void;
};

export default function Whiteboard({
  documentId,
  initialTitle,
  onTitleChange,
  onBack,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isDrawingRef = useRef(false);
  const loadedRef = useRef(false);

  const canvasSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState(initialTitle);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#6558df");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("Loading whiteboard...");
  const [loadError, setLoadError] = useState("");

  // ── Load whiteboard from MongoDB ──────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function loadWhiteboard() {
      loadedRef.current = false;
      setLoading(true);
      setLoadError("");
      setSaveStatus("Loading whiteboard...");

      try {
        const document = await getDocumentById(documentId);

        if (cancelled) return;

        setTitle(document.title);
        onTitleChange(document.title);

        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context) {
          throw new Error("Canvas could not be initialized.");
        }

        context.clearRect(0, 0, canvas.width, canvas.height);

        if (document.content) {
          const image = new Image();

          image.onload = () => {
            if (cancelled) return;

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            loadedRef.current = true;
            setLoading(false);
            setSaveStatus("Saved to cloud");
          };

          image.onerror = () => {
            if (cancelled) return;

            loadedRef.current = true;
            setLoading(false);
            setLoadError("Could not load the saved drawing.");
            setSaveStatus("Load failed");
          };

          image.src = document.content;
        } else {
          loadedRef.current = true;
          setLoading(false);
          setSaveStatus("Saved to cloud");
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Whiteboard loading failed:", error);

        setLoadError(
          "Could not load this whiteboard. Check your internet connection and try again."
        );

        setSaveStatus("Load failed");
        setLoading(false);
      }
    }

    loadWhiteboard();

    return () => {
      cancelled = true;
      loadedRef.current = false;
    };
  }, [documentId]);

  // ── Cleanup timers ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (canvasSaveTimer.current) {
        clearTimeout(canvasSaveTimer.current);
      }

      if (titleSaveTimer.current) {
        clearTimeout(titleSaveTimer.current);
      }
    };
  }, []);

  // ── Get pointer coordinates ──────────────────────────────────────────────

  function getPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  // ── Save canvas to MongoDB ─────────────────────────────────────────────────

  function scheduleCanvasSave() {
    if (!loadedRef.current) return;

    if (canvasSaveTimer.current) {
      clearTimeout(canvasSaveTimer.current);
    }

    setSaveStatus("Unsaved changes");

    canvasSaveTimer.current = setTimeout(async () => {
      const canvas = canvasRef.current;

      if (!canvas || !loadedRef.current) return;

      try {
        setSaveStatus("Saving to cloud...");

        const imageData = canvas.toDataURL("image/png");

        await updateDocument(documentId, {
          content: imageData,
        });

        setSaveStatus("Saved to cloud");
      } catch (error) {
        console.error("Whiteboard save failed:", error);
        setSaveStatus("Save failed");
      }
    }, 700);
  }

  // ── Start drawing ─────────────────────────────────────────────────────────

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!loadedRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    canvas.setPointerCapture(event.pointerId);

    const { x, y } = getPosition(event);

    context.beginPath();
    context.moveTo(x, y);

    context.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    context.lineWidth = tool === "eraser" ? 22 : 3;
    context.lineCap = "round";
    context.lineJoin = "round";

    isDrawingRef.current = true;
  }

  // ── Continue drawing ──────────────────────────────────────────────────────

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current || !loadedRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const { x, y } = getPosition(event);

    context.lineTo(x, y);
    context.stroke();
  }

  // ── Finish drawing ────────────────────────────────────────────────────────

  function stopDrawing() {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;
    scheduleCanvasSave();
  }

  // ── Clear whiteboard ──────────────────────────────────────────────────────

  function clearBoard() {
    if (!loadedRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    scheduleCanvasSave();
  }

  // ── Save title to MongoDB ──────────────────────────────────────────────────

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    onTitleChange(newTitle);

    if (titleSaveTimer.current) {
      clearTimeout(titleSaveTimer.current);
    }

    titleSaveTimer.current = setTimeout(async () => {
      const trimmedTitle = newTitle.trim();

      if (!trimmedTitle) return;

      try {
        await updateDocument(documentId, {
          title: trimmedTitle,
        });
      } catch (error) {
        console.error("Whiteboard title save failed:", error);
      }
    }, 800);
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <main className="whiteboard-page">
      <header className="whiteboard-header">
        <button onClick={onBack} className="whiteboard-back">
          <ArrowLeft size={17} />
          Back
        </button>

        <div className="whiteboard-heading">
          <input
            className="whiteboard-title-input"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            aria-label="Whiteboard title"
            placeholder="Untitled Whiteboard"
            disabled={loading}
          />

          <p>Personal workspace</p>
        </div>

        <span className="whiteboard-save-status">
          {saveStatus}
        </span>
      </header>

      <section className="whiteboard-workspace">
        <div className="whiteboard-toolbar">
          <button
            className={tool === "pen" ? "selected" : ""}
            onClick={() => setTool("pen")}
            title="Pen"
            disabled={loading}
          >
            <Pencil size={17} />
            Pen
          </button>

          <button
            className={tool === "eraser" ? "selected" : ""}
            onClick={() => setTool("eraser")}
            title="Eraser"
            disabled={loading}
          >
            <Eraser size={17} />
            Eraser
          </button>

          <label className="whiteboard-color">
            Color
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              disabled={tool === "eraser" || loading}
            />
          </label>

          <button
            onClick={clearBoard}
            title="Clear whiteboard"
            disabled={loading}
          >
            <Trash2 size={17} />
            Clear
          </button>
        </div>

        {loading && (
          <div className="whiteboard-loading">
            Loading your whiteboard from the cloud...
          </div>
        )}

        {loadError && (
          <div className="notice" role="alert">
            {loadError}
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={1200}
          height={700}
          className="whiteboard-canvas"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </section>
    </main>
  );
}
