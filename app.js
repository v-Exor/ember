const $ = id => document.getElementById(id);
const P = globalThis.LabPCA;
const state = { manifest: null, model: null, pixels: null, load: null, manifestLoad: null, index: null, upload: null, uploadName: '', page: 0, predictions: null, report: null, worker: null, evaluating: false, scores: null, python: '' };
const formatPercent = (value, digits = 2) => `${(value * 100).toFixed(digits)}%`;
const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
const safeRead = key => { try { return localStorage.getItem(key); } catch { return null; } };
const safeWrite = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500); }
function errorMessage(message) { $('load-error').textContent = message; $('load-error').hidden = false; }
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob), anchor = node('a');
  anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const saveText = (text, filename, type = 'text/plain') => saveBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename);
async function checkedFetch(url) { const response = await fetch(url); if (!response.ok) throw new Error(`Could not load ${url.split('/').pop()} (HTTP ${response.status}). Check your connection and retry.`); return response; }
async function loadManifest() {
  if (state.manifest) return state.manifest;
  if (!state.manifestLoad) state.manifestLoad = checkedFetch('./assets/data/manifest.json').then(r => r.json()).then(manifest => {
    if (manifest.schema !== 1 || manifest.samples !== 1288) throw new Error('The laboratory data version is not supported.');
    state.manifest = manifest; renderReference(manifest); return manifest;
  }).catch(error => { state.manifestLoad = null; throw error; });
  return state.manifestLoad;
}
async function verifyFile(buffer, spec, name) {
  if (buffer.byteLength !== spec.bytes) throw new Error(`${name} is incomplete. Retry loading the laboratory.`);
  if (globalThis.crypto?.subtle) {
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), byte => byte.toString(16).padStart(2, '0')).join('');
    if (hash !== spec.sha256) throw new Error(`${name} failed its integrity check. Refresh and retry.`);
  }
}
async function ensureData() {
  if (state.model) return;
  if (!state.load) state.load = (async () => {
    $('load-error').hidden = true;
    $('model-status').textContent = 'Loading real pixels and model · about 11.4 MiB…';
    $('dataset-status').textContent = 'Downloading LFW pixels and fitted PCA/SVM parameters…';
    const manifest = await loadManifest();
    const [modelBuffer, facesBuffer] = await Promise.all([
      checkedFetch('./assets/data/model.bin').then(r => r.arrayBuffer()),
      checkedFetch('./assets/data/faces.bin').then(r => r.arrayBuffer()),
    ]);
    await Promise.all([verifyFile(modelBuffer, manifest.files['model.bin'], 'model.bin'), verifyFile(facesBuffer, manifest.files['faces.bin'], 'faces.bin')]);
    state.model = P.decodeModel(manifest, modelBuffer); state.modelBuffer = modelBuffer; state.facesBuffer = facesBuffer; state.pixels = new Float32Array(facesBuffer);
    state.cumulative = P.cumulative(state.model.ratios);
    state.index = manifest.testIndices[0];
    state.trainSet = new Set(manifest.trainIndices); state.testSet = new Set(manifest.testIndices);
    populateChoices(); renderDataset(); updateInput(); renderVariance(85);
    $('dataset-output').hidden = false;
    $('model-status').textContent = 'Laboratory ready · all processing stays on this device';
    $('dataset-status').textContent = 'Loaded 1,288 original float32 images · 1,030 train / 258 test';
    $('load-data').textContent = 'Refresh dataset view';
  })().catch(error => {
    state.load = null; state.model = null; state.pixels = null;
    $('model-status').textContent = 'Load failed · use an experiment button to retry';
    $('dataset-status').textContent = 'The dataset could not be loaded.';
    errorMessage(error.message); throw error;
  });
  return state.load;
}
async function runAction(button, status, action) {
  button.disabled = true; button.setAttribute('aria-busy', 'true');
  if (status) status.textContent = 'Loading the laboratory…';
  try { await ensureData(); await action(); } catch (error) { if (status) status.textContent = error.message; errorMessage(error.message); }
  finally { button.disabled = false; button.removeAttribute('aria-busy'); }
}
function populateChoices() {
  const identity = $('identity-filter'); identity.replaceChildren();
  const all = node('option', 'All seven identities'); all.value = 'all'; identity.append(all);
  state.manifest.names.forEach((name, index) => { const option = node('option', `${name} · ${state.manifest.classCounts[index]} images`); option.value = String(index); identity.append(option); });
  const test = $('test-face'); test.replaceChildren();
  state.manifest.testIndices.forEach((index, position) => { const option = node('option', `Test ${position} · ${state.manifest.names[state.manifest.labels[index]]}`); option.value = String(position); test.append(option); });
}
function paintFace(canvas, values, normalize = false) {
  let low = 0, range = 1;
  if (normalize) { low = Math.min(...values); range = Math.max(...values) - low || 1; }
  const image = new ImageData(37, 50);
  for (let i = 0; i < 1850; i++) { const pixel = Math.round(Math.min(1, Math.max(0, (values[i] - low) / range)) * 255); image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = pixel; image.data[i * 4 + 3] = 255; }
  const temporary = document.createElement('canvas'); temporary.width = 37; temporary.height = 50; temporary.getContext('2d').putImageData(image, 0, 0);
  const context = canvas.getContext('2d'); context.imageSmoothingEnabled = false; context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(temporary, 0, 0, canvas.width, canvas.height);
}
function faceCanvas(values, label, width = 111, height = 150, normalize = false) {
  const canvas = node('canvas'); canvas.width = width; canvas.height = height; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', label); paintFace(canvas, values, normalize); return canvas;
}
function currentFace() { return state.upload || P.getFace(state.pixels, state.index); }
function updateInput() {
  if (!state.model) return;
  const name = state.manifest.names[state.manifest.labels[state.index]];
  $('input-title').textContent = state.upload ? `Uploaded image · ${state.uploadName}` : `LFW dataset image ${state.index} · ${name}`;
  $('input-note').textContent = state.upload ? 'Center-cropped and resized to 37 × 50 grayscale. No face detection or alignment. Recognition can only choose a known LFW identity.' : 'Choose another dataset face in Task 1 or a held-out face in Task 4. Original preprocessed float32 pixels are preserved.';
  if (!state.upload) { const position = state.manifest.testIndices.indexOf(state.index); $('test-face').value = position >= 0 ? String(position) : ''; }
  $('recognition-output').hidden = true;
  $('recognition-status').textContent = 'Input selected. Run recognition to get a new prediction.';
  if (!$('projection-output').hidden) renderProjection();
}
function selectFace(index) {
  state.index = index; state.upload = null; state.uploadName = ''; $('face-upload').value = ''; $('upload-error').hidden = true; updateInput(); renderDataset();
}
function renderDataset() {
  const identity = $('identity-filter').value, partition = $('partition-filter').value;
  const selected = state.manifest.labels.map((_, i) => i).filter(i => (identity === 'all' || state.manifest.labels[i] === Number(identity)) && (partition === 'all' || (partition === 'train' ? state.trainSet : state.testSet).has(i)));
  const size = 18, pages = Math.max(1, Math.ceil(selected.length / size)); state.page = Math.min(state.page, pages - 1);
  $('face-gallery').replaceChildren();
  selected.slice(state.page * size, (state.page + 1) * size).forEach(index => {
    const name = state.manifest.names[state.manifest.labels[index]], training = state.trainSet.has(index);
    const button = node('button', undefined, 'face-tile'); button.type = 'button'; button.setAttribute('aria-pressed', String(index === state.index && !state.upload)); button.title = `Use dataset image ${index}, ${name}, ${training ? 'training' : 'test'} set`;
    button.append(faceCanvas(P.getFace(state.pixels, index), `${name}, dataset image ${index}`), node('strong', name), node('small', `#${index} · ${training ? 'Training' : 'Test'} · y=${state.manifest.labels[index]}`));
    button.addEventListener('click', () => selectFace(index)); $('face-gallery').append(button);
  });
  $('faces-page').textContent = `${selected.length} images · page ${state.page + 1} of ${pages}`;
  $('faces-prev').disabled = state.page === 0; $('faces-next').disabled = state.page >= pages - 1;
  $('selected-face-label').textContent = `${state.manifest.names[state.manifest.labels[state.index]]} · image ${state.index}`;
  $('selected-face-meta').textContent = `Shape (50, 37) → (1850,) · y = ${state.manifest.labels[state.index]} · ${state.trainSet.has(state.index) ? 'training' : 'test'} partition`;
  const values = P.getFace(state.pixels, state.index).subarray(0, 64), context = $('flatten-canvas').getContext('2d');
  context.clearRect(0, 0, 600, 130); context.fillStyle = '#77705d'; context.font = '12px Segoe UI'; context.fillText('FIRST 64 PIXELS · ROW-MAJOR ORDER · VALUES 0–1', 5, 18);
  values.forEach((value, i) => { context.fillStyle = i % 2 ? '#f1ae76' : '#c8681d'; context.fillRect(5 + i * 9.1, 108 - value * 70, 6.5, value * 70); });
  context.strokeStyle = '#ddd5c7'; context.beginPath(); context.moveTo(4, 109); context.lineTo(594, 109); context.stroke();
}
function stats(container, entries) { container.replaceChildren(...entries.map(([label, value]) => { const div = node('div'); div.append(node('span', label), node('strong', value)); return div; })); }
function renderProjection() {
  const count = Number($('component-count').value), whiten = $('whiten').checked, face = currentFace();
  const start = performance.now(); state.scores = P.project(face, state.model, count, whiten); const reconstructed = P.reconstruct(state.scores, state.model, whiten);
  paintFace($('original-canvas'), face); paintFace($('reconstruction-canvas'), reconstructed); paintFace($('difference-canvas'), Float64Array.from(face, (value, i) => Math.abs(value - reconstructed[i]) * 5));
  $('reconstruction-caption').replaceChildren(document.createTextNode(`${count}-component reconstruction`), node('small', `Mean face + ${count} weighted patterns`));
  stats($('projection-stats'), [['RETAINED COMPONENTS', `${count} / 150`], ['TRAINING VARIANCE', formatPercent(state.cumulative[count - 1])], ['RECONSTRUCTION MSE', P.mse(face, reconstructed).toFixed(6)], ['FEATURE REDUCTION', formatPercent(1 - count / 1850, 1)]]);
  drawWeights(state.scores); $('weights-unit').textContent = whiten ? 'Whitened · unit training variance' : 'Unwhitened PCA scores';
  $('projection-status').textContent = `Calculated live · ${count} components · ${(performance.now() - start).toFixed(1)} ms`;
  $('projection-output').hidden = false; $('component-value').value = String(count); $('variance-count').value = String(count); renderVariance(count);
}
function drawWeights(values) {
  const canvas = $('weights-canvas'), c = canvas.getContext('2d'), w = 1000, h = 220, left = 37, right = 18, zero = 108;
  c.clearRect(0, 0, w, h); const maximum = Math.max(0.01, ...Array.from(values, Math.abs));
  c.strokeStyle = '#e3dfd3'; c.beginPath(); c.moveTo(left, zero); c.lineTo(w - right, zero); c.stroke();
  values.forEach((value, i) => { const step = (w - left - right) / values.length, size = value / maximum * 75; c.fillStyle = value >= 0 ? '#c9651c' : '#7e8c65'; c.fillRect(left + i * step, size >= 0 ? zero - size : zero, Math.max(1, step - 2), Math.abs(size)); });
  c.font = '13px Segoe UI'; c.fillStyle = '#626653'; c.fillText('0', 14, zero + 5); c.fillText('Component 1', left, h - 15); c.textAlign = 'right'; c.fillText(`Component ${values.length}`, w - right, h - 15); c.textAlign = 'left';
  canvas.setAttribute('aria-label', `${values.length} signed ${$('whiten').checked ? 'whitened' : 'unwhitened'} PCA component weights. Download the CSV for exact values.`);
}
function renderVariance(count) {
  if (!state.model) return;
  const canvas = $('variance-canvas'), c = canvas.getContext('2d'), width = 1000, height = 340;
  const left = 65, right = 25, top = 32, bottom = 58;
  const x = n => left + (n - 1) / 149 * (width - left - right), y = v => height - bottom - v * (height - top - bottom);
  c.clearRect(0, 0, width, height); c.font = '13px Segoe UI'; c.fillStyle = '#626653';
  for (let value = 0; value <= 1.001; value += .2) { c.strokeStyle = '#e8e4d9'; c.beginPath(); c.moveTo(left, y(value)); c.lineTo(width - right, y(value)); c.stroke(); c.fillText(`${Math.round(value * 100)}%`, 17, y(value) + 4); }
  [1,25,50,75,100,125,150].forEach(n => { c.fillStyle = '#626653'; c.fillText(String(n), x(n) - 8, height - 35); });
  function line(values, color, dashed) { c.strokeStyle = color; c.lineWidth = 2.4; c.setLineDash(dashed ? [6, 5] : []); c.beginPath(); for (let i = 0; i < 150; i++) { if (i) c.lineTo(x(i + 1), y(values[i])); else c.moveTo(x(1), y(values[0])); } c.stroke(); c.setLineDash([]); }
  line(state.cumulative, '#c35c13', false); line(state.model.fullCumulative, '#6b7f50', true);
  c.setLineDash([4, 5]); c.strokeStyle = '#b54934'; c.lineWidth = 1; c.beginPath(); c.moveTo(left, y(.9)); c.lineTo(width - right, y(.9)); c.stroke(); c.strokeStyle = '#786044'; c.beginPath(); c.moveTo(x(count), top); c.lineTo(x(count), height - bottom); c.stroke(); c.setLineDash([]);
  c.beginPath(); c.fillStyle = '#a3480e'; c.arc(x(count), y(state.cumulative[count - 1]), 5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#a3480e'; c.fillText('— Task 2 PCA', left, 18); c.fillStyle = '#526c37'; c.fillText('--- Exact full-SVD check', left + 130, 18); c.fillStyle = '#9d3b2b'; c.fillText('··· 90% threshold', left + 330, 18); c.fillStyle = '#626653'; c.textAlign = 'center'; c.fillText('Number of principal components', width / 2, height - 8); c.textAlign = 'left';
  $('variance-fallback').hidden = true; canvas.hidden = false;
  $('variance-observation').textContent = `At ${count} components: ${formatPercent(state.cumulative[count - 1], 4)} retained by Task 2 PCA; ${formatPercent(state.model.fullCumulative[count - 1], 4)} by the exact check. The minimum for 90% is 85 components. Variance is measured on the training set and is not recognition accuracy.`;
}
function renderEigenfaces() {
  const mode = $('eigen-mode').value, indices = mode === 'compare' ? [0, 1, 2, 147, 148, 149] : Array.from({ length: 12 }, (_, i) => i + (mode === 'last' ? 138 : 0));
  $('eigen-gallery').replaceChildren(...indices.map(index => {
    const figure = node('figure'); figure.append(faceCanvas(state.model.components.subarray(index * 1850, (index + 1) * 1850), `Eigenface ${index + 1}`, 148, 200, true));
    const caption = node('figcaption', `Eigenface ${index + 1}`); caption.append(node('small', `${formatPercent(state.model.ratios[index], 3)} variance`)); figure.append(caption); return figure;
  }));
  $('eigen-output').hidden = false; $('eigen-status').textContent = mode === 'compare' ? 'First 3 vs. last 3 of the retained 150 components.' : `Showing ${mode === 'last' ? 'eigenfaces 139–150' : 'the first 12 eigenfaces'} from the fitted training model.`; renderEigenDetail();
}
function renderEigenDetail() {
  const index = Number($('eigen-index').value) - 1; $('eigen-value').value = String(index + 1);
  paintFace($('eigen-detail'), state.model.components.subarray(index * 1850, (index + 1) * 1850), true);
  $('eigen-detail').setAttribute('aria-label', `Eigenface ${index + 1}, enlarged and contrast normalized`);
  const description = index === 0 ? 'Broad facial structure and overall facial contrast.' : index === 1 ? 'A pronounced left-to-right lighting gradient.' : index === 2 ? 'Central face versus outer-region shading.' : index >= 147 ? 'Finer fragmented patterns, potentially including subtle details, alignment changes, and noise.' : 'A training-data variation pattern; it can combine multiple appearance effects.';
  $('eigen-insight').textContent = `Eigenface ${index + 1} explains ${formatPercent(state.model.ratios[index], 4)} of training variance. ${description} Display contrast is normalized separately from the other eigenfaces.`;
}
function recognize() {
  const start = performance.now(), face = currentFace(), scores = P.project(face, state.model, 150, true), result = P.classify(scores, state.model);
  paintFace($('recognition-face'), face); $('predicted-name').textContent = state.manifest.names[result.label];
  let detail;
  if (state.upload) detail = 'Uploaded image · true identity unknown. This closed-set model always chooses one of the seven LFW classes.';
  else { const truth = state.manifest.labels[state.index], position = state.manifest.testIndices.indexOf(state.index); detail = `${position >= 0 ? `Held-out test image ${position}` : `Training image ${state.index} · excluded from test accuracy`} · true label: ${state.manifest.names[truth]} · ${truth === result.label ? 'correct prediction' : 'incorrect prediction'}.`; }
  $('prediction-detail').textContent = detail;
  $('vote-bars').replaceChildren(...state.manifest.names.map((name, i) => { const div = node('div'), bar = node('i'); bar.style.setProperty('--votes', `${result.votes[i] / 6 * 100}%`); div.append(node('span', name), bar, node('strong', `${result.votes[i]}/6`)); return div; }));
  $('recognition-output').hidden = false; $('recognition-status').textContent = `Calculated live in ${(performance.now() - start).toFixed(1)} ms · 150 whitened weights · bars show pairwise votes, not probabilities.`;
}
function renderReport(report, live) {
  $('report-body').replaceChildren();
  const row = (name, values) => { const tr = node('tr'); const label = node('th', name); label.scope = 'row'; tr.append(label, ...values.map(value => node('td', String(value)))); $('report-body').append(tr); };
  report.rows.forEach((result, i) => row(state.manifest.names[i], [result.precision.toFixed(2), result.recall.toFixed(2), result.f1.toFixed(2), result.support]));
  row('Macro average', [...report.macro.map(value => value.toFixed(2)), report.total]); row('Weighted average', [...report.weighted.map(value => value.toFixed(2)), report.total]);
  $('metric-accuracy').textContent = formatPercent(report.accuracy); $('metric-correct').textContent = `${report.correct} / ${report.total} correct`; $('metric-errors').textContent = String(report.total - report.correct); $('report-badge').textContent = live ? 'LIVE BROWSER RUN' : 'SAVED PYTHON RUN';
  const table = node('table'), caption = node('caption', 'Confusion matrix: true identity by predicted identity'), head = node('thead'), tr = node('tr');
  tr.append(node('th', 'True / Predicted')); state.manifest.names.forEach(name => { const th = node('th', name); th.scope = 'col'; tr.append(th); }); head.append(tr); const body = node('tbody');
  report.matrix.forEach((values, index) => { const line = node('tr'), th = node('th', state.manifest.names[index]); th.scope = 'row'; line.append(th); values.forEach((value, predicted) => { const cell = node('td', String(value)); if (index === predicted) cell.style.background = '#fff0db'; line.append(cell); }); body.append(line); });
  table.append(caption, head, body); $('confusion-matrix').replaceChildren(table);
}
function renderReference(manifest) {
  const truth = manifest.testIndices.map(i => manifest.labels[i]); renderReport(P.evaluate(truth, manifest.results.predictions, 7), false);
}
function stopEvaluation(message) {
  state.worker?.terminate(); state.worker = null; state.evaluating = false; $('evaluate-test').disabled = false; $('cancel-evaluation').hidden = true; $('evaluation-progress').hidden = true;
  if (message) $('evaluation-status').textContent = message;
}
async function evaluateTest() {
  if (state.evaluating) return;
  state.evaluating = true; $('evaluate-test').disabled = true;
  try {
    await ensureData();
    $('evaluation-status').textContent = 'Starting live evaluation on the held-out test set…'; $('cancel-evaluation').hidden = false; $('evaluation-progress').hidden = false; $('evaluation-progress').value = 0;
    const start = performance.now(); const worker = new Worker(new URL('./worker.js', import.meta.url)); state.worker = worker;
    worker.onerror = () => stopEvaluation('Evaluation could not start. Reload the page and retry, or use the included Python script.');
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') worker.postMessage({ type: 'evaluate' });
      if (data.type === 'progress') { $('evaluation-progress').value = data.completed; $('evaluation-status').textContent = `Evaluating ${data.completed} / ${data.total} test faces…`; }
      if (data.type === 'error') stopEvaluation(data.message);
      if (data.type === 'complete') {
        state.predictions = data.predictions; state.report = data.report; renderReport(data.report, true);
        const agreement = data.predictions.filter((label, i) => label === state.manifest.results.predictions[i]).length;
        $('results-provenance').textContent = `Live browser evaluation: 258 held-out LFW faces projected with the fitted 150-component whitened PCA and classified with the exported RBF SVM. ${agreement} / 258 predictions agree with the saved Python reference. Uploaded images and reconstruction settings do not alter this evaluation.`;
        stopEvaluation(`Completed live in ${((performance.now() - start) / 1000).toFixed(2)} s · ${data.report.correct} / 258 correct · ${formatPercent(data.report.accuracy)} accuracy · Python agreement ${agreement} / 258.`);
        if (!$('failure-gallery').hidden) renderFailures(); toast('Evaluation complete. Results and the confusion matrix have been updated.');
      }
    };
    const modelCopy = state.modelBuffer.slice(0), facesCopy = state.facesBuffer.slice(0);
    worker.postMessage({ type: 'initialize', manifest: state.manifest, model: modelCopy, faces: facesCopy }, [modelCopy, facesCopy]);
  } catch (error) { stopEvaluation(error.message); errorMessage(error.message); }
}
function renderFailures() {
  const predictions = state.predictions || state.manifest.results.predictions;
  const wrong = predictions.map((label, i) => ({ label, position: i, index: state.manifest.testIndices[i] })).filter(item => item.label !== state.manifest.labels[item.index]);
  $('failure-gallery').replaceChildren(...wrong.slice(0, 6).map(item => {
    const figure = node('figure'), truth = state.manifest.names[state.manifest.labels[item.index]], predicted = state.manifest.names[item.label];
    figure.append(faceCanvas(P.getFace(state.pixels, item.index), `Misclassified test image ${item.position}; true ${truth}, predicted ${predicted}`));
    const caption = node('figcaption', `Test ${item.position} · ${state.predictions ? 'live evaluation' : 'saved Python run'}`); caption.append(node('small', `True: ${truth}`), node('small', `Predicted: ${predicted}`)); figure.append(caption); return figure;
  }));
  if (!wrong.length) $('failure-gallery').append(node('p', 'No incorrect predictions were found in this evaluation.'));
  $('failure-fallback').hidden = true; $('failure-gallery').hidden = false;
}

