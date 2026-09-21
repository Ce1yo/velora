"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import { MapCanvas } from "./MapCanvas";

interface WorldSystem {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lon: number;
  stationCount: number | null;
  bikesAvailable: number | null;
  availability: number | null;
  feedStatus: string;
}

export function WorldMap() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);

  const onReady = useCallback(async (map: maplibregl.Map) => {
    mapRef.current = map;
    try {
      const systems: WorldSystem[] = await fetch("/api/world").then((r) => r.json());
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: systems.map((s) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          properties: {
            id: s.id,
            name: s.name,
            city: s.city ?? "",
            country: s.country ?? "",
            stations: s.stationCount ?? 0,
            bikes: s.bikesAvailable ?? 0,
            availability: s.availability ?? -1,
            live: s.feedStatus === "LIVE" ? 1 : 0,
          },
        })),
      };
      map.addSource("systems", { type: "geojson", data: fc });
      map.addLayer({
        id: "systems-glow",
        type: "circle",
        source: "systems",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "stations"], 1, 8, 100, 14, 1000, 26, 3000, 38],
          "circle-color": "#34d399",
          "circle-opacity": 0.08,
          "circle-blur": 1,
        },
      });
      map.addLayer({
        id: "systems-dots",
        type: "circle",
        source: "systems",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "stations"], 1, 4, 100, 7, 1000, 12, 3000, 18],
          "circle-color": [
            "case",
            ["<", ["get", "availability"], 0], "#2a3345",
            ["<", ["get", "availability"], 0.15], "#f87171",
            ["<", ["get", "availability"], 0.35], "#f59e0b",
            ["<", ["get", "availability"], 0.8], "#34d399",
            "#60a5fa",
          ],
          "circle-opacity": 0.9,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.2)",
        },
      });
      map.on("click", "systems-dots", (e) => {
        e.preventDefault();
        const id = e.features?.[0]?.properties?.id;
        if (id) {
          routerRef.current.push(`/systems/${encodeURIComponent(id)}`);
        }
      });
      map.on("mouseenter", "systems-dots", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "systems-dots", () => {
        map.getCanvas().style.cursor = "";
      });
      setLoading(false);
    } catch (err) {
      console.error("WorldMap load error:", err);
      setLoading(false);
    }
  }, []);

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-950 z-10">
          <div className="text-[10px] font-mono tracking-widest text-[#5b6274] animate-pulse">
            LOADING MAP…
          </div>
        </div>
      )}
      <MapCanvas center={[10, 30]} zoom={1.6} onReady={onReady} />
    </>
  );
}
