import { describe, expect, it } from 'vitest';
import { buildIndexMarkdown, stripChords, stripRichTags } from './markdown';

// Pure logic, no D1/KV — safe to test directly (see docs/testing.md).

describe('stripChords', () => {
  it('removes inline chord annotations, keeping the words', () => {
    expect(stripChords('[G]Amazing [C]grace how [D]sweet')).toBe('Amazing grace how sweet');
  });

  it('leaves lyrics with no chords untouched', () => {
    expect(stripChords('Amazing grace how sweet')).toBe('Amazing grace how sweet');
  });

  it('handles chords with extensions', () => {
    expect(stripChords('[Am7]Some [G/B]words')).toBe('Some words');
  });
});

describe('stripRichTags', () => {
  it('strips <em> and keeps the inner text', () => {
    expect(stripRichTags('Komm, <em>wie du bist</em>')).toBe('Komm, wie du bist');
  });

  it('strips self-closing/void tags like <br></br>', () => {
    expect(stripRichTags('Bevor<br></br>alles losgeht')).toBe('Bevoralles losgeht');
  });

  it('leaves plain text untouched', () => {
    expect(stripRichTags('Plain text')).toBe('Plain text');
  });
});

describe('buildIndexMarkdown', () => {
  it('lists every endpoint and links the SBL quarterly JSON', () => {
    const { body, status, headers } = buildIndexMarkdown('https://api.sdarm.life');
    expect(status).toBe(200);
    expect(headers['Content-Type']).toBe('text/markdown; charset=utf-8');
    expect(body).toContain('/api/v1/llm/bible');
    expect(body).toContain('/api/v1/llm/site');
    expect(body).toContain('/api/v1/llm/posts');
    expect(body).toContain('/api/v1/llm/songbooks');
    expect(body).toContain('/api/v1/llm/treasures');
    expect(body).toContain('https://sbl.sdarm.life/data/index.json');
  });
});
