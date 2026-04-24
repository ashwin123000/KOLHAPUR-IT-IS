import { useEffect, useRef } from "react";

export default function CameraMonitor({ active, onSnapshot, onError, snapshotMs = 30000 }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let stream;
    let intervalId;
    let cancelled = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        intervalId = window.setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          const canvas = document.createElement("canvas");
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, 320, 240);
          await onSnapshot(canvas.toDataURL("image/jpeg", 0.7));
        }, snapshotMs);
      } catch (error) {
        onError?.(error);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [active, onError, onSnapshot, snapshotMs]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Camera Monitor</p>
        <span className={`text-xs ${active ? "text-emerald-400" : "text-slate-500"}`}>{active ? "Live" : "Off"}</span>
      </div>
      <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full rounded-lg bg-slate-900 object-cover" />
      <p className="mt-3 text-xs text-slate-500">Snapshots are captured during step 1 and trimmed to the latest 30 frames.</p>
    </div>
  );
}
