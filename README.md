# GoGo Water

Smart drinking-water dispenser — Embedded System (CEDT, Chulalongkorn University) Final Project 2026 "Smart Devices".

Sensor nodes (ESP32) measure water quality and send it over ESP-NOW to a gateway (ESP32-S3), which forwards it over HTTPS to a Next.js API on Vercel. Data is stored in Supabase and shown on a live dashboard.

```
Node1 (TDS) --ESP-NOW--> Gateway (ESP32-S3) --HTTPS--> Vercel API --> Supabase --> Dashboard
```

- `firmware/` — Arduino sketches (Arduino-ESP32 core 3.x)
- `web/` — Next.js API + dashboard

Secrets (`.env*`, `firmware/**/secrets.h`) are not committed. Copy `firmware/secrets.example.h` to `secrets.h`.

AI tools used: Claude (Anthropic) assisted with design and code; see the final report for details.
