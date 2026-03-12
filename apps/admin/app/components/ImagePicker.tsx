'use client';

import { useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';
const R2  = process.env.NEXT_PUBLIC_R2_URL  ?? 'https://images.sdarm.life';

function adminHeaders(): HeadersInit {
  return {
    'CF-Access-Client-Id':     process.env.NEXT_PUBLIC_CF_CLIENT_ID     ?? '',
    'CF-Access-Client-Secret': process.env.NEXT_PUBLIC_CF_CLIENT_SECRET ?? '',
  };
}

type R2Image = { key: string };

type Props = {
  value: string | null;
  onChange: (key: string | null) => void;
};

export default function ImagePicker({ value, onChange }: Props) {
  const [libOpen, setLibOpen]     = useState(false);
  const [preview, setPreview]     = useState<string | null>(
    value ? `${R2}/${value}` : null,
  );
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'ok' | 'err'>('idle');
  const [drag, setDrag]           = useState(false);
  const [images, setImages]       = useState<R2Image[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === null) setPreview(null);
    else if (value)     setPreview(`${R2}/${value}`);
  }, [value]);

  useEffect(() => {
    if (!libOpen) return;
    setLibLoading(true);
    fetch(`${API}/api/v1/admin/images?limit=48`, { headers: adminHeaders() })
      .then((r) => r.json() as Promise<{ items: R2Image[] }>)
      .then(({ items }) => setImages(items))
      .catch(() => setImages([]))
      .finally(() => setLibLoading(false));
  }, [libOpen]);

  async function upload(file: File) {
    setUploadStatus('uploading');
    setPreview(URL.createObjectURL(file));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/api/v1/admin/images/upload`, {
        method: 'POST',
        headers: adminHeaders(),
        body: form,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { key } = (await res.json()) as { key: string };
      onChange(key);
      setUploadStatus('ok');
    } catch {
      setUploadStatus('err');
    }
  }

  function onFiles(files: FileList | null) {
    if (files?.length) upload(files[0]);
  }

  function pickFromLibrary(img: R2Image) {
    onChange(img.key);
    setPreview(`${R2}/${img.key}`);
    setLibOpen(false);
    setUploadStatus('idle');
  }

  function clear() {
    onChange(null);
    setPreview(null);
    setLibOpen(false);
    setUploadStatus('idle');
  }

  return (
    <div className="image-picker">

      {preview && (
        <div className="image-picker-preview">
          <img src={preview} alt="preview" />
          <button type="button" className="image-picker-clear" onClick={clear}>
            ✕ Remove
          </button>
        </div>
      )}

      <div
        className={`image-drop${drag ? ' drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
      >
        <div className="image-drop-label">
          {uploadStatus === 'uploading' ? 'Uploading…' : 'Drop image or click to browse'}
        </div>
        {uploadStatus === 'ok'  && <div className="upload-status ok">Uploaded</div>}
        {uploadStatus === 'err' && <div className="upload-status err">Upload failed — try again</div>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      <button
        type="button"
        className={`image-picker-tab${libOpen ? ' active' : ''}`}
        onClick={() => setLibOpen((o) => !o)}
      >
        ⊞ Pick from library
      </button>

      {libOpen && (
        <div className="image-picker-library">
          {libLoading ? (
            <div className="state-loading" style={{ padding: '16px' }}>Loading…</div>
          ) : images.length === 0 ? (
            <div className="state-empty" style={{ padding: '16px' }}>No images yet.</div>
          ) : (
            <div className="image-picker-grid">
              {images.map((img) => (
                <button
                  key={img.key}
                  type="button"
                  className={`image-picker-item${value === img.key ? ' selected' : ''}`}
                  onClick={() => pickFromLibrary(img)}
                  title={img.key}
                >
                  <img src={`${R2}/${img.key}`} alt={img.key} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
