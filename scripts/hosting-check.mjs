import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const origin = new URL(process.env.CINEPLEX_DIRECTORY_URL ?? 'http://cds3.cineplexbd.net/index.php');
if (!['http:', 'https:'].includes(origin.protocol) || origin.hostname !== 'cds3.cineplexbd.net' || origin.username || origin.password || origin.port) {
  throw new Error('Use the configured CineplexBD directory origin.');
}
const database = process.env.DATABASE_URL ?? 'file:./dev.db';
const dbPath = database.startsWith('file:') ? database.slice(5) : null;
const directory = dbPath ? dirname(dbPath.startsWith('/') ? dbPath : resolve('prisma', dbPath)) : null;
const report = {
  nodeVersion: process.versions.node,
  node24Supported: Number(process.versions.node.split('.')[0]) >= 24,
  memoryLimitMB: process.constrainedMemory() ? Math.round(process.constrainedMemory() / 1024 / 1024) : null,
  productionBuildExists: false,
  databaseDirectoryWritable: false,
  cronCommandAvailable: spawnSync('sh', ['-c', 'command -v crontab'], { stdio: 'pipe' }).status === 0,
  originReachable: false,
  originStatus: null,
  originFailure: null,
};
try { await access('.next/BUILD_ID', constants.R_OK); report.productionBuildExists = true; } catch { /* Build still needed. */ }
if (directory) {
  const probe = resolve(directory, `.pinflix-write-check-${process.pid}`);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(probe, 'probe', { flag: 'wx', mode: 0o600 });
    report.databaseDirectoryWritable = true;
  } catch { /* Report readiness without revealing configured paths. */ }
  finally { await rm(probe, { force: true }).catch(() => {}); }
}
try {
  const response = await fetch(origin, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
  report.originStatus = response.status;
  report.originReachable = response.ok;
  await response.body?.cancel();
  if (!response.ok) report.originFailure = response.status >= 300 && response.status < 400 ? 'redirect_requires_origin_configuration' : 'http_error';
} catch (error) {
  report.originFailure = error?.name === 'TimeoutError' ? 'timeout' : 'network_error';
}
console.log(JSON.stringify(report, null, 2));
if (!report.node24Supported || !report.databaseDirectoryWritable || !report.originReachable) process.exitCode = 1;
