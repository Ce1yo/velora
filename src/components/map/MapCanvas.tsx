"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export interface MapCanvasProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  onReady?: (map: maplibregl.Map) => void;
  attributionPosition?: "bottom-right" | "bottom-left";
}

export function MapCanvas({ center = [4.83, 45.76], zoom = 2, className, onReady }: MapCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(onReady);
  const [error, setError] = useState<string | null>(null);
  readyRef.current = onReady;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    
    const map = new maplibregl.Map({
      container: ref.current,
      style: DARK_STYLE,
      center,
      zoom,
      attributionControl: { compact: true },
      maxPitch: 0,
      failIfMajorPerformanceCaveat: false,
    });
    
    map.on("error", (e) => {
      console.error("MapLibre error:", e);
      setError("Map failed to load");
    });
    
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    
    map.on("load", () => {
      readyRef.current?.(map);
    });
    
    mapRef.current = map;
    
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className={className ?? "absolute inset-0"}>
        <div className="flex items-center justify-center h-full text-danger text-sm font-mono">
          {error}
        </div>
      </div>
    );
  }

  return <div ref={ref} className={className ?? "absolute inset-0"} />;
}
