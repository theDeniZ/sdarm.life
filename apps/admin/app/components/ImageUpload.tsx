'use client';

import { useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';
const R2 = process.env.NEXT_PUBLIC_R2_URL ?? 'https://images.sdarm.life';

function adminHeaders(): HeadersInit {
  return {
    'CF-Access-Client-Id': process.env.NEXT_PUBLIC_CF_CLIENT_ID ?? '',
    'CF-Access-Client-Secret': process.env.NEXT_PUBLIC_CF_CLIENT_SECRET ?? '',
  };
}

type Props = {
  value: string | null; // R2 key already saved
  onChange: (key: string) => void;
};

export default function ImageUpload({ value, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(value ? `${R2}/${value}` : null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ok' | 'err'>('idle');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === null) setPreview(null);
  }, [value]);

  async function upload(file: File) {
    setStatus('uploading');
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
      // keep the blob URL as preview — R2 objects aren't served locally
      onChange(key);
      setStatus('ok');
    } catch {
      setStatus('err');
    }
  }

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    upload(files[0]);
  }

  return (
    <div
      className={`image-drop${drag ? ' drag-over' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      {preview && <img src={preview} alt="preview" className="image-preview" />}
      <div className="image-drop-label">{status === 'uploading' ? 'Uploading…' : 'Drop image or click to browse'}</div>
      {status === 'ok' && <div className="upload-status ok">Uploaded</div>}
      {status === 'err' && <div className="upload-status err">Upload failed — try again</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
}
