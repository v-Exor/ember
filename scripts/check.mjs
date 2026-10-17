import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
let checked = 0;
for (const file of ['index.html','report.html']) {
  const html = await readFile(resolve(root, file), 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    const href = match[1]; if (/^(?:https?:|data:|mailto:)/.test(href)) continue;
    if (href.startsWith('/')) throw new Error(`${file}: root-relative asset ${href} breaks repository paths.`);
    const path = resolve(dirname(resolve(root,file)), decodeURIComponent(href));
    await stat(path).catch(() => { throw new Error(`${file}: missing referenced file ${href}`); }); checked++;
  }
  const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), m => m[1]);
  if (new Set(ids).size !== ids.length) throw new Error(`${file}: duplicate element id.`);
  for (const match of html.matchAll(/href="#([^"\s]+)"/g)) if (!ids.includes(match[1])) throw new Error(`${file}: missing anchor ${match[1]}`);
}
for (const file of ['app.js','processing.js','worker.js','site-config.js','scripts/serve.mjs']) {
  const run = spawnSync(process.execPath, ['--check', resolve(root,file)], { encoding:'utf8' }); if (run.status !== 0) throw new Error(run.stderr); checked++;
}
const manifest = JSON.parse(await readFile(resolve(root,'assets/data/manifest.json')));
for (const [filename, spec] of Object.entries(manifest.files)) if ((await stat(resolve(root,'assets/data',filename))).size !== spec.bytes) throw new Error(`${filename}: unexpected size.`);
const html = await readFile(resolve(root,'index.html'),'utf8');
for (let task = 1; task <= 4; task++) if (!html.includes(`id="task${task}"`)) throw new Error(`Missing Task ${task}.`);
const answerCount = (html.split('id="questions"')[1].split('id="conclusion"')[0].match(/<details>/g) || []).length;
if (answerCount !== 9) throw new Error(`Expected 9 answers, found ${answerCount}.`);
for (const file of ['README.md','SOURCE_MAP.md','VALIDATION.md','.nojekyll','.github/workflows/pages.yml','downloads/python-lab5.zip']) await stat(resolve(root,file));
console.log(`Static checks passed: ${checked} source/asset checks, all 4 tasks, all 9 answers, relative paths, binary sizes, and deployment files.`);
