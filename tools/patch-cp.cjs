/**
 * Node 24 cpSync fails with EACCES on Docker overlay/bind-mount filesystems
 * when copying directories (it tries to chmod the dest dir which is rejected).
 * File copies work fine. This patch replaces directory cpSync with shell cp -r.
 */
'use strict';

const fs = require('fs');
const { execSync } = require('child_process');
const originalCpSync = fs.cpSync;

fs.cpSync = function patchedCpSync(src, dest, opts) {
  let isSrcDir = false;
  try {
    isSrcDir = fs.statSync(src).isDirectory();
  } catch (_) {}

  if (isSrcDir && opts && opts.recursive) {
    execSync(`mkdir -p ${JSON.stringify(dest)} && cp -r ${JSON.stringify(src + '/.')} ${JSON.stringify(dest + '/')}`, { stdio: 'inherit' });
    return;
  }

  return originalCpSync.call(this, src, dest, opts);
};
