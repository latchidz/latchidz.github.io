/**
 * LATCHI STUDIO — Interactive Cinema Gallery, Bilingual Switcher & Screening Room UX
 */

(function () {
  const DATA = window.LATCHI_STUDIO_DATA;
  const FILMS = DATA.films;

  let currentLang = "en";
  let currentCategory = "all";
  let activeFilmIndex = 0;
  let player = null;

  // Format seconds -> MM:SS
  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function t(key) {
    return (DATA.i18n[currentLang] && DATA.i18n[currentLang][key]) || DATA.i18n.en[key] || key;
  }

  function applyTranslations() {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      el.textContent = t(k);
    });

    const langBtn = document.getElementById("langToggleBtn");
    if (langBtn) {
      langBtn.textContent = currentLang === "en" ? "العربية · AR" : "English · EN";
    }

    renderFilterPills();
    renderFilmsGrid();
    updateHeroReelCard();

    if (document.getElementById("theaterModal").classList.contains("open")) {
      populateDossier(FILMS[activeFilmIndex]);
    }
  }

  function updateHeroReelCard() {
    const f = FILMS[0];
    const titleEl = document.getElementById("heroReelTitle");
    const subEl = document.getElementById("heroReelSub");
    if (titleEl) {
      titleEl.textContent = currentLang === "ar" ? `${f.titleAr} · ${f.titleEn}` : `${f.titleEn} · ${f.titleAr}`;
    }
    if (subEl) {
      subEl.textContent = `${f.code} · ${f.duration} · ${f.resolution} ABR HLS`;
    }
  }

  function renderFilterPills() {
    const bar = document.getElementById("filterBar");
    if (!bar) return;
    const filters = [
      { id: "all", label: t("filterAll") },
      { id: "narrative", label: t("filterNarrative") },
      { id: "animation", label: t("filterAnimation") },
      { id: "multicam", label: t("filterMulticam") }
    ];
    bar.innerHTML = filters
      .map(
        (f) =>
          `<button class="filter-pill ${currentCategory === f.id ? "active" : ""}" data-cat="${f.id}">${f.label}</button>`
      )
      .join("");

    bar.querySelectorAll(".filter-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentCategory = btn.getAttribute("data-cat");
        renderFilterPills();
        renderFilmsGrid();
      });
    });
  }

  function renderFilmsGrid() {
    const grid = document.getElementById("filmsGrid");
    if (!grid) return;

    const visible = FILMS.filter((f) => currentCategory === "all" || f.category === currentCategory);

    grid.innerHTML = visible
      .map((f, idx) => {
        const u = player.urlsFor(f.id);
        const catLabel = currentLang === "ar" ? f.categoryLabelAr : f.categoryLabelEn;
        const primaryTitle = currentLang === "ar" ? f.titleAr : f.titleEn;
        const secondaryTitle = currentLang === "ar" ? f.titleEn : f.titleAr;
        const logline = currentLang === "ar" ? f.loglineAr : f.loglineEn;

        return `
        <article class="film-card" data-film-id="${f.id}" tabindex="0" role="button" aria-label="${primaryTitle}">
          <div class="poster-stage">
            <img
              class="poster-img"
              src="${u.posterWebp}"
              onerror="this.onerror=null;this.src='${u.posterJpg}'"
              alt="${primaryTitle}"
              loading="${idx < 3 ? "eager" : "lazy"}"
            />
            <video
              class="hover-video"
              muted
              loop
              playsinline
              preload="none"
              data-hover-src="${u.hover}"
            ></video>
            <div class="poster-shade"></div>

            <div class="card-top-badges">
              <span class="catalog-chip">${f.code}</span>
              <span class="runtime-chip">${f.duration}</span>
            </div>

            <div class="card-play-trigger">
              <div class="play-circle" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>
              </div>
            </div>

            <div class="poster-bottom-meta">
              <span class="card-cat-label">${catLabel}</span>
              <h3 class="card-title-primary">${primaryTitle}</h3>
              <div class="card-title-secondary">${secondaryTitle}</div>
            </div>
          </div>

          <div class="card-body">
            <p class="card-logline">${logline}</p>
            <div class="card-footer-row">
              <span class="spec-badge">${f.resolution} · HLS ABR</span>
              <span class="watch-link">${t("cardWatch")} →</span>
            </div>
          </div>
        </article>`;
      })
      .join("");

    // Bind hover preview + HLS segment pre-warming + click to open theater
    grid.querySelectorAll(".film-card").forEach((card) => {
      const fid = card.getAttribute("data-film-id");
      const hv = card.querySelector(".hover-video");

      const startPreview = () => {
        player.prewarm(fid);
        if (hv) {
          if (!hv.src) hv.src = hv.getAttribute("data-hover-src");
          card.classList.add("is-previewing");
          hv.play().catch(() => {});
        }
      };

      const stopPreview = () => {
        card.classList.remove("is-previewing");
        if (hv && !hv.paused) {
          hv.pause();
        }
      };

      card.addEventListener("mouseenter", startPreview);
      card.addEventListener("mouseleave", stopPreview);
      card.addEventListener("focus", startPreview);
      card.addEventListener("blur", stopPreview);
      card.addEventListener("touchstart", () => player.prewarm(fid), { passive: true });

      card.addEventListener("click", () => openTheaterById(fid));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTheaterById(fid);
        }
      });
    });
  }

  function populateDossier(film) {
    const modal = document.getElementById("theaterModal");
    modal.style.setProperty("--theater-glow", film.glowColor || "#d4af37");

    document.getElementById("dossierCode").textContent = `${film.code} · ${
      currentLang === "ar" ? film.categoryLabelAr : film.categoryLabelEn
    }`;
    document.getElementById("dossierTitlePrimary").textContent =
      currentLang === "ar" ? film.titleAr : film.titleEn;
    document.getElementById("dossierTitleSecondary").textContent =
      currentLang === "ar" ? film.titleEn : film.titleAr;

    const tags = currentLang === "ar" ? film.tagsAr : film.tagsEn;
    document.getElementById("dossierTags").innerHTML = tags
      .map((tg) => `<span class="dossier-tag">${tg}</span>`)
      .join("");

    document.getElementById("dossierSynopsis").textContent =
      currentLang === "ar" ? film.loglineAr : film.loglineEn;
    document.getElementById("dossierTech").textContent =
      currentLang === "ar" ? film.techNotesAr : film.techNotesEn;

    document.getElementById("specRuntime").textContent = film.duration;
    document.getElementById("specRes").textContent = film.resolution;
    document.getElementById("specAspect").textContent = film.aspect;
    document.getElementById("specLang").textContent =
      currentLang === "ar" ? film.languageAr : film.languageEn;

    const dlBtn = document.getElementById("downloadMasterBtn");
    dlBtn.href = player.urlsFor(film.id).mp4;
  }

  function openTheaterById(filmId) {
    const idx = FILMS.findIndex((f) => f.id === filmId);
    if (idx === -1) return;
    activeFilmIndex = idx;
    const film = FILMS[idx];

    // Pause hero background loop to dedicate 100% GPU/decoder to Screening Room
    const heroVid = document.getElementById("heroAmbientVideo");
    if (heroVid && !heroVid.paused) heroVid.pause();

    populateDossier(film);

    const modal = document.getElementById("theaterModal");
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    history.replaceState(null, "", `#${film.id}`);

    document.getElementById("unmuteToast").classList.remove("show");
    player.loadFilm(film, true);

    // Pre-warm next film in slate for instant Next switching
    const nextFilm = FILMS[(idx + 1) % FILMS.length];
    if (nextFilm) setTimeout(() => player.prewarm(nextFilm.id), 1500);
  }

  function closeTheater() {
    const modal = document.getElementById("theaterModal");
    if (!modal.classList.contains("open")) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
    player.stop();
    if (location.hash.startsWith("#film-")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    const heroVid = document.getElementById("heroAmbientVideo");
    if (heroVid) heroVid.play().catch(() => {});
  }

  function stepFilm(delta) {
    const nextIdx = (activeFilmIndex + delta + FILMS.length) % FILMS.length;
    openTheaterById(FILMS[nextIdx].id);
  }

  function initPlayerAndControls() {
    const videoEl = document.getElementById("theaterVideo");
    const playPauseBtn = document.getElementById("ctrlPlayPause");
    const muteBtn = document.getElementById("ctrlMute");
    const fsBtn = document.getElementById("ctrlFullscreen");
    const timeline = document.getElementById("timelineTrack");
    const fill = document.getElementById("timelineFill");
    const timecode = document.getElementById("timecodeLabel");
    const bufferRing = document.getElementById("bufferRing");
    const qualitySelect = document.getElementById("qualitySelect");
    const streamBadge = document.getElementById("streamModeBadge");
    const unmuteToast = document.getElementById("unmuteToast");

    player = new window.LatchiCinemaPlayer(videoEl, (state) => {
      if (typeof state.buffering === "boolean") {
        bufferRing.classList.toggle("visible", state.buffering);
      }
      if (typeof state.playing === "boolean") {
        playPauseBtn.innerHTML = state.playing
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
      }
      if (typeof state.muted === "boolean") {
        muteBtn.innerHTML = state.muted
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
      }
      if (state.mutedAutoplay) {
        unmuteToast.classList.add("show");
      }
      if (typeof state.currentTime === "number" && state.duration > 0) {
        const pct = Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100));
        fill.style.width = `${pct}%`;
        timecode.textContent = `${fmtTime(state.currentTime)} / ${fmtTime(state.duration)}`;
      }
      if (state.mode) {
        streamBadge.textContent = `● ${state.mode} · ZERO-LAG`;
      }
      if (Array.isArray(state.levels)) {
        if (state.levels.length > 0) {
          qualitySelect.style.display = "";
          qualitySelect.innerHTML =
            `<option value="-1">AUTO ABR</option>` +
            state.levels.map((lv) => `<option value="${lv.index}">${lv.label}</option>`).join("");
        } else {
          qualitySelect.style.display = "none";
        }
      }
    });

    const togglePlay = () => {
      if (videoEl.paused) videoEl.play().catch(() => {});
      else videoEl.pause();
    };

    videoEl.addEventListener("click", togglePlay);
    playPauseBtn.addEventListener("click", togglePlay);

    muteBtn.addEventListener("click", () => {
      videoEl.muted = !videoEl.muted;
      if (!videoEl.muted) unmuteToast.classList.remove("show");
    });

    unmuteToast.addEventListener("click", () => {
      videoEl.muted = false;
      unmuteToast.classList.remove("show");
    });

    qualitySelect.addEventListener("change", () => {
      player.setQualityLevel(parseInt(qualitySelect.value, 10));
    });

    fsBtn.addEventListener("click", () => {
      const stage = document.getElementById("theaterStageCol");
      if (!document.fullscreenElement) {
        (stage.requestFullscreen || videoEl.webkitEnterFullscreen || (() => {})).call(stage);
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    timeline.addEventListener("click", (e) => {
      const rect = timeline.getBoundingClientRect();
      const isRtl = document.documentElement.dir === "rtl";
      const ratio = isRtl
        ? (rect.right - e.clientX) / rect.width
        : (e.clientX - rect.left) / rect.width;
      const clamped = Math.min(1, Math.max(0, ratio));
      if (videoEl.duration) {
        videoEl.currentTime = clamped * videoEl.duration;
      }
    });

    document.getElementById("closeTheaterBtn").addEventListener("click", closeTheater);
    document.getElementById("prevFilmBtn").addEventListener("click", () => stepFilm(-1));
    document.getElementById("nextFilmBtn").addEventListener("click", () => stepFilm(1));

    document.getElementById("shareFilmBtn").addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const url = `${location.origin}${location.pathname}#${FILMS[activeFilmIndex].id}`;
      navigator.clipboard.writeText(url).catch(() => {});
      const orig = btn.textContent;
      btn.textContent = t("modalCopied");
      setTimeout(() => {
        btn.textContent = orig;
      }, 1800);
    });

    document.getElementById("theaterModal").addEventListener("click", (e) => {
      if (e.target.id === "theaterModal") closeTheater();
    });

    // Keyboard Cinema Shortcuts
    document.addEventListener("keydown", (e) => {
      const isOpen = document.getElementById("theaterModal").classList.contains("open");
      if (!isOpen) return;
      if (e.key === "Escape") closeTheater();
      else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m" || e.key === "M") {
        videoEl.muted = !videoEl.muted;
      } else if (e.key === "f" || e.key === "F") {
        fsBtn.click();
      } else if (e.key === "ArrowRight") {
        videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 5);
      } else if (e.key === "ArrowLeft") {
        videoEl.currentTime = Math.max(0, videoEl.currentTime - 5);
      }
    });
  }

  function initHeroReel() {
    const heroCard = document.getElementById("heroReelCard");
    const heroVid = document.getElementById("heroAmbientVideo");
    const heroImg = document.getElementById("heroAmbientPoster");
    const f0 = FILMS[0];
    const u0 = player.urlsFor(f0.id);

    heroImg.src = u0.posterWebp;
    heroVid.src = u0.hover;
    heroVid.play().catch(() => {});

    // Pre-warm featured film right after initial paint so hero CTA is 0ms instant!
    setTimeout(() => player.prewarm(f0.id), 500);

    heroCard.addEventListener("click", () => openTheaterById(f0.id));
    document.getElementById("ctaWatchFeatured").addEventListener("click", () => openTheaterById(f0.id));
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPlayerAndControls();
    initHeroReel();
    applyTranslations();

    document.getElementById("langToggleBtn").addEventListener("click", () => {
      currentLang = currentLang === "en" ? "ar" : "en";
      applyTranslations();
    });

    // Support direct deep-linking (#film-01 .. #film-09)
    const hash = (location.hash || "").replace("#", "");
    if (hash && FILMS.some((f) => f.id === hash)) {
      openTheaterById(hash);
    }
  });
})();
