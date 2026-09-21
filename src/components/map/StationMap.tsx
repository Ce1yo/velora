"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { MapCanvas } from "./MapCanvas";

interface Props {
  systemId: string;
  onSelectStation?: (stationPk: string) => void;
  // When provided (e.g. Time Machine), this data replaces the live fetch.
  overrideData?: GeoJSON.FeatureCollection | null;
}

export function StationMap({ systemId, onSelectStation, overrideData }: Props) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const fittedRef = useRef(false);
  const onSelectRef = useRef(onSelectStation);
  const [loading, setLoading] = useState(true);
  onSelectRef.current = onSelectStation;

  const setData = useCallback((data: GeoJSON.FeatureCollection) => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("stations") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
    if (!fittedRef.current && data.features.length) {
      const bounds = new maplibregl.LngLatBounds();
      for (const f of data.features) {
        const c = (f.geometry as GeoJSON.Point).coordinates;
        bounds.extend([c[0], c[1]]);
      }
      map.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 13 });
      fittedRef.current = true;
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const fc = await fetch(`/api/systems/${encodeURIComponent(systemId)}/geojson`).then((r) => r.json());
      setData(fc);
      setLoading(false);
    } catch (err) {
      console.error("StationMap load error:", err);
      setLoading(false);
    }
  }, [systemId, setData]);

  const onReady = useCallback(
    (map: maplibregl.Map) => {
      mapRef.current = map;
      map.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 42,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["step", ["get", "point_count"], 13, 25, 18, 100, 24],
          "circle-color": "rgba(52,211,153,0.15)",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(52,211,153,0.5)",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "stations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
        },
        paint: { "text-color": "#e7e9ee" },
      });
      map.addLayer({
        id: "stations-dot",
        type: "circle",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 15, ["interpolate", ["linear"], ["get", "capacity"], 10, 5, 60, 9]],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.95,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(0,0,0,0.5)",
        },
      });
      map.on("click", "stations-dot", (e) => {
        e.preventDefault();
        const id = e.features?.[0]?.properties?.id;
        if (id) {
          onSelectRef.current?.(id);
        }
      });
      map.on("click", "clusters", async (e) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = feats[0]?.properties?.cluster_id;
        if (clusterId == null) return;
        const zoom = await (map.getSource("stations") as maplibregl.GeoJSONSource).getClusterExpansionZoom(clusterId);
        map.easeTo({ center: (feats[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });
      for (const l of ["stations-dot", "clusters"]) {
        map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", l, () => (map.getCanvas().style.cursor = ""));
      }
      load();
    },
    [load]
  );

  // Live refresh when no override
  useEffect(() => {
    if (overrideData != null) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load, overrideData]);

  useEffect(() => {
    if (overrideData != null) {
      fittedRef.current = true;
      setData(overrideData);
    }
  }, [overrideData, setData]);

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-950 z-10">
          <div className="text-[10px] font-mono tracking-widest text-[#5b6274] animate-pulse">
            LOADING STATIONS…
          </div>
        </div>
      )}
      <MapCanvas zoom={11} onReady={onReady} />
    </>
  );
}
