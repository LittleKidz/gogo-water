"use client";

import { useMemo, useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { deriveEvents, fmtAgo, NODE1, ONLINE_MS, packetDelivery, waterStatus, type RangeKey } from "@/lib/dashboard";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { PendingCard, StatusCard, TdsCard } from "./KpiCards";
import TdsChart from "./TdsChart";
import DevicePanel, { type DeviceRow } from "./DevicePanel";
import { EventLog, LidLightCard, MetricsCard } from "./BottomCards";

export default function Dashboard() {
  const [range, setRange] = useState<RangeKey>("1h");
  const { latest, chart, spark, live, error, now } = useDashboardData(range);

  const node1Rows = useMemo(() => latest.filter((r) => r.node_id === NODE1), [latest]);
  const node1 = node1Rows[0];
  const newest = latest[0]; // any node → proves the Gateway is posting
  const pdr = useMemo(() => packetDelivery(node1Rows), [node1Rows]);
  const events = useMemo(() => deriveEvents(latest), [latest]);

  const age = (iso?: string) => (iso && now != null ? now - Date.parse(iso) : null);
  const node1Age = age(node1?.received_at);
  const gwAge = age(newest?.received_at);
  const node1Online = node1Age != null && node1Age < ONLINE_MS;
  const gwOnline = gwAge != null && gwAge < ONLINE_MS;

  const status = waterStatus(node1, now);

  const devices: DeviceRow[] = [
    {
      name: "Node1",
      board: "ESP32 DevKit V1",
      sensors: "TDS · ความขุ่น (รอเชื่อม)",
      connected: true,
      online: node1Online,
      lastSeen: node1Age == null ? "—" : fmtAgo(node1Age),
      rssi: node1?.rssi != null ? `${node1.rssi} dBm` : "—",
      pdr: pdr == null ? "—" : `${(pdr * 100).toFixed(1)}%`,
    },
    {
      name: "Gateway",
      board: "ESP32-S3",
      sensors: "อุณหภูมิน้ำ · Ultrasonic · Servo (รอเชื่อม)",
      connected: true,
      online: gwOnline,
      lastSeen: gwAge == null ? "—" : fmtAgo(gwAge),
      rssi: "—",
      pdr: "—",
    },
    {
      name: "Node2",
      board: "ESP32",
      sensors: "แสง (BH1750) · ฝาถัง (Hall)",
      connected: false,
      online: false,
      lastSeen: "—",
      rssi: "—",
      pdr: "—",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main id="overview" className="min-w-0 flex-1 px-4 pt-6 pb-10 md:px-7">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-5">
          <Header live={live} lastAt={newest?.received_at} />

          {error && (
            <div role="alert" className="rounded-xl border border-danger-line bg-danger-bg px-4 py-3 text-sm text-danger-ink">
              {error}
            </div>
          )}

          <section aria-label="สถานะล่าสุด" className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <StatusCard level={status.level} reason={status.reason} />
            <TdsCard ppm={node1?.tds_ppm ?? null} online={node1Online} spark={spark} now={now} />
            <PendingCard title="ความขุ่น · Node1" unit="NTU" note="เกณฑ์ ≤ 5 NTU (ค่าสัมพัทธ์เทียบน้ำใส)" />
            <PendingCard title="อุณหภูมิน้ำ · Gateway" unit="°C" note="DS18B20 · ใช้ชดเชยค่า TDS" />
          </section>

          <section className="flex flex-wrap gap-4">
            <TdsChart range={range} onRange={setRange} pts={chart} now={now} />
            <DevicePanel rows={devices} />
          </section>

          <section className="flex flex-wrap gap-4">
            <EventLog events={events} />
            <LidLightCard />
            <MetricsCard pdr={pdr} />
          </section>

          <footer className="flex flex-wrap justify-between gap-2 pt-1 text-xs text-muted">
            <span>GoGo Water · Embedded System (CEDT) Final Project 2026</span>
            <span>ระบบคัดกรองเบื้องต้น ไม่ใช่การตรวจทางห้องแล็บ</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
