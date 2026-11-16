"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { mergeIntoBuckets, NODE1, RANGES, type RangeKey } from "@/lib/dashboard";
import type { ChartPoint, Reading } from "@/lib/types";

type Bucket = ChartPoint & { n: number };
export type LiveState = "connecting" | "live" | "offline";

const LATEST_LIMIT = 300; // rows kept in memory for status / PDR / events
const SPARK = { ms: 3_600_000, bucketS: 120 }; // TDS card sparkline: 1 h in 2-min buckets

// ---- 1-second clock as an external store (no setState inside effects) ----
let clockNow: number | null = null;
function subscribeClock(onChange: () => void) {
  clockNow = Date.now();
  onChange();
  const id = setInterval(() => {
    clockNow = Date.now();
    onChange();
  }, 1000);
  return () => clearInterval(id);
}
const getClock = () => clockNow;
const getServerClock = () => null;

/** Log the real error for developers; show only a generic message on the public page. */
function report(what: string, err: unknown): string {
  console.error(`[dashboard] ${what} failed:`, err);
  return "โหลดข้อมูลไม่สำเร็จ กรุณาลองรีเฟรชหน้า";
}

async function fetchBuckets(fromMs: number, bucketS: number): Promise<Bucket[]> {
  const { data, error } = await getBrowserClient().rpc("readings_bucketed", {
    p_node_id: NODE1,
    p_from: new Date(fromMs).toISOString(),
    p_bucket_s: bucketS,
  });
  if (error) throw new Error(error.message);
  return (data as { bucket: string; tds_ppm: number; n: number }[]).map((d) => ({
    t: Date.parse(d.bucket),
    ppm: d.tds_ppm,
    n: d.n,
  }));
}

export function useDashboardData(range: RangeKey) {
  const [latest, setLatest] = useState<Reading[]>([]); // newest first
  const [chartState, setChartState] = useState<{ key: RangeKey; pts: Bucket[] } | null>(null);
  const [spark, setSpark] = useState<Bucket[]>([]);
  const [live, setLive] = useState<LiveState>("connecting");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null on the server / first hydration render, then ticks every second
  const now = useSyncExternalStore(subscribeClock, getClock, getServerClock);

  // initial latest rows + sparkline + realtime subscription (once)
  useEffect(() => {
    const sb = getBrowserClient();
    let cancelled = false;

    (async () => {
      const [rows, sp] = await Promise.allSettled([
        sb.from("readings").select("*").order("received_at", { ascending: false }).limit(LATEST_LIMIT),
        fetchBuckets(Date.now() - SPARK.ms, SPARK.bucketS),
      ]);
      if (cancelled) return;
      if (rows.status === "fulfilled" && !rows.value.error) setLatest((rows.value.data ?? []) as Reading[]);
      else setError(report("latest readings", rows.status === "fulfilled" ? rows.value.error : rows.reason));
      if (sp.status === "fulfilled") setSpark(sp.value);
      else setError(report("sparkline", sp.reason));
      setLoading(false);
    })();

    const channel = sb
      .channel("readings-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "readings" }, (payload) => {
        const r = payload.new as Reading;
        setLatest((prev) => [r, ...prev].slice(0, LATEST_LIMIT));
        if (r.node_id !== NODE1) return;
        setChartState((prev) => {
          if (!prev) return prev;
          const cfg = RANGES[prev.key];
          return { key: prev.key, pts: mergeIntoBuckets(prev.pts, r, cfg.bucketS, Date.now() - cfg.ms) };
        });
        setSpark((prev) => mergeIntoBuckets(prev, r, SPARK.bucketS, Date.now() - SPARK.ms));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLive("offline");
      });

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  // history chart for the selected range (ignore the answer if the user switched range meanwhile)
  useEffect(() => {
    let stale = false;
    const cfg = RANGES[range];
    fetchBuckets(Date.now() - cfg.ms, cfg.bucketS)
      .then((pts) => {
        if (!stale) setChartState({ key: range, pts });
      })
      .catch((e) => {
        if (!stale) setError(report("history chart", e));
      });
    return () => {
      stale = true;
    };
  }, [range]);

  // while a new range is loading, show nothing rather than the previous range's points
  const chart = chartState?.key === range ? chartState.pts : null;

  return { latest, chart, spark, live, loading, error, now };
}
