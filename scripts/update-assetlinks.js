/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      opts[key] = val;
    }
  }
  return opts;
}

function getFingerprint({ keystore, alias, storepass }) {
  const cmd = 'keytool';
  const keytoolArgs = ['-list', '-v', '-keystore', keystore, '-alias', alias];
  if (storepass) keytoolArgs.push('-storepass', storepass);
  const res = spawnSync(cmd, keytoolArgs, { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error('[assetlinks] keytool failed. Ensure JDK is installed and params are correct.');
    console.error(res.stderr || res.stdout);
    process.exit(1);
  }
  const out = res.stdout || '';
  // Try to match common formats
  const m = out.match(/SHA-?256\s*:?\s*([A-Fa-f0-9:]+)/);
  if (!m) {
    console.error('[assetlinks] Could not find SHA256 fingerprint in keytool output.');
    process.exit(1);
  }
  const fp = m[1].toUpperCase().replace(/\s+/g, '');
  return fp;
}

function updateAssetLinks({ assetlinksPath, packageName, fingerprint }) {
  const p = path.resolve(assetlinksPath);
  if (!fs.existsSync(p)) {
    console.error(`[assetlinks] File not found: ${p}`);
    process.exit(1);
  }
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  const entry = json[0] || {};
  entry.relation = ["delegate_permission/common.handle_all_urls"];
  entry.target = entry.target || {};
  entry.target.namespace = 'android_app';
  entry.target.package_name = packageName || 'com.laksh.finance';
  entry.target.sha256_cert_fingerprints = [fingerprint];
  json[0] = entry;
  fs.writeFileSync(p, JSON.stringify(json, null, 2) + '\n');
  console.log(`[assetlinks] Updated ${p} with fingerprint: ${fingerprint}`);
}

function main() {
  const opts = parseArgs();
  const keystore = opts.keystore || process.env.KEYSTORE_PATH || 'android-app/app/keystore.jks';
  const alias = opts.alias || process.env.KEYSTORE_ALIAS || 'laksh-key';
  const storepass = opts.storepass || process.env.KEYSTORE_PASS || '';
  const assetlinksPath = opts.assetlinks || 'public/.well-known/assetlinks.json';
  const packageName = opts.package || process.env.ANDROID_PACKAGE || 'com.laksh.finance';

  const fp = getFingerprint({ keystore, alias, storepass });
  updateAssetLinks({ assetlinksPath, packageName, fingerprint: fp });
}

main();
