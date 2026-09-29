import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

interface OgCardProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  initials?: string;
  accent?: string;
  footer?: string;
}

/**
 * Shared OG card renderer. Person/relationship images call this with their
 * own data, so a new card type is one small `opengraph-image.tsx` file.
 */
export function renderOgCard({ eyebrow, title, subtitle, initials, accent = "#f5b83d", footer }: OgCardProps) {
  // Decorative network: fixed points so the image is deterministic.
  const dots = [
    [980, 110, 10], [1090, 190, 7], [900, 240, 6], [1040, 330, 9], [910, 400, 5], [1110, 420, 6], [820, 140, 4],
  ] as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#08080a",
          backgroundImage: "radial-gradient(circle at 80% 40%, rgba(245,184,61,0.10), transparent 55%)",
          color: "#ededf0",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <svg width="1200" height="630" style={{ position: "absolute", inset: 0 }}>
          {dots.slice(1).map(([x, y], i) => (
            <line key={i} x1={dots[i][0]} y1={dots[i][1]} x2={x} y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          ))}
          {dots.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#101013" stroke={i === 0 ? accent : "rgba(255,255,255,0.35)"} strokeWidth="2" />
          ))}
        </svg>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#71717a" }}>
          {eyebrow}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {initials && (
            <div
              style={{
                width: 150,
                height: 150,
                borderRadius: 999,
                border: `4px solid ${accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 60,
                fontWeight: 700,
                color: accent,
                background: "#101013",
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
            <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>{title}</div>
            {subtitle && <div style={{ marginTop: 16, fontSize: 32, color: "#a1a1aa" }}>{subtitle}</div>}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#71717a" }}>
          <span>Czechowickie Żule — mapa powiązań</span>
          <span>{footer ?? "czechowickiezule.pl"}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
