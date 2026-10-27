/**
 * LATCHI STUDIO — Zero-Lag 3-Tier Cinema Player & Edge Pre-Warming Engine
 * Tier 1: Hls.js ABR (1080p Full HD primary + 540p safety net, 2.5s segments)
 * Tier 2: Native Apple HLS (iOS / macOS Safari hardware decoder)
 * Tier 3: FastStart Progressive MP4 automatic failover
 */

class LatchiCinemaPlayer {
  constructor(videoEl, onStateChange) {
    this.video = videoEl;
    this.onStateChange = onStateChange || (() => {});
    this.hls = null;
    this.currentFilm = null;
    this.prewarmedSet = new Set();
    this.mode = "IDLE";
    this.levels = [];
    this.currentLevel = -1; // -1 = AUTO
    this._bindVideoEvents();
  }

  urlsFor(filmId) {
    const base = `${window.LATCHI_CDN_BASE}/${filmId}`;
    return {
      master: `${base}/master.m3u8`,
      seg0_1080: `${base}/1080p/seg_000.ts`,
      playlist_1080: `${base}/1080p/playlist.m3u8`,
      hover: `${base}/hover.mp4`,
      posterWebp: `${base}/poster.webp`,
      posterJpg: `${base}/poster.jpg`,
      mp4: `${base}/stream.mp4`
    };
  }

  /**
   * Pre-warms manifest + first 2.5s Full HD segment into browser HTTP/2 cache
   * the instant a user hovers or focuses a film card -> < 60ms start on click!
   */
  prewarm(filmId) {
    if (!filmId || this.prewarmedSet.has(filmId)) return;
    this.prewarmedSet.add(filmId);
    const u = this.urlsFor(filmId);
    fetch(u.master, { mode: "cors", credentials: "omit" }).catch(() => {});
    fetch(u.playlist_1080, { mode: "cors", credentials: "omit" }).catch(() => {});
    fetch(u.seg0_1080, { mode: "cors", credentials: "omit" }).catch(() => {});
  }

  destroyHls() {
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch (_) {}
      this.hls = null;
    }
  }

  loadFilm(film, autoplay = true) {
    this.destroyHls();
    this.currentFilm = film;
    this.levels = [];
    this.currentLevel = -1;

    const u = this.urlsFor(film.id);
    this.video.poster = u.posterWebp;
    this.video.currentTime = 0;

    this._emit({ buffering: true, mode: "CONNECTING", qualityLabel: "1080p ABR" });

    // Tier 1: Hls.js MSE Adaptive Streaming
    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: 0, // Start directly on 1080p Full HD (listed index 0 in master.m3u8)
        capLevelToPlayerSize: false,
        maxBufferLength: 35,
        maxMaxBufferLength: 90,
        backBufferLength: 30,
        abrEwmaDefaultEstimate: 5500000, // 5.5 Mbps optimistic start so first frame is crisp 1080p
        fragLoadingTimeOut: 12000,
        manifestLoadingTimeOut: 8000
      });
      this.hls = hls;
      this.mode = "HLS_ABR";

      hls.loadSource(u.master);
      hls.attachMedia(this.video);

      hls.on(window.Hls.Events.MANIFEST_PARSED, (_, data) => {
        this.levels = (data.levels || []).map((lv, idx) => ({
          index: idx,
          height: lv.height,
          label: lv.height >= 1000 ? "1080p FHD" : lv.height >= 700 ? "720p HD" : "540p Fast"
        }));
        this._emit({
          mode: "HLS EDGE",
          levels: this.levels,
          currentLevel: -1,
          qualityLabel: "AUTO · 1080p"
        });
        if (autoplay) {
          this._safePlay();
        }
      });

      hls.on(window.Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const lv = this.levels[data.level];
        const prefix = this.hls && this.hls.autoLevelEnabled ? "AUTO · " : "";
        if (lv) {
          this._emit({ qualityLabel: `${prefix}${lv.label}` });
        }
      });

      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
          this._fallbackToMp4(u.mp4, autoplay);
        } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
          try {
            hls.recoverMediaError();
          } catch (_) {
            this._fallbackToMp4(u.mp4, autoplay);
          }
        } else {
          this._fallbackToMp4(u.mp4, autoplay);
        }
      });
      return;
    }

    // Tier 2: Native Apple Safari HLS
    if (this.video.canPlayType("application/vnd.apple.mpegurl")) {
      this.mode = "NATIVE_HLS";
      this.video.src = u.master;
      this.video.onerror = () => this._fallbackToMp4(u.mp4, autoplay);
      this._emit({ mode: "SAFARI HLS", qualityLabel: "AUTO · 1080p", levels: [] });
      if (autoplay) this._safePlay();
      return;
    }

    // Tier 3: Progressive FastStart MP4
    this._fallbackToMp4(u.mp4, autoplay);
  }

  _fallbackToMp4(mp4Url, autoplay) {
    this.destroyHls();
    this.mode = "FASTSTART_MP4";
    this.video.onerror = null;
    this.video.src = mp4Url;
    this._emit({ mode: "EDGE MP4", qualityLabel: "HD STREAM", levels: [] });
    if (autoplay) this._safePlay();
  }

  setQualityLevel(levelIndex) {
    if (!this.hls) return;
    this.currentLevel = levelIndex;
    this.hls.currentLevel = levelIndex; // -1 restores automatic ABR
    if (levelIndex === -1) {
      this._emit({ currentLevel: -1, qualityLabel: "AUTO · ABR" });
    } else {
      const lv = this.levels[levelIndex];
      this._emit({ currentLevel: levelIndex, qualityLabel: lv ? lv.label : "HD" });
    }
  }

  _safePlay() {
    this.video.muted = false;
    const p = this.video.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // Browser autoplay policy blocked unmuted start (e.g. cold deep-link open): start muted & show unmute pill
        this.video.muted = true;
        this._emit({ mutedAutoplay: true });
        this.video.play().catch(() => {});
      });
    }
  }

  stop() {
    this.video.pause();
    this.destroyHls();
    this.video.removeAttribute("src");
    this.video.load();
    this.currentFilm = null;
  }

  _bindVideoEvents() {
    const v = this.video;
    v.addEventListener("playing", () => this._emit({ playing: true, buffering: false }));
    v.addEventListener("pause", () => this._emit({ playing: false }));
    v.addEventListener("waiting", () => this._emit({ buffering: true }));
    v.addEventListener("canplay", () => this._emit({ buffering: false }));
    v.addEventListener("timeupdate", () => {
      this._emit({
        currentTime: v.currentTime || 0,
        duration: v.duration || (this.currentFilm ? this.currentFilm.durationSec : 0)
      });
    });
    v.addEventListener("volumechange", () => {
      this._emit({ muted: v.muted, volume: v.volume });
    });
    v.addEventListener("ended", () => {
      this._emit({ playing: false, ended: true });
    });
  }

  _emit(patch) {
    this.onStateChange(patch);
  }
}

window.LatchiCinemaPlayer = LatchiCinemaPlayer;
