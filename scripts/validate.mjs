import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = ['index.html','app.js','style.css','supabase-config.js'];
for (const file of required) {
  if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing required file: ${file}`);
}

const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const js = fs.readFileSync(path.join(root,'app.js'),'utf8');
const css = fs.readFileSync(path.join(root,'style.css'),'utf8');
const config = fs.readFileSync(path.join(root,'supabase-config.js'),'utf8');

if (/service[_-]?role|SUPABASE_SERVICE_ROLE|SECRET_KEY/i.test(config)) throw new Error('Service-role or secret Supabase credential found in browser configuration.');
if (!/createClient\s*\(/.test(config)) throw new Error('Supabase client configuration is missing createClient().');
if (/supabase\.auth\.admin\s*\./.test(js)) throw new Error('Client bundle must not use Supabase admin auth APIs.');
if (/\b(?:eval|Function)\s*\(/.test(js)) throw new Error('Dynamic code execution is not allowed in app.js.');
if (/\.update\s*\(\s*\{[^}]*\b(?:role|is_admin)\s*:/s.test(js)) throw new Error('Client code must not update role or is_admin directly.');

if (!css.includes('@media(prefers-reduced-motion:reduce)')) throw new Error('Missing reduced-motion accessibility rule.');
if (!html.includes('name="viewport"')) throw new Error('Missing responsive viewport meta tag.');

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1]);
const duplicates = [...new Set(ids.filter((id,i) => ids.indexOf(id) !== i))];
if (duplicates.length) throw new Error(`Duplicate HTML id(s): ${duplicates.join(', ')}`);

for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"'#]+)["'][^>]*>/gi)) {
  const ref = match[1];
  if (/^(?:https?:|data:|#)/i.test(ref)) continue;
  if (!fs.existsSync(path.join(root,ref))) throw new Error(`Missing local asset: ${ref}`);
}

const inlineHandlers = [...html.matchAll(/\bon(?:click|change|input|keydown|submit)=["']([^"']+)["']/gi)]
  .flatMap(m => [...m[1].matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(x => x[1]));
const knownGlobals = new Set([...js.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g)].map(m => m[1]));
const functionNames = new Set([...js.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
const inlineFunctionNames = new Set([...html.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
const ignored = new Set(['if','searchJobs','resetView','openAccount','toggleFavoritesOnly','clearFavorites','updateTravelGuide']);
const missingHandlers = [...new Set(inlineHandlers.filter(name => !ignored.has(name) && !knownGlobals.has(name) && !functionNames.has(name) && !inlineFunctionNames.has(name)))];
if (missingHandlers.length) throw new Error(`Unknown inline handler(s): ${missingHandlers.join(', ')}`);

for (const match of js.matchAll(/target=["']_blank["'][^>]*>/gi)) {
  if (!/\brel=["'][^"']*noopener(?:\s+|\b)[^"']*["']/i.test(match[0])) {
    throw new Error('Generated target=_blank link in app.js is missing rel=noopener.');
  }
}

for (const match of js.matchAll(/href=["']\$\{[^}]+\}["']/g)) {
  if (!/safeExternalUrl/.test(js.slice(Math.max(0, match.index - 500), match.index + 500))) {
    throw new Error('Generated external href should pass through safeExternalUrl().');
  }
}
for (const match of html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) {
  if (!/\brel=["'][^"']*noopener(?:\s+|\b)[^"']*["']/i.test(match[0])) {
    throw new Error('External target=_blank link is missing rel=noopener.');
  }
}

console.log(`Validation passed: ${required.length} required files, ${ids.length} unique HTML ids, ${inlineHandlers.length} inline handler references.`);