// Input decoding uses only browser APIs; uploaded files are never sent to a server.
$('face-upload').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  $('upload-error').hidden = true;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { $('upload-error').textContent = 'Choose a PNG, JPEG, or WebP image.'; $('upload-error').hidden = false; return; }
  if (file.size > 12 * 1024 * 1024) { $('upload-error').textContent = 'Choose an image smaller than 12 MiB.'; $('upload-error').hidden = false; return; }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 25_000_000) throw new Error('Choose an image of at most 25 megapixels.');
    await ensureData();
    const canvas = document.createElement('canvas'); canvas.width = 37; canvas.height = 50; const c = canvas.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 37, 50);
    const ratio = 37 / 50; let cropW = bitmap.width, cropH = bitmap.height;
    if (cropW / cropH > ratio) cropW = cropH * ratio; else cropH = cropW / ratio;
    c.drawImage(bitmap, (bitmap.width - cropW) / 2, (bitmap.height - cropH) / 2, cropW, cropH, 0, 0, 37, 50);
    const rgba = c.getImageData(0, 0, 37, 50).data; state.upload = new Float32Array(1850);
    for (let i = 0; i < 1850; i++) state.upload[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
    state.uploadName = file.name; updateInput(); renderProjection(); toast('Image prepared locally. You can now project it or run closed-set recognition.');
  } catch (error) { $('upload-error').textContent = error.message || 'This image could not be decoded. Try another file.'; $('upload-error').hidden = false; }
  finally { bitmap?.close(); }
});
$('use-sample').addEventListener('click', () => runAction($('use-sample'), $('projection-status'), () => { selectFace(state.manifest.testIndices[0]); renderProjection(); }));
$('load-data').addEventListener('click', () => runAction($('load-data'), $('dataset-status'), () => { renderDataset(); $('dataset-status').textContent = 'Loaded all 1,288 LFW images. Choose a face to inspect its flattened pixels.'; }));
for (const id of ['identity-filter', 'partition-filter']) $(id).addEventListener('change', () => { if (state.model) { state.page = 0; renderDataset(); } });
$('faces-prev').addEventListener('click', () => { state.page--; renderDataset(); }); $('faces-next').addEventListener('click', () => { state.page++; renderDataset(); });
$('run-projection').addEventListener('click', () => runAction($('run-projection'), $('projection-status'), renderProjection));
let projectionFrame;
$('component-count').addEventListener('input', () => { $('component-value').value = $('component-count').value; if (state.model && !$('projection-output').hidden) { cancelAnimationFrame(projectionFrame); projectionFrame = requestAnimationFrame(renderProjection); } });
$('whiten').addEventListener('change', () => { if (state.model && !$('projection-output').hidden) renderProjection(); });
$('run-eigenfaces').addEventListener('click', () => runAction($('run-eigenfaces'), $('eigen-status'), renderEigenfaces));
$('eigen-mode').addEventListener('change', () => { if (state.model && !$('eigen-output').hidden) renderEigenfaces(); });
$('eigen-index').addEventListener('input', () => { $('eigen-value').value = $('eigen-index').value; if (state.model) renderEigenDetail(); });
$('test-face').addEventListener('change', () => { if (state.model && $('test-face').value !== '') selectFace(state.manifest.testIndices[Number($('test-face').value)]); });
$('recognize-face').addEventListener('click', () => runAction($('recognize-face'), $('recognition-status'), recognize));
$('evaluate-test').addEventListener('click', evaluateTest); $('cancel-evaluation').addEventListener('click', () => stopEvaluation('Evaluation canceled. The previous results are preserved.'));
$('show-errors').addEventListener('click', () => runAction($('show-errors'), null, renderFailures));
$('variance-count').addEventListener('change', async () => { if (!$('variance-count').checkValidity()) { $('variance-count').reportValidity(); return; } const value = Number($('variance-count').value); try { await ensureData(); renderVariance(value); } catch {} });
document.querySelectorAll('[data-canvas]').forEach(button => button.addEventListener('click', () => { $(button.dataset.canvas).toBlob(blob => { if (blob) saveBlob(blob, `lab05-${button.dataset.canvas}.png`); else toast('The figure could not be saved.'); }); }));
$('download-weights').addEventListener('click', () => { if (!state.scores) return; const text = 'component,weight,whitened\n' + Array.from(state.scores, (weight, i) => `${i + 1},${weight},${$('whiten').checked}`).join('\n'); saveText(text, 'lab05-pca-weights.csv', 'text/csv'); });
$('download-evaluation').addEventListener('click', async () => { try { const manifest = await loadManifest(); saveText(JSON.stringify({ laboratory: 5, source: state.report ? 'live-browser-evaluation' : 'saved-python-reference', settings: manifest.settings, names: manifest.names, testIndices: manifest.testIndices, predictions: state.predictions || manifest.results.predictions, report: state.report || P.evaluate(manifest.testIndices.map(i => manifest.labels[i]), manifest.results.predictions, 7) }, null, 2), 'lab05-evaluation.json', 'application/json'); } catch (error) { toast(error.message); } });

