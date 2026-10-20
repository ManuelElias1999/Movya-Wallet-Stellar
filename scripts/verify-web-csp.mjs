import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const output = process.argv[2] ?? 'dist';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : entry.isFile() && entry.name.endsWith('.html') ? [path] : [];
  }));
  return nested.flat();
}

function directive(policy, name) {
  return policy.split(';').map(value => value.trim()).find(value => value === name || value.startsWith(`${name} `)) ?? '';
}

function decodeAttribute(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function assertSafePolicy(policy, label) {
  const scripts = directive(policy, 'script-src');
  if (!scripts) throw new Error(`${label}: falta script-src.`);
  if (scripts.includes("'unsafe-inline'") || scripts.includes("'unsafe-eval'")) throw new Error(`${label}: script-src permite código inseguro.`);
  return scripts;
}

const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
const header = vercel.headers?.flatMap(rule => rule.headers ?? []).find(item => item.key?.toLowerCase() === 'content-security-policy')?.value;
if (!header) throw new Error('vercel.json no contiene Content-Security-Policy.');
const vercelScripts = assertSafePolicy(header, 'vercel.json');
if (directive(header, 'frame-ancestors') !== "frame-ancestors 'none'") throw new Error("vercel.json debe bloquear frame-ancestors.");

const files = await htmlFiles(output);
if (!files.length) throw new Error(`No se encontraron archivos HTML en ${output}. Ejecuta expo export primero.`);
const seen = new Set();
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const encodedMeta = html.match(/<meta[^>]+http-equiv=(["'])Content-Security-Policy\1[^>]+content=(["'])(.*?)\2[^>]*>/i)?.[3];
  if (!encodedMeta) throw new Error(`${file}: falta la CSP meta de producción.`);
  const metaScripts = assertSafePolicy(decodeAttribute(encodedMeta), file);
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(match[1])) continue;
    const hash = `'sha256-${createHash('sha256').update(match[2], 'utf8').digest('base64')}'`;
    seen.add(hash);
    if (!metaScripts.includes(hash)) throw new Error(`${file}: la CSP meta no permite el script inline ${hash}.`);
    if (!vercelScripts.includes(hash)) throw new Error(`${file}: la CSP de Vercel no permite el script inline ${hash}.`);
  }
}
if (!seen.size) throw new Error('La exportación no contiene ningún script inline para verificar.');
console.log(`CSP verificada en ${files.length} páginas; hashes inline permitidos: ${[...seen].join(', ')}`);
