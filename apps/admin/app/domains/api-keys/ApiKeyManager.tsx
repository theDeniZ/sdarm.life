'use client';

import { useState, useEffect } from 'react';
import { fmtDate } from '../../lib/format';
import { fetchApiKeys, createApiKey, revokeApiKey } from './repository';
import type { ApiKey } from './types';
import { API } from '../../lib/api';

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setKeys(await fetchApiKeys());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { key, apiKey } = await createApiKey(newName.trim());
      setKeys((prev) => [...prev, apiKey]);
      setNewKey(key);
      setNewName('');
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(k: ApiKey) {
    if (!confirm(`Revoke key "${k.name}" (${k.prefix}…)?`)) return;
    await revokeApiKey(k.id);
    setKeys((prev) => prev.map((x) => (x.id === k.id ? { ...x, revokedAt: new Date().toISOString() } : x)));
  }

  async function handleCopy() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="state-loading">Loading…</div>;

  return (
    <>
      {newKey && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">API Key Created</h3>
            <p className="modal-warning">Copy this key now — it will not be shown again.</p>
            <div className="key-display">
              <code className="key-value">{newKey}</code>
              <button className="btn-ghost" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              className="btn-primary"
              onClick={() => {
                setNewKey(null);
                setCopied(false);
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>API Keys</h1>
        {!showForm && (
          <button className="btn-ghost" onClick={() => window.open(API + '/api/ui', '_blank')}>
            Swagger UI
          </button>
        )}
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            New Key
          </button>
        )}
      </div>

      {showForm && (
        <div className="apikey-create-form">
          <input
            className="filter-input"
            placeholder="Key name (e.g. admin app, mobile)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button className="btn-primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              setShowForm(false);
              setNewName('');
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {keys.length === 0 ? (
        <div className="state-empty">No API keys yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Prefix</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className={k.revokedAt ? 'row-muted' : ''}>
                  <td>{k.name}</td>
                  <td>
                    <code className="key-prefix">{k.prefix}…</code>
                  </td>
                  <td>{fmtDate(k.createdAt)}</td>
                  <td>
                    {k.revokedAt ? (
                      <span className="badge badge-revoked">Revoked</span>
                    ) : (
                      <span className="badge badge-active">Active</span>
                    )}
                  </td>
                  <td>
                    {!k.revokedAt && (
                      <button className="btn-danger" onClick={() => handleRevoke(k)}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
