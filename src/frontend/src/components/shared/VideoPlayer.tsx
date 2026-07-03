import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  /** Called once per session when playback starts. */
  onFirstPlay?: () => void;
  ocid?: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoPlayer({
  src,
  poster,
  title,
  className,
  onFirstPlay,
  ocid = "video.player",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrent(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    const onPlay = () => {
      setPlaying(true);
      if (!started) {
        setStarted(true);
        onFirstPlay?.();
      }
    };
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [onFirstPlay, started]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const value = Number(e.target.value);
    v.currentTime = value;
    setCurrent(value);
  };

  const fullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void v.requestFullscreen();
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl bg-black",
        className,
      )}
      data-ocid={ocid}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="aspect-video w-full"
        onClick={togglePlay}
        onKeyUp={() => {}}
        aria-label={title ?? "Video player"}
      >
        <track kind="captions" />
      </video>

      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play video"
          data-ocid={`${ocid}.play_button`}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-smooth hover:bg-black/40"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-smooth group-hover:scale-105">
            <Play className="size-7 fill-current" aria-hidden />
          </span>
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 translate-y-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 opacity-100 transition-opacity">
        <div className="flex items-center gap-3 text-white">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-white hover:bg-white/10 hover:text-white"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            data-ocid={`${ocid}.toggle_button`}
          >
            {playing ? (
              <Pause className="size-5" aria-hidden />
            ) : (
              <Play className="size-5" aria-hidden />
            )}
          </Button>

          <span className="text-xs tabular-nums text-white/80">
            {formatTime(current)} / {formatTime(duration)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={seek}
            aria-label="Seek"
            data-ocid={`${ocid}.seek`}
            className="slider-video h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/20"
            style={{
              background: `linear-gradient(to right, var(--primary) ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
            }}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-white hover:bg-white/10 hover:text-white"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            data-ocid={`${ocid}.mute_button`}
          >
            {muted ? (
              <VolumeX className="size-5" aria-hidden />
            ) : (
              <Volume2 className="size-5" aria-hidden />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-white hover:bg-white/10 hover:text-white"
            onClick={fullscreen}
            aria-label="Fullscreen"
            data-ocid={`${ocid}.fullscreen_button`}
          >
            <Maximize className="size-5" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
