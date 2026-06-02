import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  PictureInPicture2,
  Settings2,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn, resolveBackendAssetUrl } from "@/lib/utils";

const VIDEO_FILE_PATTERN = /\.(m3u8|mp4|mov|webm|m4v|avi|mkv)(?:[?#].*)?$/i;
const MANIFEST_RETRY_DELAY = 3000;
const MANIFEST_MAX_RETRIES = 20;
const STREAM_INFO_PATTERN =
  /#EXT-X-STREAM-INF:.*RESOLUTION=(\d+x\d+).*?\n([^\n]+)/g;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function resolveVariantUrl(variantUrl, manifestUrl) {
  const cleanedVariantUrl = variantUrl.trim();

  try {
    return new URL(cleanedVariantUrl, manifestUrl).toString();
  } catch {
    return cleanedVariantUrl;
  }
}

function hashManifest(manifestText) {
  let hash = 5381;

  for (let index = 0; index < manifestText.length; index += 1) {
    hash = ((hash << 5) + hash) ^ manifestText.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function appendCacheBuster(url, cacheKey) {
  if (!cacheKey) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${cacheKey}`;
}

export function HlsVideoPlayer({ src, className = "" }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const qualityNoticeTimerRef = useRef(null);
  const qualityMenuRef = useRef(null);
  const speedMenuRef = useRef(null);
  const [manifestState, setManifestState] = useState("idle");
  const [manifestMessage, setManifestMessage] = useState("");
  const [qualityLevels, setQualityLevels] = useState([]);
  const [settingsView, setSettingsView] = useState(null); // null | "main" | "speed" | "quality"
  const [selectedQualityLabel, setSelectedQualityLabel] = useState("Auto");
  const [qualityNotice, setQualityNotice] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimerRef = useRef(null);
  const canShowQualityControl = src?.includes(".m3u8");

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "0:00";
    }

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  function flashQualityNotice(label) {
    if (qualityNoticeTimerRef.current) {
      window.clearTimeout(qualityNoticeTimerRef.current);
    }

    setQualityNotice(`Switched to ${label}`);
    qualityNoticeTimerRef.current = window.setTimeout(() => {
      setQualityNotice("");
      qualityNoticeTimerRef.current = null;
    }, 1400);
  }

  function syncFromVideo() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setIsPlaying(!video.paused && !video.ended);
    setCurrentTime(video.currentTime || 0);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setVolume(video.volume ?? 1);
    setIsMuted(Boolean(video.muted) || (video.volume ?? 1) === 0);
    setPlaybackRate(video.playbackRate || 1);
    setIsBuffering(video.readyState < 3 && !video.paused);
  }

  function formatQualityLabel(level, fallbackIndex) {
    if (!level) {
      return `Level ${fallbackIndex + 1}`;
    }

    if (level.height) {
      return `${level.height}p`;
    }

    if (level.bitrate) {
      return `${Math.round(level.bitrate / 1000)} kbps`;
    }

    return `Level ${fallbackIndex + 1}`;
  }

  function parseManifestLevels(manifestText) {
    const normalizedText = manifestText.replace(/\r\n/g, "\n");

    return [...normalizedText.matchAll(STREAM_INFO_PATTERN)].map(
      ([, resolution, uri], index) => {
        const height = Number.parseInt(resolution.split("x")[1], 10) || null;
        const resolvedUrl = resolveVariantUrl(uri, src);

        return {
          index,
          label: height ? `${height}p` : `Level ${index + 1}`,
          bitrate: 0,
          height,
          uri,
          resolvedUrl,
        };
      },
    );
  }

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !src) {
      return undefined;
    }

    let hls = null;
    let cancelled = false;
    let retryId = null;
    let attempts = 0;

    const resetVideo = () => {
      if (hls) {
        hls.destroy();
      }

      hlsRef.current = null;

      video.removeAttribute("src");
      video.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsBuffering(false);
      setIsPictureInPicture(false);
    };

    const attachVideo = async (playbackSrc) => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = playbackSrc;
        setManifestState("ready");
        syncFromVideo();
        return;
      }

      const { default: Hls } = await import("hls.js");

      if (cancelled) {
        return;
      }

      if (Hls.isSupported()) {
        hls = new Hls();
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          if (cancelled) {
            return;
          }

          const nextLevels = (data.levels || []).map((level, index) => ({
            index,
            label: formatQualityLabel(level, index),
            bitrate: level.bitrate || 0,
            height: level.height || null,
          }));

          setQualityLevels(nextLevels);
          setSelectedQualityLabel("Auto");

          // Connection-based initial capping using the Network Information API
          try {
            const conn =
              navigator.connection ||
              navigator.mozConnection ||
              navigator.webkitConnection;
            const effective = conn?.effectiveType || null;

            const thresholds = {
              "slow-2g": 200000,
              "2g": 400000,
              "3g": 1500000,
              "4g": Infinity,
            };

            const thresh = thresholds[effective] ?? null;

            if (
              thresh !== null &&
              Array.isArray(hls.levels) &&
              hls.levels.length
            ) {
              let capIndex = -1;
              hls.levels.forEach((lvl, idx) => {
                const bw = lvl.bitrate || 0;
                if (bw <= thresh) {
                  capIndex = idx;
                }
              });

              if (capIndex >= 0) {
                hls.autoLevelCapping = capIndex;
              }
            }
          } catch (e) {
            // ignore network API errors
          }
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          if (cancelled) {
            return;
          }

          if (data.level === -1) {
            setSelectedQualityLabel("Auto");
            return;
          }

          const nextLevel = hls.levels?.[data.level];
          setSelectedQualityLabel(formatQualityLabel(nextLevel, data.level));
        });
        hls.loadSource(playbackSrc);
        hls.attachMedia(video);
        setManifestState("ready");
        syncFromVideo();
        return;
      }

      video.src = playbackSrc;
      setManifestState("ready");
      syncFromVideo();
    };

    const probeManifest = async () => {
      setManifestState("checking");
      setManifestMessage("Preparing video for playback...");

      try {
        const response = await fetch(src, {
          method: "GET",
          cache: "no-store",
        });

        if (cancelled) {
          return;
        }

        if (response.ok) {
          const manifestText = await response.text();
          const parsedLevels = parseManifestLevels(manifestText);
          const playbackSrc = appendCacheBuster(
            src,
            hashManifest(manifestText),
          );

          if (parsedLevels.length > 0) {
            setQualityLevels(parsedLevels);
            setSelectedQualityLabel("Auto");
          }

          await attachVideo(playbackSrc);
          return;
        }

        if (response.status === 404 && attempts < MANIFEST_MAX_RETRIES) {
          attempts += 1;
          retryId = window.setTimeout(probeManifest, MANIFEST_RETRY_DELAY);
          return;
        }

        setManifestState("error");
        setManifestMessage(
          response.status === 404
            ? "This video is still being processed. Try again in a moment."
            : "This video could not be loaded.",
        );
      } catch {
        if (cancelled) {
          return;
        }

        if (attempts < MANIFEST_MAX_RETRIES) {
          attempts += 1;
          retryId = window.setTimeout(probeManifest, MANIFEST_RETRY_DELAY);
          return;
        }

        setManifestState("error");
        setManifestMessage("This video is temporarily unavailable.");
      }
    };

    probeManifest();

    return () => {
      cancelled = true;
      if (retryId) {
        window.clearTimeout(retryId);
      }

      if (qualityNoticeTimerRef.current) {
        window.clearTimeout(qualityNoticeTimerRef.current);
        qualityNoticeTimerRef.current = null;
      }

      if (hls) {
        hls.destroy();
      }
      hlsRef.current = null;
      resetVideo();
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video) {
      return undefined;
    }

    const updateFullscreen = () => {
      const fsEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        null;
      setIsFullscreen(fsEl === container);
    };

    const updatePlaying = () => setIsPlaying(!video.paused && !video.ended);
    const updateTime = () => setCurrentTime(video.currentTime || 0);
    const updateDuration = () =>
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const updateVolume = () => {
      setVolume(video.volume ?? 1);
      setIsMuted(Boolean(video.muted) || (video.volume ?? 1) === 0);
    };
    const updateRate = () => setPlaybackRate(video.playbackRate || 1);
    const updateBuffering = () =>
      setIsBuffering(video.readyState < 3 && !video.paused);
    const updatePictureInPicture = () => {
      setIsPictureInPicture(document.pictureInPictureElement === video);
    };

    updatePlaying();
    updateTime();
    updateDuration();
    updateVolume();
    updateRate();
    updateBuffering();
    updateFullscreen();
    updatePictureInPicture();

    video.addEventListener("play", updatePlaying);
    video.addEventListener("pause", updatePlaying);
    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("durationchange", updateDuration);
    video.addEventListener("volumechange", updateVolume);
    video.addEventListener("ratechange", updateRate);
    video.addEventListener("waiting", updateBuffering);
    video.addEventListener("playing", updateBuffering);
    video.addEventListener("seeking", updateBuffering);
    video.addEventListener("seeked", updateBuffering);
    video.addEventListener("ended", updatePlaying);
    video.addEventListener("enterpictureinpicture", updatePictureInPicture);
    video.addEventListener("leavepictureinpicture", updatePictureInPicture);
    document.addEventListener("fullscreenchange", updateFullscreen);
    document.addEventListener("webkitfullscreenchange", updateFullscreen);
    document.addEventListener("mozfullscreenchange", updateFullscreen);
    document.addEventListener("MSFullscreenChange", updateFullscreen);

    return () => {
      video.removeEventListener("play", updatePlaying);
      video.removeEventListener("pause", updatePlaying);
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("durationchange", updateDuration);
      video.removeEventListener("volumechange", updateVolume);
      video.removeEventListener("ratechange", updateRate);
      video.removeEventListener("waiting", updateBuffering);
      video.removeEventListener("playing", updateBuffering);
      video.removeEventListener("seeking", updateBuffering);
      video.removeEventListener("seeked", updateBuffering);
      video.removeEventListener("ended", updatePlaying);
      video.removeEventListener(
        "enterpictureinpicture",
        updatePictureInPicture,
      );
      video.removeEventListener(
        "leavepictureinpicture",
        updatePictureInPicture,
      );
      document.removeEventListener("fullscreenchange", updateFullscreen);
      document.removeEventListener("webkitfullscreenchange", updateFullscreen);
      document.removeEventListener("mozfullscreenchange", updateFullscreen);
      document.removeEventListener("MSFullscreenChange", updateFullscreen);
    };
  }, []);

  useEffect(() => {
    if (!settingsView) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const insidePanel = qualityMenuRef.current?.contains(event.target);
      if (!insidePanel) {
        setSettingsView(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSettingsView(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsView]);

  const applyQuality = (levelIndex) => {
    const player = hlsRef.current;
    const selectedLevel = qualityLevels[levelIndex];

    if (!player) {
      if (selectedLevel?.resolvedUrl && videoRef.current) {
        videoRef.current.src = selectedLevel.resolvedUrl;
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
        setSelectedQualityLabel(
          selectedLevel.label || `Level ${levelIndex + 1}`,
        );
        flashQualityNotice(selectedLevel.label || `Level ${levelIndex + 1}`);
      }

      setSettingsView(null);
      return;
    }

    if (levelIndex === -1) {
      player.currentLevel = -1;
      player.nextLevel = -1;
      player.loadLevel = -1;
      player.nextLoadLevel = -1;
      setSelectedQualityLabel("Auto");
      flashQualityNotice("Auto");
    } else {
      player.currentLevel = levelIndex;
      player.nextLevel = levelIndex;
      player.loadLevel = levelIndex;
      player.nextLoadLevel = levelIndex;
      setSelectedQualityLabel(
        qualityLevels[levelIndex]?.label || `Level ${levelIndex + 1}`,
      );
      flashQualityNotice(
        qualityLevels[levelIndex]?.label || `Level ${levelIndex + 1}`,
      );
    }

    setSettingsView(null);
  };

  const togglePlay = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused || video.ended) {
      if (video.ended) {
        video.currentTime = 0;
      }

      video.play().catch(() => {});
      revealControls();
      return;
    }

    video.pause();
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextMuted = !(video.muted || video.volume === 0);
    video.muted = nextMuted;

    if (!nextMuted && video.volume === 0) {
      video.volume = volume > 0 ? volume : 1;
    }
  };

  const handleSeek = (event) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextTime = Number(event.target.value);
    if (Number.isFinite(nextTime)) {
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const handleVolumeChange = (event) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextVolume = Number(event.target.value);
    if (!Number.isFinite(nextVolume)) {
      return;
    }

    video.volume = nextVolume;
    video.muted = nextVolume === 0;
  };

  const setSpeed = (rate) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.playbackRate = rate;
    setPlaybackRate(rate);
    setSettingsView(null);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const fsEl =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null;

    if (fsEl === container) {
      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
      await exit?.call(document);
      return;
    }

    const enter =
      container.requestFullscreen ||
      container.webkitRequestFullscreen ||
      container.mozRequestFullScreen ||
      container.msRequestFullscreen;
    await enter?.call(container);
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;

    if (!video || !document.pictureInPictureEnabled) {
      return;
    }

    if (document.pictureInPictureElement === video) {
      await document.exitPictureInPicture?.();
      return;
    }

    await video.requestPictureInPicture?.();
  };

  const revealControls = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 1000);
  };

  // Keyboard controls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handleKeyDown = (event) => {
      const video = videoRef.current;
      const container = containerRef.current;
      if (!video || !container) return;

      // Handle keys when container is focused, a child is focused, or in fullscreen
      const fsEl =
        document.fullscreenElement || document.webkitFullscreenElement || null;
      const isFocused =
        document.activeElement === container ||
        container.contains(document.activeElement) ||
        fsEl === container;
      if (!isFocused) return;

      switch (event.key) {
        case " ":
        case "Space": {
          event.preventDefault();
          if (video.paused || video.ended) {
            if (video.ended) video.currentTime = 0;
            video.play().catch(() => {});
            revealControls();
          } else {
            video.pause();
            setShowControls(true);
            if (hideControlsTimerRef.current)
              window.clearTimeout(hideControlsTimerRef.current);
          }
          break;
        }
        case "ArrowRight": {
          event.preventDefault();
          video.currentTime = Math.min(
            video.currentTime + 5,
            video.duration || 0,
          );
          container.focus({ preventScroll: true });
          revealControls();
          break;
        }
        case "ArrowLeft": {
          event.preventDefault();
          video.currentTime = Math.max(video.currentTime - 5, 0);
          container.focus({ preventScroll: true });
          revealControls();
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          const nextUp = Math.min((video.muted ? 0 : video.volume) + 0.1, 1);
          video.volume = nextUp;
          video.muted = false;
          container.focus({ preventScroll: true });
          revealControls();
          break;
        }
        case "ArrowDown": {
          event.preventDefault();
          const nextDown = Math.max((video.muted ? 0 : video.volume) - 0.1, 0);
          video.volume = nextDown;
          if (nextDown === 0) video.muted = true;
          container.focus({ preventScroll: true });
          revealControls();
          break;
        }
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (hideControlsTimerRef.current) {
        window.clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, []);

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const settingsPanelOpen = settingsView !== null;

  const seekFillPct =
    duration > 0 ? (Math.min(currentTime, duration) / duration) * 100 : 0;
  const volumeFillPct = isMuted ? 0 : volume * 100;

  const seekRangeStyle = {
    background: `linear-gradient(to right, var(--primary) ${seekFillPct}%, rgba(255,255,255,0.2) ${seekFillPct}%)`,
  };
  const volumeRangeStyle = {
    background: `linear-gradient(to right, var(--primary) ${volumeFillPct}%, rgba(255,255,255,0.2) ${volumeFillPct}%)`,
  };

  const rangeThumbCss = `
    .player-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      margin-top: -4px;
    }
    .player-range::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      border: none;
    }
    .player-range::-webkit-slider-runnable-track {
      height: 4px;
      border-radius: 9999px;
    }
    .player-range::-moz-range-track {
      height: 4px;
      border-radius: 9999px;
    }
  `;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseMove={revealControls}
      onMouseEnter={revealControls}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      onClick={revealControls}
      className={`group relative overflow-hidden bg-black outline-none ${isFullscreen ? "" : "border border-border"} ${className}`.trim()}
      style={isFullscreen ? { width: "100vw", height: "100vh" } : undefined}
    >
      {/* Scoped range input styles */}
      <style>{rangeThumbCss}</style>

      {/* Quality-switch toast */}
      {qualityNotice ? (
        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-white/15 bg-black/75 px-3 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur">
          {qualityNotice}
        </div>
      ) : null}

      {/* Video element */}
      <video
        ref={videoRef}
        controls={false}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        className={`w-full cursor-pointer bg-black ${isFullscreen ? "h-full object-contain" : "max-h-[70vh]"}`}
      />

      {/* Big centered play button (shown when paused, hides on hover while playing) */}
      {manifestState === "ready" ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={`absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white shadow-xl backdrop-blur-sm border border-white/30 transition-all duration-200
            ${showControls ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"}
          `}
        >
          {isPlaying ? (
            <Pause className="h-7 w-7" />
          ) : (
            <Play className="h-7 w-7 translate-x-0.5" />
          )}
        </button>
      ) : null}

      {/* Buffering spinner */}
      {isBuffering && manifestState === "ready" ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      ) : null}

      {/* Controls bar — fades 1s after last interaction when playing */}
      {manifestState === "ready" ? (
        <div
          className={`absolute inset-x-0 bottom-0 z-10 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {/* Gradient */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

          {/* Settings panel */}
          {settingsPanelOpen ? (
            <div
              className="absolute bottom-14 right-3 z-20 w-52 overflow-hidden rounded-xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur-xl"
              ref={qualityMenuRef}
            >
              {/* Main menu */}
              {settingsView === "main" ? (
                <div>
                  {canShowQualityControl ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-sm text-white hover:bg-white/10 border-b border-white/10"
                      onClick={() => setSettingsView("quality")}
                    >
                      <span className="text-white/60 text-xs uppercase tracking-widest font-medium">
                        Quality
                      </span>
                      <span className="text-[color:var(--primary)] text-xs">
                        {selectedQualityLabel} ›
                      </span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-sm text-white hover:bg-white/10"
                    onClick={() => setSettingsView("speed")}
                  >
                    <span className="text-white/60 text-xs uppercase tracking-widest font-medium">
                      Speed
                    </span>
                    <span className="text-[color:var(--primary)] text-xs">
                      {playbackRate === 1 ? "Normal" : `${playbackRate}x`} ›
                    </span>
                  </button>
                </div>
              ) : null}

              {/* Quality submenu */}
              {settingsView === "quality" ? (
                <div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 border-b border-white/10 px-4 py-2.5 text-xs text-white/60 hover:bg-white/10"
                    onClick={() => setSettingsView("main")}
                  >
                    ‹{" "}
                    <span className="uppercase tracking-widest font-medium">
                      Quality
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between px-4 py-2 text-sm text-white hover:bg-white/10 ${selectedQualityLabel === "Auto" ? "text-[color:var(--primary)]" : ""}`}
                    onClick={() => applyQuality(-1)}
                  >
                    <span>Auto</span>
                    {selectedQualityLabel === "Auto" && (
                      <span className="text-xs text-green-400">✓</span>
                    )}
                  </button>
                  {qualityLevels.map((level) => (
                    <button
                      key={level.index}
                      type="button"
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm text-white hover:bg-white/10 ${selectedQualityLabel === level.label ? "text-[color:var(--primary)]" : ""}`}
                      onClick={() => applyQuality(level.index)}
                    >
                      <span>{level.label}</span>
                      {selectedQualityLabel === level.label && (
                        <span className="text-xs text-green-400">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Speed submenu */}
              {settingsView === "speed" ? (
                <div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 border-b border-white/10 px-4 py-2.5 text-xs text-white/60 hover:bg-white/10"
                    onClick={() => setSettingsView("main")}
                  >
                    ‹{" "}
                    <span className="uppercase tracking-widest font-medium">
                      Speed
                    </span>
                  </button>
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm text-white hover:bg-white/10 ${playbackRate === rate ? "text-[color:var(--primary)]" : ""}`}
                      onClick={() => setSpeed(rate)}
                    >
                      <span>{rate === 1 ? "Normal" : `${rate}x`}</span>
                      {playbackRate === rate && (
                        <span className="text-xs text-green-400">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="relative px-3 pb-3 pt-8">
            {/* Progress bar */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || currentTime || 0)}
              onChange={handleSeek}
              aria-label="Seek"
              className="player-range mb-3 w-full cursor-pointer appearance-none bg-transparent"
              style={seekRangeStyle}
            />

            {/* Controls row */}
            <div className="flex items-center gap-2 text-white">
              {/* Play/Pause */}
              <button
                type="button"
                onClick={togglePlay}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 translate-x-0.5" />
                )}
              </button>

              {/* Volume */}
              <button
                type="button"
                onClick={toggleMute}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
              >
                <VolumeIcon className="h-4 w-4" />
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume"
                className="player-range hidden w-20 cursor-pointer appearance-none bg-transparent sm:block"
                style={volumeRangeStyle}
              />

              {/* Time */}
              <div className="flex items-center gap-1 text-[11px] font-medium tabular-nums text-white/70 ml-1">
                <span>{formatTime(currentTime)}</span>
                <span className="text-white/30">/</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="flex-1" />

              {/* Settings button (quality + speed panel) */}
              <button
                type="button"
                onClick={() =>
                  setSettingsView(settingsPanelOpen ? null : "main")
                }
                className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition ${settingsPanelOpen ? "bg-white/25 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
                aria-label="Settings"
              >
                <Settings2 className="h-4 w-4" />
              </button>

              {/* Picture-in-Picture */}
              <button
                type="button"
                onClick={togglePictureInPicture}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={
                  isPictureInPicture ? "Close mini player" : "Open mini player"
                }
                disabled={!document.pictureInPictureEnabled}
              >
                <PictureInPicture2 className="h-4 w-4" />
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label={
                  isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                }
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Loading / error overlay */}
      {manifestState !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-4 py-8 text-center backdrop-blur-sm">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium text-white">
              {manifestState === "error"
                ? "Video unavailable"
                : "Video not ready yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isBuffering
                ? "Buffering video for playback..."
                : manifestMessage || "Preparing video for playback..."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getMarkdownText(children) {
  if (Array.isArray(children)) {
    return children.join("");
  }

  return typeof children === "string" ? children : "";
}

function VideoLink({ href, children }) {
  const resolvedHref = resolveBackendAssetUrl(href);
  const label = getMarkdownText(children) || href;

  return (
    <figure className="my-4 overflow-hidden border border-border bg-black/95 shadow-sm">
      <HlsVideoPlayer src={resolvedHref} />
    </figure>
  );
}

// When a paragraph's sole child is a video link, react-markdown still wraps it
// in a <p>, making <figure> a descendant of <p> — invalid HTML. We detect that
// case and render a <div> instead so block-level elements are always valid.
function MarkdownParagraph({ children }) {
  const kids = Array.isArray(children) ? children : [children];
  const isVideoOnly =
    kids.length === 1 &&
    kids[0]?.type === MarkdownLink &&
    VIDEO_FILE_PATTERN.test(kids[0]?.props?.href ?? "");

  if (isVideoOnly) {
    return <div>{children}</div>;
  }

  return <p>{children}</p>;
}

function MarkdownLink({ href, children, ...props }) {
  const label = getMarkdownText(children);
  const resolvedHref =
    href?.startsWith("#") ||
    href?.startsWith("mailto:") ||
    href?.startsWith("tel:")
      ? href
      : resolveBackendAssetUrl(href);

  if (href && VIDEO_FILE_PATTERN.test(href)) {
    return <VideoLink href={href}>{children}</VideoLink>;
  }

  return (
    <a href={resolvedHref} target="_blank" rel="noreferrer" {...props}>
      {label || children}
    </a>
  );
}

export function MarkdownContent({ content, className }) {
  if (!content) {
    return null;
  }

  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed max-w-none",
        "[&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold",
        "[&_h3]:text-lg [&_h3]:font-medium [&_p]:text-muted-foreground",
        "[&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1",
        className,
      )}
    >
      <ReactMarkdown components={{ a: MarkdownLink, p: MarkdownParagraph }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
