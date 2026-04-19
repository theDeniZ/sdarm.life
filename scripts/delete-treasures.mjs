#!/usr/bin/env node
/**
 * Delete all treasures of a given language from the API.
 *
 * Usage:
 *   node scripts/delete-english-treasures.mjs --language <code> [--api-url <url>] [--api-key <key>]
 *
 * Examples:
 *   node scripts/delete-english-treasures.mjs --language en
 *   node scripts/delete-english-treasures.mjs --language de --api-url https://api.sdarm.life/api/v1 --api-key <key>
 *
 * Defaults: api-url = http://localhost:8787/api/v1, api-key = dev
 */

const args = process.argv.slice(2);

function getArg(flagName) {
  const index = args.indexOf(flagName);
  return index !== -1 ? args[index + 1] : undefined;
}

const language = getArg('--language');
const apiUrl = getArg('--api-url') ?? 'http://localhost:8787/api/v1';
const apiKey = getArg('--api-key') ?? 'dev';

if (!language) {
  console.error('Error: --language is required');
  console.error('Usage: node scripts/delete-english-treasures.mjs --language <code>');
  process.exit(1);
}

console.log(`Fetching ${language} treasures from ${apiUrl} …`);

let deletedCount = 0;
let offset = 0;
const limit = 100;

async function fetchAndDelete() {
  const res = await fetch(`${apiUrl}/admin/treasures?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Error ${res.status}: ${text}`);
    process.exit(1);
  }

  const data = await res.json();
  const treasures = data.items || [];

  if (treasures.length === 0) {
    console.log(`Done: ${deletedCount} ${language} treasures deleted.`);
    process.exit(0);
  }

  const filteredTreasures = treasures.filter((t) => t.language === language);

  for (const treasure of filteredTreasures) {
    const deleteRes = await fetch(`${apiUrl}/admin/treasures/${treasure.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      console.error(`Error deleting ${treasure.id}: ${deleteRes.status} - ${text}`);
    } else {
      deletedCount++;
      console.log(`Deleted: ${treasure.title} (ID: ${treasure.id})`);
    }
  }

  offset += limit;
  await fetchAndDelete();
}

await fetchAndDelete();
