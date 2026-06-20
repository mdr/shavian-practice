import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { getStroke } from "perfect-freehand";
import { classOf, CLASS_COLOR } from "./letterClass.ts";

export interface InkCanvasHandle {
  undo: () => void;
  clear: () => void;
  isEmpty: () => boolean;
}

interface InkCanvasProps {
  /** Accept finger/touch input in addition to the Pencil. Default false = pen-only palm rejection. */
  allowTouch?: boolean;
  /** Faint Shavian text to trace over. */
  ghost?: string;
  /** Tile the ghost across the row (worksheet style) rather than drawing it once. */
  ghostRepeat?: boolean;
  /** Fired when a stroke starts on this canvas (used to target a shared Undo). */
  onActive?: () => void;
}

type Point = [x: number, y: number, pressure: number];

const STROKE_OPTIONS = {
  size: 7,
  thinning: 0.6,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: false, // we have a real Apple Pencil pressure signal
};

const SHAVIAN_FONT = '"Noto Sans Shavian"';

let fontPromise: Promise<unknown> | null = null;
function ensureFont(): Promise<unknown> {
  if (!fontPromise) {
    fontPromise = document.fonts
      ? document.fonts.load(`64px ${SHAVIAN_FONT}`)
      : Promise.resolve();
  }
  return fontPromise;
}

function outlineToPath2D(outline: number[][]): Path2D {
  const path = new Path2D();
  if (outline.length === 0) return path;
  path.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    path.lineTo(outline[i][0], outline[i][1]);
  }
  path.closePath();
  return path;
}

/**
 * A ruled writing surface that captures Apple Pencil ink.
 *
 * Three guidelines (faint ascender ceiling, dashed x-height, solid baseline)
 * read as clean ruled paper when stacked; the unruled space below the baseline
 * is the descender zone for deep letters. An optional `ghost` renders faint
 * Shavian to trace over, coloured per glyph by tall/deep/short class.
 */
