"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";

interface RippleSpec {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function useRipple() {
  const [ripples, setRipples] = useState<RippleSpec[]>([]);
  const counter = useRef(0);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = ++counter.current;
    setRipples((rs) => [...rs, { id, x, y, size }]);
    window.setTimeout(() => {
      setRipples((rs) => rs.filter((r) => r.id !== id));
    }, 650);
  }, []);

  const ripplesNode = (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
          }}
        />
      ))}
    </>
  );

  return { onPointerDown, ripplesNode };
}
