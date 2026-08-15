'use client';

import { useRef, useState } from 'react';
import { API, adminHeaders } from '../../lib/api';

type Props = {
  value: string | null;
  onChange: (key: string | null) => void;
};

export default function EpubPicker({ value, onChange }: Props) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'ok' | 'err'>('idle');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploadStatus('uploading');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/api/v1/admin/treasures/epub/upload`, {
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

  function clear() {
    onChange(null);
    setUploadStatus('idle');
  }

  return (
    <div className="image-picker">
      {value && (
        <div className="image-picker-preview">
          <div style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 13 }}>{value}</div>
          <button type="button" className="image-picker-clear" onClick={clear}>
            ✕ Remove
          </button>
        </div>
      )}

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
        <div className="image-drop-label">
          {uploadStatus === 'uploading'
            ? 'Uploading…'
            : value
              ? 'Drop EPUB or click to replace'
              : 'Drop EPUB or click to browse'}
        </div>
        {uploadStatus === 'ok' && <div className="upload-status ok">Uploaded</div>}
        {uploadStatus === 'err' && <div className="upload-status err">Upload failed — must be a .epub file</div>}
        <input
          ref={inputRef}
          type="file"
          accept=".epub,application/epub+zip"
          style={{ display: 'none' }}
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
