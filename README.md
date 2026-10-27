# LATCHI STUDIO — Generative Cinema & AI Filmmaking Portfolio

**Live Production URL:** **[https://latchidz.github.io/](https://latchidz.github.io/)**  
**Edge HLS Stream CDN:** **[https://latchidz.github.io/latchi-cinema-streams/](https://latchidz.github.io/latchi-cinema-streams/)**  
**Director & Architect:** **Iskander Khantouche (`إسكندر خنتوش`)**

---

## Executive Overview

Official studio portfolio showcasing **09 generative cinema works** directed by **Iskander Khantouche**, engineered for international AI video platforms (Higgsfield, Runway, Kling, Luma), festival programmers, and co-production studios:

| # | Catalog ID | Title (EN / AR) | Category | Runtime | Master Spec |
|---|------------|-----------------|----------|---------|-------------|
| 01 | `LATCHI — 01` | **The Pillar of Our Roof** · *السند والخيمة* | Narrative Short Film | `02:12` | `1080×1920` ABR HLS |
| 02 | `LATCHI — 02` | **Bread & Olives** · *كسرة وزيتون* | Narrative Short Film | `02:10` | `1080×1920` ABR HLS |
| 03 | `LATCHI — 03` | **Brotherhood in the Storm** · *الشدة تبيّن الرجال* | Narrative Short Film | `02:03` | `1080×1920` ABR HLS |
| 04 | `LATCHI — 04` | **The Final Prostration** · *السجدة الأخيرة* | Narrative Short Film | `02:00` | `1080×1920` ABR HLS |
| 05 | `LATCHI — 05` | **Delivery to Building 12** · *أمانة رقم 12* | Narrative Short Film | `02:03` | `1080×1920` ABR HLS |
| 06 | `LATCHI — 06` | **The 50-Dinar Fuse** · *البركة في الحلال* | Micro-Drama Short | `00:57` | `1080×1920` ABR HLS |
| 07 | `LATCHI — 07` | **Mehdi & Nesrine: Tea & Payback** · *مهدي ونسرين* | 3D Stylized Animation | `00:24` | `1080×1920` ABR HLS |
| 08 | `LATCHI — 08` | **Studio Podcast R&D — Cam A** · *كاميرا أ* | Virtual Human Lip-Sync | `00:10` | `720×1280` ABR HLS |
| 09 | `LATCHI — 09` | **Studio Podcast R&D — Cam B** · *كاميرا ب* | Multi-Cam Continuity | `00:10` | `720×1280` ABR HLS |

---

## Zero-Lag Dual-Repository Streaming Architecture

To eliminate buffering stalls inherent to raw `150 MB+` progressive `.mp4` files, LATCHI STUDIO decouples the lightweight web application (`latchidz/latchidz.github.io`, `< 1 MB`) from a dedicated Fastly-backed global edge HLS repository (`latchidz/latchi-cinema-streams`):

1. **Multi-Bitrate Adaptive HLS (`master.m3u8`):**
   - `1080p/playlist.m3u8` (`H.264 High@L4.1`, `AAC 128kbps 48kHz`, `2.5s` GOP-aligned independent `.ts` segments).
   - `540p/playlist.m3u8` (`H.264 Main@L3.1`, `AAC 96kbps 48kHz`, `2.5s` segments for mobile/congested networks).
2. **Hover-Triggered Segment Pre-Warming (`js/player.js`):**
   - Hovering or touching any film poster plays a `~250 KB` silent `hover.mp4` motion loop while asynchronously pre-fetching `master.m3u8` + `1080p/seg_000.ts` into the browser HTTP/2 cache for `< 60ms` instant start on click.
3. **3-Tier Bulletproof Playback Failover:**
   - **Tier 1:** Self-hosted `hls.js v1.5.17` (`vendor/hls.min.js`) MSE engine with live quality switching (`AUTO ABR / 1080p FHD / 540p Fast`).
   - **Tier 2:** Native Apple HLS (`application/vnd.apple.mpegurl`) on iOS & macOS Safari.
   - **Tier 3:** Automatic error-recovery fallback to `+faststart` progressive `stream.mp4`.

---

## Repository Structure

```text
.
├── index.html          # Semantic HTML5, OpenGraph/Twitter social cards & JSON-LD schema
├── assets/
│   ├── favicon.svg     # LATCHI STUDIO vector aperture emblem
│   └── og-cover.jpg    # 1200×630 executive link preview card
├── css/
│   └── studio.css      # Bespoke dark obsidian cinema UI, 9:16 theater & EN/AR RTL layout
├── data/
│   └── films.js        # Bilingual (EN/AR) catalog, synopses & technical notes for all 09 films
├── js/
│   ├── player.js       # 3-Tier HLS ABR + Hover Pre-Warming + MP4 Failover Engine
│   └── app.js          # Category filtering, Theater modal, deep-linking (#film-01..09) & shortcuts
└── vendor/
    └── hls.min.js      # Self-hosted hls.js v1.5.17 (zero external CDN dependency)
```

© 2026 **LATCHI STUDIO** — All Rights Reserved.
