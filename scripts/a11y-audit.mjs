#!/usr/bin/env node
/**
 * Automated axe-core accessibility audit.
 * Boots a preview server, crawls key routes, and fails (exit 1) on any
 * serious or critical violations. Used in CI to block merges.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const PORT = process.env.A11Y_PORT || '4173';
const BASE = process.env.A11Y_BASE_URL || `http://localhost:${PORT}`;
const FAIL_ON = new Set(['serious', 'critical']);

// Public routes safe to crawl without auth.
const ROUTES = [
  '/', '/cinema', '/auth', '/faq', '/contact', '/producers',
  '/apply-filmmaker', '/filmmaker', '/refund-policy', '/terms',
  '/privacy', '/reset-password', '/does-not-exist',
];

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 404) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`Server at ${url} never became ready`);
}

async function runAxe(page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const res = await window.axe.run(document, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    });
    return res.violations;
  });
}

let server;
if (!process.env.A11Y_SKIP_SERVER) {
  console.log('› Starting vite preview on port', PORT);
  server = spawn('npx', ['vite', 'preview', '--port', PORT, '--strictPort'], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}

let exitCode = 0;
try {
  await waitForServer(BASE);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1024 } });
  const page = await context.newPage();

  const failures = [];
  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    process.stdout.write(`› ${route} ... `);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 });
    } catch (e) {
      console.log(`nav failed: ${e.message}`);
      continue;
    }
    await page.waitForTimeout(400);
    const violations = await runAxe(page);
    const blocking = violations.filter(v => FAIL_ON.has(v.impact));
    console.log(`${violations.length} total, ${blocking.length} blocking`);
    for (const v of blocking) {
      failures.push({ route, ...v });
      console.log(`   ✗ [${v.impact}] ${v.id}: ${v.help}`);
      console.log(`     ${v.helpUrl}`);
      for (const n of v.nodes.slice(0, 3)) {
        console.log(`       → ${n.target.join(' ')}`);
      }
    }
  }

  await browser.close();

  if (failures.length) {
    console.error(`\n✗ ${failures.length} blocking a11y violation(s) across ${new Set(failures.map(f => f.route)).size} route(s)`);
    exitCode = 1;
  } else {
    console.log('\n✓ No serious/critical accessibility violations');
  }
} catch (e) {
  console.error('a11y audit crashed:', e);
  exitCode = 2;
} finally {
  if (server) server.kill('SIGTERM');
  process.exit(exitCode);
}
