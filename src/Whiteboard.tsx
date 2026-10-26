import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, Eraser, RotateCcw, Trash2 } from "lucide-react";

type WhiteboardProps = {
  documentId: number;
  onBack: () => void;
};
export default function Whiteboard({
  documentId,
  onBack,
}: WhiteboardProps)  {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storageKey = `collabspace-whiteboard-${documentId}`;
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#6558df");
  const [drawing, setDrawing] = useState(false);

  function getPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
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

    setDrawing(true);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const { x, y } = getPosition(event);
    context.lineTo(x, y);
    context.stroke();
  }

    function saveDrawing() {
    const canvas = canvasRef.current;
    if (!canvas) return;

         try {
            localStorage.setItem(storageKey, canvas.toDataURL("image/png"));
        } catch {
            console.error("Could not save whiteboard drawing.");
        }
    }

    function stopDrawing() {
        setDrawing(false);
        saveDrawing();
    }

    function clearBoard() {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (canvas && context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            localStorage.removeItem(storageKey);
        }
    }
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        const savedDrawing = localStorage.getItem(storageKey);

        if (!canvas || !context || !savedDrawing) return;

        const image = new Image();

        image.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
        };

        image.src = savedDrawing;
    }, [storageKey]);
  return (
    <main className="whiteboard-page">
      <header className="whiteboard-header">
        <button onClick={onBack} className="whiteboard-back">
          <ArrowLeft size={17} /> Back
        </button>

        <div className="whiteboard-heading">
          <h2>Untitled Whiteboard</h2>
          <p>Personal workspace</p>
        </div>
      </header>

      <section className="whiteboard-workspace">
        <div className="whiteboard-toolbar">
          <button
            className={tool === "pen" ? "selected" : ""}
            onClick={() => setTool("pen")}
            title="Pen"
          >
            <Pencil size={17} /> Pen
          </button>

          <button
            className={tool === "eraser" ? "selected" : ""}
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <Eraser size={17} /> Eraser
          </button>

          <label className="whiteboard-color">
            Color
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              disabled={tool === "eraser"}
            />
          </label>

          <button onClick={clearBoard} title="Clear whiteboard">
            <Trash2 size={17} /> Clear
          </button>
        </div>

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
