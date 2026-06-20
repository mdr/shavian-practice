import { type ReactNode, useEffect, useRef } from "react";
import InkCanvas, { type InkCanvasHandle } from "./InkCanvas.tsx";

interface WritingSheetProps {
  allowTouch: boolean;
  rows?: number;
  rowHeight?: number;
  ghost?: string;
  ghostRepeat?: boolean;
  /** Change this (e.g. the item index) to wipe all rows when advancing. */
  resetKey?: unknown;
  /** Extra controls rendered on the right of the shared toolbar. */
  actions?: ReactNode;
}

export default function WritingSheet({
  allowTouch,
  rows = 6,
  rowHeight = 72,
  ghost,
  ghostRepeat,
  resetKey,
  actions,
}: WritingSheetProps) {
  const refs = useRef<(InkCanvasHandle | null)[]>([]);
  const lastActive = useRef(0);

  useEffect(() => {
    // wipe every row when the practice item changes
    refs.current.forEach((r) => r?.clear());
    lastActive.current = 0;
  }, [resetKey]);

  const undo = () => refs.current[lastActive.current]?.undo();
  const clearAll = () => refs.current.forEach((r) => r?.clear());

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem", minHeight: 0 }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "0.25rem",
        }}
      >
        {Array.from({ length: rows }, (_, idx) => (
          <div
            key={idx}
            style={{
              height: rowHeight,
              flexShrink: 0,
              background: "#fff",
              border: "1px solid var(--rule)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <InkCanvas
              ref={(h) => {
                refs.current[idx] = h;
              }}
              allowTouch={allowTouch}
              ghost={ghost}
              ghostRepeat={ghostRepeat}
              onActive={() => (lastActive.current = idx)}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={undo} title="Undo last stroke (or two-finger tap)">
          Undo
        </button>
        <button onClick={clearAll}>Clear</button>
        <span style={{ fontSize: "0.72rem", color: "#aaa", alignSelf: "center" }}>
          two-finger tap = undo
        </span>
        <span style={{ flex: 1 }} />
        {actions}
      </div>
    </div>
  );
}
