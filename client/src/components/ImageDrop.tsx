import { useRef, useState } from "react";
import { uploadImage } from "../api";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  height?: number;
}

// Drag-and-drop (or click-to-pick) image uploader. Uploads to the server and
// returns the stored URL so portraits persist and can be swapped as new art
// is released.
export function ImageDrop({ value, onChange, label = "Drop image here", height = 180 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Not an image file");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        className={"image-drop" + (over ? " over" : "") + (value ? " has-image" : "")}
        style={{ height }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        {value ? (
          <img src={value} alt="preview" />
        ) : (
          <span className="image-drop-label">{busy ? "Uploading…" : label}</span>
        )}
        {busy && value && <span className="image-drop-label overlay">Uploading…</span>}
      </div>
      <div className="image-drop-actions">
        <button type="button" className="btn tiny" onClick={() => inputRef.current?.click()}>
          {value ? "Replace" : "Choose file"}
        </button>
        {value && (
          <button type="button" className="btn tiny ghost" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
        {err && <span className="error-text">{err}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
