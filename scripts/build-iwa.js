/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appDir = path.resolve(__dirname, '..');
const distDir = path.join(appDir, 'dist');
const iwaDir = path.join(appDir, 'iwa');
const outBundle = path.join(iwaDir, 'app.swbn');
const domain = process.env.IWA_DOMAIN || 'https://finma-ea199.web.app';
const keyFile = process.env.IWA_KEY || path.join(iwaDir, 'private-key.pem');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function which(cmd) {
  const res = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return res.status === 0 ? res.stdout.trim() : null;
}

async function main() {
  console.log('[IWA] Preparing Isolated Web App bundle');
  ensureDir(iwaDir);

  if (!fs.existsSync(distDir)) {
    console.log('[IWA] dist/ not found. Building app...');
    const build = spawnSync('npm', ['run', 'build'], { cwd: appDir, stdio: 'inherit' });
    if (build.status !== 0) {
      console.log('[IWA] Vite build failed. Fix build errors and retry.');
      return 0;
    }
  }

  if (!fs.existsSync(keyFile)) {
    console.log(`[IWA] Private key not found at ${keyFile}`);
    console.log('[IWA] Generate a private key (example):');
    console.log(`    openssl genpkey -algorithm RSA -out ${keyFile} -pkeyopt rsa_keygen_bits:2048`);
  }

  const genSwbn = which('gen-signed-web-bundle');
  if (genSwbn) {
    console.log(`[IWA] Found gen-signed-web-bundle at ${genSwbn}`);
    console.log('[IWA] Creating signed web bundle...');
    const args = ['--private-key', keyFile, '--domain', domain, '--output', outBundle, distDir];
    const res = spawnSync(genSwbn, args, { stdio: 'inherit' });
    if (res.status === 0) {
      console.log(`[IWA] Signed bundle created: ${outBundle}`);
      return 0;
    }
    console.log('[IWA] gen-signed-web-bundle failed. Check inputs and try again.');
    return 0;
  }

  // Try optional unsigned bundle via wbn (if available)
  try {
    const wbn = await import('wbn');
    console.log('[IWA] "wbn" module available. Creating unsigned web bundle...');
    const builder = new wbn.BundleBuilder(domain);
    function addDir(dir, base = '') {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const full = path.join(dir, entry);
        const rel = path.join(base, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) addDir(full, rel);
        else builder.addFilePath(`/` + rel.replace(/\\/g, '/'), full);
      }
    }
    addDir(distDir);
    const outWbn = path.join(iwaDir, 'app.wbn');
    fs.writeFileSync(outWbn, builder.createBundle());
    console.log(`[IWA] Unsigned bundle created: ${outWbn}`);
    console.log('[IWA] For production IWA, a signed web bundle (.swbn) is required.');
    console.log(`      Install Chromium tooling and run: gen-signed-web-bundle --private-key ${keyFile} --domain ${domain} --output ${outBundle} ${distDir}`);
  } catch (e) {
    console.log('[IWA] gen-signed-web-bundle not found and "wbn" module unavailable.');
    console.log('[IWA] Please install one of the following tools:');
    console.log('  - Chromium gen-signed-web-bundle (recommended for .swbn)');
    console.log('  - npm install wbn (for unsigned .wbn dev bundles)');
    console.log('[IWA] Once installed, re-run: npm run build:iwa');
  }

  return 0;
}

await main();