const InkCanvas = forwardRef<InkCanvasHandle, InkCanvasProps>(
  ({ allowTouch = false, ghost, ghostRepeat = false, onActive }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Point[][]>([]);
    const currentRef = useRef<Point[] | null>(null);
    const sizeRef = useRef({ w: 0, h: 0 });
    const [fontReady, setFontReady] = useState(false);

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      // --- guideline + glyph metrics ---
      // The baseline is fixed; the x-height and tall-ceiling lines are placed
      // from the FONT's real metrics (measured below) so they actually coincide
      // with where short and tall glyphs sit — and the ghost is sized to match.
      const baseline = h * 0.72;
      let top = h * 0.22; // fallback until the font has loaded
      let xLine = h * 0.46;
      let deep = h * 0.92;
      let fontSize = (baseline - top) * 1.35;

      if (fontReady) {
        const REF = 100;
        ctx.font = `${REF}px ${SHAVIAN_FONT}`;
        const ascent = (s: string) =>
          Math.max(
            ...Array.from(s).map(
              (g) => ctx.measureText(g).actualBoundingBoxAscent,
            ),
          );
        const descent = (s: string) =>
          Math.max(
            ...Array.from(s).map(
              (g) => ctx.measureText(g).actualBoundingBoxDescent,
            ),
          );
        const tallR = ascent("𐑑𐑒𐑓𐑕") / REF; // tall-letter ascent ratio
        const shortR = ascent("𐑩𐑦𐑧𐑪𐑨") / REF; // x-height ratio
        const deepR = descent("𐑟𐑛𐑜𐑞") / REF; // deep-letter descent ratio
        if (
          Number.isFinite(tallR) &&
          Number.isFinite(shortR) &&
          Number.isFinite(deepR) &&
          tallR > 0
        ) {
          const above = baseline; // room above the baseline
          const below = h - baseline; // descender room below
          // largest size that keeps tall letters above the row and deep letters
          // inside it, with a little breathing room
          fontSize = Math.min(above / tallR, below / deepR) * 0.9;
          top = baseline - fontSize * tallR;
          xLine = baseline - fontSize * shortR;
          deep = baseline + fontSize * deepR;
        }
      }

      const styles = getComputedStyle(document.documentElement);
      const rule = styles.getPropertyValue("--rule").trim() || "#c8d8e8";
      const ruleStrong =
        styles.getPropertyValue("--rule-strong").trim() || "#9ab4d0";

      ctx.lineWidth = 1;
      for (const [y, strong] of [
        [top, false],
        [xLine, false],
        [baseline, true],
        [deep, false],
      ] as const) {
        ctx.beginPath();
        ctx.strokeStyle = strong ? ruleStrong : rule;
        ctx.setLineDash(strong ? [] : [4, 6]);
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // --- ghost (trace target), coloured per glyph by letter-class ---
      if (ghost && fontReady) {
        ctx.font = `${fontSize}px ${SHAVIAN_FONT}`;
        ctx.textBaseline = "alphabetic";
        ctx.globalAlpha = 0.32;
        const margin = w * 0.04;
        const glyphs = Array.from(ghost);

        const drawWord = (startX: number) => {
          let x = startX;
          for (const g of glyphs) {
            ctx.fillStyle = CLASS_COLOR[classOf(g)];
            ctx.fillText(g, x, baseline);
            x += ctx.measureText(g).width;
          }
        };

        const gap = ctx.measureText(" ").width;
        const unit = ctx.measureText(ghost).width + gap;
        if (ghostRepeat) {
          for (let x = margin; x + unit - gap < w; x += unit) drawWord(x);
        } else {
          drawWord(margin);
        }
        ctx.globalAlpha = 1;
      }

      // --- ink ---
      const ink = styles.getPropertyValue("--ink").trim() || "#1a1a1a";
      ctx.fillStyle = ink;
      const all = currentRef.current
        ? [...strokesRef.current, currentRef.current]
        : strokesRef.current;
      for (const stroke of all) {
        ctx.fill(outlineToPath2D(getStroke(stroke, STROKE_OPTIONS)));
      }
    }, [ghost, ghostRepeat, fontReady]);

    const resize = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }, [draw]);

    useLayoutEffect(() => {
      resize();
      const ro = new ResizeObserver(resize);
      if (canvasRef.current) ro.observe(canvasRef.current);
      return () => ro.disconnect();
    }, [resize]);

    const doUndo = useCallback(() => {
      strokesRef.current.pop();
      draw();
    }, [draw]);

    useEffect(() => {
      ensureFont().then(() => setFontReady(true));
    }, []);

    // Two-finger tap = undo (the iPadOS convention). Tracked via POINTER events
    // counting only finger ("touch") pointers — never the Pencil. (The Pencil
    // also emits touch events, so a TouchEvent-based count would spuriously read
    // 2 between two quick pen strokes and cancel the second one.)
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const fingers = new Set<number>();
      let start = 0;
      let fired = false;
      const onDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch") return;
        fingers.add(e.pointerId);
        if (fingers.size === 2) {
          start = performance.now();
          fired = false;
          currentRef.current = null; // cancel any nascent finger stroke
          draw();
        }
      };
      const onUp = (e: PointerEvent) => {
        if (e.pointerType !== "touch") return;
        const had2 = fingers.size === 2;
        fingers.delete(e.pointerId);
        if (had2 && !fired && performance.now() - start < 400) {
          fired = true;
          doUndo();
        }
      };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      return () => {
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
      };
    }, [doUndo, draw]);

    useImperativeHandle(ref, () => ({
      undo: doUndo,
      clear: () => {
        strokesRef.current = [];
        currentRef.current = null;
        draw();
      },
      isEmpty: () =>
        strokesRef.current.length === 0 && currentRef.current === null,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Pen always draws; mouse always draws (it can't leave palm marks).
      // Touch is gated behind the finger toggle so a resting palm is rejected.
      const accept = (e: PointerEvent) =>
        e.pointerType === "pen" ||
        e.pointerType === "mouse" ||
        (allowTouch && e.pointerType === "touch");

      const toPoint = (e: PointerEvent): Point => {
        const rect = canvas.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5];
      };

      const onDown = (e: PointerEvent) => {
        if (!accept(e)) return;
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        onActive?.();
        currentRef.current = [toPoint(e)];
        draw();
      };

      const onMove = (e: PointerEvent) => {
        if (!currentRef.current || !accept(e)) return;
        e.preventDefault();
        // Coalesced events recover the Pencil's full high-frequency sample stream
        // that Safari otherwise batches down to one point per frame.
        const events = e.getCoalescedEvents?.() ?? [e];
        for (const ev of events) currentRef.current.push(toPoint(ev));
        draw();
      };

      const onUp = (e: PointerEvent) => {
        if (!currentRef.current || !accept(e)) return;
        e.preventDefault();
        if (currentRef.current.length > 0) {
          strokesRef.current.push(currentRef.current);
        }
        currentRef.current = null;
        draw();
      };

      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      return () => {
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
      };
    }, [allowTouch, draw, onActive]);

    return (
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none",
          display: "block",
        }}
      />
    );
  },
);

InkCanvas.displayName = "InkCanvas";

export default InkCanvas;
