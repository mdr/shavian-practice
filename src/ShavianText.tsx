import { classOf, CLASS_COLOR } from "./letterClass.ts";

interface ShavianTextProps {
  text: string;
  /** Colour each glyph by its height-class. */
  colorByClass?: boolean;
  style?: React.CSSProperties;
}

/** Renders Shavian, optionally colouring each glyph by tall/deep/short class. */
export default function ShavianText({
  text,
  colorByClass = true,
  style,
}: ShavianTextProps) {
  return (
    <span className="shavian" style={style}>
      {Array.from(text).map((ch, i) =>
        colorByClass ? (
          <span key={i} style={{ color: CLASS_COLOR[classOf(ch)] }}>
            {ch}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  );
}
