// SectionPhotos — camera button + thumbnail strip for a measure section.
// Photos are the installer's eyes: he approves a pool he never saw. Each photo
// is tagged with its section so the installer views them grouped.
//
// Reuses the EXISTING private lead-photo storage bucket and constraints from
// the July 6 photo fix (images only, size-capped, randomized paths). Uploads
// happen in the background as shot; a failed upload (bad backyard signal)
// stays queued/retryable and never blocks completing the measure.
//
// Value shape stored on the measure: array of
//   { path, section, status: "uploading"|"done"|"error", localUrl? }
import { useState } from "react";
import { Camera, Loader2, AlertCircle, RotateCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { GREEN_DARK, GREEN_TINT } from "../ui";

const fs = (m) => ({ fontSize: `calc(var(--ms,1rem)*${m})` });
const BUCKET = "lead-photos"; // same bucket as the customer-upload fix
const MAX_MB = 5;

function randomName(section, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const rand = crypto.randomUUID();
  return `measure/${section}/${rand}.${ext}`;
}

export default function SectionPhotos({ section, leadId, photos, onChange }) {
  const [error, setError] = useState("");
  const list = photos ?? [];

  async function uploadOne(file) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Photo over ${MAX_MB}MB skipped`);
      return;
    }
    const path = `${leadId}/${randomName(section, file)}`;
    const localUrl = URL.createObjectURL(file);
    // Optimistic: show it immediately as uploading
    const entry = { path, section, status: "uploading", localUrl };
    const next = [...list, entry];
    onChange(next);

    try {
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      onChange((cur) =>
        (cur ?? next).map((p) =>
          p.path === path ? { ...p, status: "done" } : p,
        ),
      );
    } catch (e) {
      console.error("photo upload failed", e);
      // Stays in the list as error — retryable, doesn't block the measure
      onChange((cur) =>
        (cur ?? next).map((p) =>
          p.path === path ? { ...p, status: "error" } : p,
        ),
      );
    }
  }

  async function retry(entry) {
    // Re-fetch the local blob if we still have it; otherwise the tech re-shoots
    if (!entry.localUrl) return;
    try {
      const blob = await fetch(entry.localUrl).then((r) => r.blob());
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(entry.path, blob, { upsert: true });
      if (upErr) throw upErr;
      onChange((cur) =>
        cur.map((p) => (p.path === entry.path ? { ...p, status: "done" } : p)),
      );
    } catch (e) {
      console.error("retry failed", e);
    }
  }

  function handleFiles(e) {
    setError("");
    const files = Array.from(e.target.files || []);
    files.forEach(uploadOne);
    e.target.value = ""; // allow re-selecting the same file
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label
          className="flex items-center gap-1.5 rounded-lg cursor-pointer font-medium"
          style={{
            background: GREEN_TINT,
            color: GREEN_DARK,
            padding: "8px 12px",
            ...fs(0.8),
          }}
        >
          <Camera size={16} /> Add photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
        </label>
        {list.length > 0 && (
          <span className="text-neutral-500" style={fs(0.75)}>
            {list.filter((p) => p.status === "done").length}/{list.length} uploaded
          </span>
        )}
      </div>

      {error && (
        <div className="text-amber-700 mt-1" style={fs(0.72)}>
          {error}
        </div>
      )}

      {list.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {list.map((p) => (
            <div key={p.path} className="relative w-16 h-16 rounded-lg overflow-hidden bg-neutral-200">
              {p.localUrl && (
                <img src={p.localUrl} alt={`${section} photo`} className="w-full h-full object-cover" />
              )}
              {p.status === "uploading" && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 size={18} className="text-white animate-spin" />
                </div>
              )}
              {p.status === "error" && (
                <button
                  onClick={() => retry(p)}
                  className="absolute inset-0 bg-red-900/50 flex flex-col items-center justify-center text-white"
                  aria-label="Retry upload"
                >
                  <AlertCircle size={16} />
                  <RotateCw size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
