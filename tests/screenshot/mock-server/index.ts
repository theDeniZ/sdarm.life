import * as http from 'http';
import {
  mockConfig,
  mockSongbook,
  mockSongList,
  mockSong,
  mockTreasure,
  mockPostList,
  mockPost,
  mockBibleTranslation,
  mockBibleBooks,
  mockBibleChapter,
  mockSblQuarter,
  mockSblBible,
} from './data';

const PORT = 8788;

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

function sendJSON(res: http.ServerResponse, status: number, data: JsonValue) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = (req.url || '').split('?')[0];

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Health check
  if (url === '/health') {
    sendJSON(res, 200, { ok: true });
    return;
  }

  // /api/v1/sbl/quarter/:lang/:year/:quarter — the weekly lesson booklet
  if (url.startsWith('/api/v1/sbl/quarter/')) {
    sendJSON(res, 200, mockSblQuarter);
    return;
  }

  // /api/v1/sbl/bible/:version
  if (url.startsWith('/api/v1/sbl/bible/')) {
    sendJSON(res, 200, mockSblBible);
    return;
  }

  // /api/v1/config
  if (url === '/api/v1/config') {
    sendJSON(res, 200, mockConfig);
    return;
  }

  // /api/v1/songbooks
  if (url === '/api/v1/songbooks') {
    sendJSON(res, 200, [mockSongbook]);
    return;
  }

  // /api/v1/songbooks/gesangbuch
  if (url === '/api/v1/songbooks/gesangbuch') {
    sendJSON(res, 200, mockSongbook);
    return;
  }

  // /api/v1/songbooks/gesangbuch/songs
  if (url === '/api/v1/songbooks/gesangbuch/songs') {
    sendJSON(res, 200, { items: mockSongList, total: 2 });
    return;
  }

  // /api/v1/songs/1
  if (url === '/api/v1/songs/1') {
    sendJSON(res, 200, mockSong);
    return;
  }

  // /api/v1/treasures
  if (url === '/api/v1/treasures') {
    sendJSON(res, 200, { items: [mockTreasure], total: 1 });
    return;
  }

  // /api/v1/bible/*
  if (url === '/api/v1/bible/translations') {
    sendJSON(res, 200, { items: [mockBibleTranslation], total: 1 });
    return;
  }
  if (url === '/api/v1/bible/translations/delut') {
    sendJSON(res, 200, mockBibleTranslation);
    return;
  }
  if (url === '/api/v1/bible/translations/delut/books') {
    sendJSON(res, 200, { items: mockBibleBooks, total: mockBibleBooks.length });
    return;
  }
  if (url === '/api/v1/bible/translations/delut/books/JHN') {
    sendJSON(res, 200, mockBibleBooks[2]);
    return;
  }
  if (url === '/api/v1/bible/translations/delut/books/JHN/chapters/3') {
    sendJSON(res, 200, mockBibleChapter);
    return;
  }

  // /api/v1/posts
  if (url === '/api/v1/posts') {
    sendJSON(res, 200, { items: mockPostList, total: 3 });
    return;
  }

  // /api/v1/posts/test-post
  if (url === '/api/v1/posts/test-post') {
    sendJSON(res, 200, mockPost);
    return;
  }

  // /api/v1/geocode
  if (url.startsWith('/api/v1/geocode')) {
    sendJSON(res, 200, []);
    return;
  }

  // Default 404
  sendJSON(res, 404, { error: 'Not found' });
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Mock API server listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