// One complete source download, plus the original task-specific sections.
checkedFetch('./python/lab5_pca.py').then(r => r.text()).then(text => {
  state.python = text; $('python-code').textContent = text;
  const sections = text.split(/(?=^# %% )/m).filter(Boolean);
  document.querySelectorAll('[data-source-part]').forEach(el => { el.textContent = sections[Number(el.dataset.sourcePart) - 1] || text; });
}).catch(() => { $('python-code').textContent = 'Source could not be loaded. Use the Python file download link.'; });
$('copy-code').addEventListener('click', async () => { if (!state.python) { toast('Use the Python file download; the code preview has not loaded.'); return; } try { await navigator.clipboard.writeText(state.python); toast('Complete Python implementation copied.'); } catch { toast('Clipboard unavailable. Select the source text or download the Python file.'); } });

// Navigation, accessible motion, and local-only notes.
$('menu-toggle').addEventListener('click', () => { const opened = $('menu-toggle').getAttribute('aria-expanded') !== 'true'; $('menu-toggle').setAttribute('aria-expanded', String(opened)); $('menu-toggle').setAttribute('aria-label', opened ? 'Close navigation' : 'Open navigation'); $('main-nav').classList.toggle('open', opened); });
document.querySelectorAll('#main-nav a').forEach(anchor => anchor.addEventListener('click', () => { $('main-nav').classList.remove('open'); $('menu-toggle').setAttribute('aria-expanded', 'false'); $('menu-toggle').setAttribute('aria-label', 'Open navigation'); }));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { $('main-nav').classList.remove('open'); $('menu-toggle').setAttribute('aria-expanded', 'false'); } });
if ('IntersectionObserver' in window) {
  const navObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) document.querySelectorAll('#main-nav a').forEach(anchor => anchor.classList.toggle('active', anchor.hash === `#${entry.target.id}`)); }), { rootMargin: '-15% 0px -65% 0px' });
  document.querySelectorAll('main>section[id]').forEach(section => navObserver.observe(section));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { const reveal = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); } }), { threshold: .1 }); document.querySelectorAll('.reveal').forEach(el => { el.classList.add('will-reveal'); reveal.observe(el); }); }
}
$('lab-notes').value = safeRead('visionlab-lab05-notes') || '';
$('lab-notes').addEventListener('input', () => { $('notes-status').textContent = safeWrite('visionlab-lab05-notes', $('lab-notes').value) ? 'Saved in this browser.' : 'Storage unavailable. Download your notes to keep them.'; });
$('download-notes').addEventListener('click', () => saveText(`CSST106 Laboratory 5 — PCA\n\n${$('lab-notes').value}`, 'lab05-observations.txt'));

