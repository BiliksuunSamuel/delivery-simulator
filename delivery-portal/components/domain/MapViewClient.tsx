"use client";

import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { useThemeColours } from "@/lib/hooks/useThemeColours";

export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
  kind:
    | "retailer"
    | "rider-eligible"
    | "rider-ineligible"
    | "rider-active"
    | "order"
    | "order-failed"
    | "drop";
  data?: unknown;
};

/**
 * One density point. Stacked low-opacity circles read as a heatmap without
 * pulling in a heatmap plugin — good enough for "traffic of accept actions"
 * style overlays on the rider page.
 */
export type TrafficPoint = {
  latitude: number;
  longitude: number;
};

function makeIcon(kind: MapMarker["kind"], colours: ReturnType<typeof useThemeColours>) {
  const fillByKind: Record<MapMarker["kind"], string> = {
    retailer: colours["--color-brand-navy"],
    "rider-eligible": colours["--color-brand-teal"],
    "rider-ineligible": colours["--color-brand-muted"],
    "rider-active": colours["--color-brand-orange"],
    order: colours["--color-brand-orange"],
    "order-failed": colours["--color-brand-coral"],
    drop: colours["--color-brand-teal"],
  };
  const fill = fillByKind[kind];
  const ring = colours["--color-brand-navy-fg"];
  const isPin = kind === "retailer" || kind === "order" || kind === "order-failed" || kind === "drop";

  if (isPin) {
    const html = `
      <div style="position:relative;width:24px;height:34px;">
        <svg viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
          <path d="M12 0 C5 0 0 5 0 12 C0 22 12 34 12 34 C12 34 24 22 24 12 C24 5 19 0 12 0 Z" fill="${fill}" stroke="${ring}" stroke-width="1"/>
          <circle cx="12" cy="12" r="5" fill="${ring}"/>
        </svg>
      </div>`;
    return L.divIcon({
      className: "",
      html,
      iconSize: [24, 34],
      iconAnchor: [12, 34],
      popupAnchor: [0, -32],
    });
  }
  const html = `<div style="width:14px;height:14px;border-radius:50%;background:${fill};border:2px solid ${ring};box-shadow:0 0 0 1px ${fill}55, 0 1px 2px rgba(0,0,0,0.4);"></div>`;
  return L.divIcon({
    className: "",
    html,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });
}

interface MapViewClientProps {
  markers: MapMarker[];
  trafficPoints?: TrafficPoint[];
  trafficColor?: string;
  trafficRadiusMeters?: number;
  /**
   * Polyline rendered on top of markers — typically the pickup→drop route.
   * Pass an array of [lat, lng] pairs. Caller decides whether the points
   * are a straight line or a routed path.
   */
  trackPath?: Array<[number, number]>;
  trackColor?: string;
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
  height?: string;
  draggableMarkerId?: string;
  onMarkerDragEnd?: (id: string, lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onMapClick) return;
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, onMapClick]);
  return null;
}

function FitBounds({
  markers,
  trafficPoints,
  trackPath,
}: {
  markers: MapMarker[];
  trafficPoints?: TrafficPoint[];
  trackPath?: Array<[number, number]>;
}) {
  const map = useMap();
  useEffect(() => {
    const points = [
      ...markers.map((m) => [m.latitude, m.longitude] as [number, number]),
      ...(trafficPoints ?? []).map(
        (p) => [p.latitude, p.longitude] as [number, number],
      ),
      ...(trackPath ?? []),
    ];
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
  }, [map, markers, trafficPoints, trackPath]);
  return null;
}

const LIGHT_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DARK_TILE = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export default function MapViewClient({
  markers,
  trafficPoints,
  trafficColor,
  trafficRadiusMeters = 120,
  trackPath,
  trackColor,
  center = [5.6037, -0.187],
  zoom = 12,
  className = "",
  onMarkerClick,
  height = "400px",
  draggableMarkerId,
  onMarkerDragEnd,
  onMapClick,
}: MapViewClientProps) {
  const colours = useThemeColours();
  const tileUrl = colours.resolvedTheme === "dark" ? DARK_TILE : LIGHT_TILE;
  const icons = useMemo<Record<MapMarker["kind"], L.DivIcon>>(() => {
    const kinds: MapMarker["kind"][] = [
      "retailer",
      "rider-eligible",
      "rider-ineligible",
      "rider-active",
      "order",
      "order-failed",
      "drop",
    ];
    return Object.fromEntries(kinds.map((k) => [k, makeIcon(k, colours)])) as Record<
      MapMarker["kind"],
      L.DivIcon
    >;
  }, [colours]);

  return (
    <div className={className} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full rounded-md"
      >
        <TileLayer
          url={tileUrl}
          attribution={
            colours.resolvedTheme === "dark"
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/attributions">Carto</a>'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          }
        />
        <MapClickHandler onMapClick={onMapClick} />
        <FitBounds
          markers={markers}
          trafficPoints={trafficPoints}
          trackPath={trackPath}
        />
        {trackPath && trackPath.length >= 2 && (
          <Polyline
            positions={trackPath}
            pathOptions={{
              color: trackColor ?? colours["--color-brand-orange"],
              weight: 4,
              opacity: 0.85,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}
        {(trafficPoints ?? []).map((p, i) => (
          <Circle
            key={`tp-${i}`}
            center={[p.latitude, p.longitude]}
            radius={trafficRadiusMeters}
            pathOptions={{
              color: trafficColor ?? colours["--color-brand-orange"],
              fillColor: trafficColor ?? colours["--color-brand-orange"],
              fillOpacity: 0.18,
              opacity: 0.35,
              weight: 1,
            }}
          />
        ))}
        {markers.map((m) => {
          const draggable = m.id === draggableMarkerId;
          return (
            <Marker
              key={m.id}
              position={[m.latitude, m.longitude]}
              icon={icons[m.kind]}
              draggable={draggable}
              eventHandlers={{
                click: () => onMarkerClick?.(m),
                dragend: (e) => {
                  if (!draggable) return;
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  onMarkerDragEnd?.(m.id, lat, lng);
                },
              }}
            >
              {m.label && <Popup>{m.label}</Popup>}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
