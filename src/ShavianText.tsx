import { classOf, CLASS_COLOR } from "./letterClass.ts";
import { useColour } from "./colour.ts";

interface ShavianTextProps {
  text: string;
  /** Colour each glyph by its height-class (only when the global setting is on). */
  colorByClass?: boolean;
  style?: React.CSSProperties;
}

/** Renders Shavian, colouring each glyph by tall/deep/short class when enabled. */
export default function ShavianText({
  text,
  colorByClass = true,
  style,
}: ShavianTextProps) {
  const colour = useColour() && colorByClass;
  return (
    <span className="shavian" style={style}>
      {Array.from(text).map((ch, i) => (
        <span key={i} style={colour ? { color: CLASS_COLOR[classOf(ch)] } : undefined}>
          {ch}
        </span>
      ))}
    </span>
  );
}