// Configurable external destinations; no guessed usernames or placeholder links.
let storedLinks = {}; try { storedLinks = JSON.parse(safeRead('visionlab-lab05-links') || '{}'); } catch {}
const links = { compilationUrl: '', repositoryUrl: '', ...window.LAB_CONFIG, ...storedLinks };
function validLink(value) { if (!value.trim()) return ''; const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an http:// or https:// URL without embedded credentials.'); return url.href; }
function openLinks(destination) { $('compilation-url').value = links.compilationUrl; $('repository-url').value = links.repositoryUrl; $('link-error').hidden = true; $('link-dialog').showModal(); if (destination) $(destination === 'compilation' ? 'compilation-url' : 'repository-url').focus(); }
function readLinks() { return { compilationUrl: validLink($('compilation-url').value), repositoryUrl: validLink($('repository-url').value) }; }
document.querySelectorAll('[data-destination]').forEach(button => button.addEventListener('click', () => { const value = links[`${button.dataset.destination}Url`]; try { if (value) window.open(validLink(value), '_blank', 'noopener,noreferrer'); else openLinks(button.dataset.destination); } catch { openLinks(button.dataset.destination); } }));
$('open-settings').addEventListener('click', () => openLinks()); $('close-dialog').addEventListener('click', () => $('link-dialog').close());
$('link-form').addEventListener('submit', event => { event.preventDefault(); try { Object.assign(links, readLinks()); const saved = safeWrite('visionlab-lab05-links', JSON.stringify(links)); $('link-dialog').close(); toast(saved ? 'Links saved in this browser. Download the config to apply them for all visitors.' : 'Links applied for this session. Download the config to keep them.'); } catch (error) { $('link-error').textContent = error.message; $('link-error').hidden = false; } });
$('download-config').addEventListener('click', () => { try { const config = readLinks(); saveText(`// Your Lab 5 website destinations.\nwindow.LAB_CONFIG = ${JSON.stringify(config, null, 2)};\n`, 'site-config.js', 'text/javascript'); } catch (error) { $('link-error').textContent = error.message; $('link-error').hidden = false; } });
loadManifest().catch(() => { $('report-badge').textContent = 'SAVED VALUES · DATA OFFLINE'; });
window.addEventListener('pagehide', () => state.worker?.terminate());
