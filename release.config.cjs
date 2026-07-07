'use strict';

const isRc = process.env.RELEASE_CHANNEL === 'rc';

/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
  branches: [
    'main',
    { name: 'develop', prerelease: 'rc' },
  ],
  plugins: isRc
    ? [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        ['@semantic-release/npm', { npmPublish: false }],
        ['@semantic-release/git', {
          assets: ['package.json'],
          message: 'chore(release): ${nextRelease.version}',
        }],
        '@semantic-release/github',
      ]
    : [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
        ['@semantic-release/npm', { npmPublish: false }],
        ['@semantic-release/git', {
          assets: ['CHANGELOG.md', 'package.json'],
          message: 'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}',
        }],
        '@semantic-release/github',
      ],
};
