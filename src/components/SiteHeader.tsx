"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV = [
  { href: "/", label: "LIVE" },
  { href: "/systems", label: "CITIES" },
  { href: "/compare", label: "COMPARE" },
  { href: "/trips", label: "TRIPS" },
  { href: "/sources", label: "SOURCES" },
  { href: "/methodology", label: "METHODOLOGY" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ systems: any[]; stations: any[] }>({ systems: [], stations: [] });
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.length < 2) {
      setResults({ systems: [], stations: [] });
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`).then((x) => x.json());
      setResults(r);
      setOpen(true);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-[100] h-14 border-b border-white/[0.08] bg-ink-950/95 backdrop-blur-md">
      <div className="h-full px-4 sm:px-6 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0 cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-ok live-dot" />
          <span className="font-mono font-semibold tracking-[0.25em] text-sm">VELORA</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              prefetch={true}
              className={`px-3 py-1.5 rounded-md text-[11px] font-mono tracking-widest transition-colors cursor-pointer ${
                pathname === n.href
                  ? "text-white bg-white/[0.07]"
                  : "text-[#8b93a7] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto relative" ref={boxRef}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => q.length >= 2 && setOpen(true)}
            placeholder="Search city, system, station…"
            className="w-48 sm:w-72 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs outline-none focus:border-white/25 placeholder:text-[#5b6274]"
          />
          {open && (results.systems.length > 0 || results.stations.length > 0) && (
            <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-white/10 bg-ink-900/95 backdrop-blur-md shadow-2xl">
              {results.systems.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[10px] font-mono tracking-widest text-[#5b6274]">SYSTEMS</div>
                  {results.systems.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        router.push(`/systems/${encodeURIComponent(s.id)}`);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-white/[0.06] text-sm"
                    >
                      {s.name}
                      <span className="text-[#5b6274] text-xs ml-2">
                        {s.city}{s.country ? ` · ${s.country}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {results.stations.length > 0 && (
                <div className="p-2 border-t border-white/[0.06]">
                  <div className="px-2 py-1 text-[10px] font-mono tracking-widest text-[#5b6274]">STATIONS</div>
                  {results.stations.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        router.push(`/systems/${encodeURIComponent(s.systemId)}?station=${encodeURIComponent(s.id)}`);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-white/[0.06] text-sm"
                    >
                      {s.name}
                      <span className="text-[#5b6274] text-xs ml-2">{s.systemId}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
