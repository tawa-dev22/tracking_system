import { useMemo } from "react";

export default function Avatar({ name, src, size = 36 }) {
  const initials = useMemo(() => {
    const n = String(name || "").trim();
    if (!n) return "?";
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join("");
  }, [name]);

  const style = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name} avatar` : "avatar"}
        style={style}
        className="rounded-full object-cover border border-white/10 bg-white/5"
      />
    );
  }

  return (
    <div
      style={style}
      className="rounded-full grid place-items-center text-xs font-bold border border-white/10 bg-white/10 text-white"
      aria-label={name ? `${name} avatar` : "avatar"}
    >
      {initials}
    </div>
  );
}

