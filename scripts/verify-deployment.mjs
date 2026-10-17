import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import '../processing.js';

const base = new URL('https://v-exor.github.io/LabAct5_CSST106/');
const project = new URL('../', import.meta.url);
const hash = bytes => createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
const downloaded = new Map();
async function download(path) {
  if (downloaded.has(path)) return downloaded.get(path);
  const promise = (async () => {
    const url = new URL(path, base);
    assert.equal(url.origin, base.origin);
    assert.ok(url.pathname.startsWith(base.pathname), `Asset escaped the repository path: ${path}`);
    const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'LabAct5-Deployment-Verification' } });
    assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
    return { bytes: await response.arrayBuffer(), url: url.href, type: response.headers.get('content-type') };
  })();
  downloaded.set(path, promise);
  return promise;
}
const asText = data => new TextDecoder().decode(data.bytes);
const index = await download('index.html');
assert.equal(hash(index.bytes), hash(await readFile(new URL('index.html', project))));
const report = await download('report.html');
assert.equal(hash(report.bytes), hash(await readFile(new URL('report.html', project))));
const paths = new Set(['app.js', 'processing.js', 'worker.js', 'site-config.js', 'styles.css', 'assets/data/manifest.json', 'assets/data/model.bin', 'assets/data/faces.bin']);
for (const html of [asText(index), asText(report)]) {
  for (const [, path] of html.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    if (!/^(?:https?:|data:|mailto:)/.test(path)) paths.add(path.replace(/^\.\//, ''));
  }
}
await Promise.all(Array.from(paths, download));
const manifest = JSON.parse(asText(await download('assets/data/manifest.json')));
assert.equal(hash((await download('assets/data/manifest.json')).bytes), hash(await readFile(new URL('assets/data/manifest.json', project))));
const modelData = (await download('assets/data/model.bin')).bytes;
const faceData = (await download('assets/data/faces.bin')).bytes;
assert.equal(hash(modelData), manifest.files['model.bin'].sha256);
assert.equal(hash(faceData), manifest.files['faces.bin'].sha256);
const P = globalThis.LabPCA, model = P.decodeModel(manifest, modelData), faces = new Float32Array(faceData);
const predictions = manifest.testIndices.map(index => P.classify(P.project(P.getFace(faces, index), model), model).label);
assert.deepEqual(predictions, manifest.results.predictions);
const evaluation = P.evaluate(manifest.testIndices.map(index => manifest.labels[index]), predictions, 7);
assert.equal(evaluation.correct, 219);
assert.equal(P.cumulative(model.ratios).findIndex(value => value >= .9) + 1, 85);
assert.ok(asText(await download('site-config.js')).includes('https://github.com/v-Exor/LabAct5_CSST106'));
for (let task = 1; task <= 4; task++) assert.ok(asText(index).includes(`id="task${task}"`));
assert.equal((asText(report).match(/<article>/g) || []).length, 9);
const output = { verifiedAt: new Date().toISOString(), website: base.href, repository: 'https://github.com/v-Exor/LabAct5_CSST106', httpAssetsVerified: downloaded.size, matchingPythonPredictions: predictions.length, correct: evaluation.correct, total: evaluation.total, accuracy: evaluation.accuracy, minimumComponentsFor90Percent: 85, exactModelAndPixelHashes: true, reportAnswers: 9 };
await mkdir(new URL('artifacts/', project), { recursive: true });
await writeFile(new URL('artifacts/deployment-verification.json', project), JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));

