"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type MapViewClient from "./MapViewClient";

// Leaflet touches `window` on import, so it must be client-only.
const MapViewInner = dynamic(() => import("./MapViewClient"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-md border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

type MapViewProps = ComponentProps<typeof MapViewClient>;

export type { MapMarker, TrafficPoint } from "./MapViewClient";

export function MapView(props: MapViewProps) {
  return <MapViewInner {...props} />;
}
