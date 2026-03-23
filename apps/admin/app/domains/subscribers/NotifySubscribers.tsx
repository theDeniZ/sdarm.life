'use client';

import { useState } from 'react';
import { broadcastEmail, type BroadcastPost } from './repository';

interface Post extends BroadcastPost {
  id: number;
}

let _id = 0;
const newPost = (): Post => ({ id: ++_id, title: '', excerpt: '', href: '' });

export default function NotifySubscribers() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [locale, setLocale] = useState<'de' | 'en' | 'all'>('all');
  const [posts, setPosts] = useState<Post[]>([newPost()]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  function updatePost(id: number, field: keyof BroadcastPost, value: string) {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function removePost(id: number) {
    setPosts((ps) => ps.filter((p) => p.id !== id));
  }

  async function handleSend() {
    if (!subject || posts.some((p) => !p.title || !p.href)) return;
    if (!confirm(`Send to all ${locale === 'all' ? '' : locale.toUpperCase() + ' '}subscribers?`)) return;

    setSending(true);
    setStatus(null);
    try {
      const { sent } = await broadcastEmail({
        subject,
        posts: posts.map(({ title, excerpt, href }) => ({ title, excerpt, href })),
        locale: locale === 'all' ? undefined : locale,
      });
      setStatus({ ok: true, msg: `Sent to ${sent} subscriber${sent !== 1 ? 's' : ''}.` });
      setSubject('');
      setPosts([newPost()]);
      setLocale('all');
    } catch (err) {
      setStatus({ ok: false, msg: String(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <button
        className="btn-primary"
        onClick={() => {
          setOpen((o) => !o);
          setStatus(null);
        }}
      >
        {open ? 'Cancel' : 'Notify subscribers'}
      </button>

      {open && (
        <div className="form-card" style={{ marginTop: 16 }}>
          <div className="form-row">
            <label>Subject *</label>
            <input
              type="text"
              required
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label>Send to</label>
            <select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)}>
              <option value="all">All subscribers</option>
              <option value="de">DE subscribers only</option>
              <option value="en">EN subscribers only</option>
            </select>
          </div>

          <div className="form-row">
            <label>Posts</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.map((post, i) => (
                <div
                  key={post.id}
                  style={{
                    display: 'grid',
                    gap: 8,
                    padding: '12px 14px',
                    background: 'var(--admin-bg, #f4f2ef)',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#7a7470' }}>Post {i + 1}</span>
                    {posts.length > 1 && (
                      <button
                        type="button"
                        className="btn-danger"
                        style={{ padding: '2px 8px', fontSize: 12 }}
                        onClick={() => removePost(post.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Title *"
                    value={post.title}
                    onChange={(e) => updatePost(post.id, 'title', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Excerpt (optional)"
                    value={post.excerpt}
                    onChange={(e) => updatePost(post.id, 'excerpt', e.target.value)}
                  />
                  <input
                    type="url"
                    placeholder="Link (https://…) *"
                    value={post.href}
                    onChange={(e) => updatePost(post.id, 'href', e.target.value)}
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn-ghost"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setPosts((ps) => [...ps, newPost()])}
              >
                + Add post
              </button>
            </div>
          </div>

          {status && (
            <div className={status.ok ? 'state-empty' : 'state-error'} style={{ padding: '6px 0' }}>
              {status.msg}
            </div>
          )}

          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={handleSend}
              disabled={sending || !subject || posts.some((p) => !p.title || !p.href)}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
