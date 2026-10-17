import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import '../processing.js';
const P = globalThis.LabPCA;
const root = new URL('../assets/data/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root)));
const modelBytes = await readFile(new URL('model.bin', root)), faceBytes = await readFile(new URL('faces.bin', root));
const arrayBuffer = buffer => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const model = P.decodeModel(manifest, arrayBuffer(modelBytes));
const pixels = new Float32Array(arrayBuffer(faceBytes));

test('data integrity and train/test separation match the laboratory source', () => {
  for (const [name, data] of [['model.bin', modelBytes], ['faces.bin', faceBytes]]) {
    assert.equal(data.length, manifest.files[name].bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), manifest.files[name].sha256);
  }
  assert.equal(pixels.length, 1288 * 1850);
  assert.equal(manifest.trainIndices.length, 1030); assert.equal(manifest.testIndices.length, 258);
  assert.equal(new Set([...manifest.trainIndices, ...manifest.testIndices]).size, 1288);
  assert.equal(manifest.names.length, 7);
});
test('browser PCA projections agree with scikit-learn float32 reference scores', () => {
  for (let i = 0; i < 3; i++) {
    const scores = P.project(P.getFace(pixels, manifest.testIndices[i]), model);
    for (let j = 0; j < 150; j++) assert.ok(Math.abs(scores[j] - manifest.results.testProjections[i][j]) < 0.0003, `score ${i}, ${j}`);
  }
});
test('whitening yields unit sample variance and zero mean on training projections', () => {
  const all = manifest.trainIndices.map(index => P.project(P.getFace(pixels, index), model, 8));
  for (let j = 0; j < 8; j++) {
    const mean = all.reduce((sum, row) => sum + row[j], 0) / all.length;
    const variance = all.reduce((sum, row) => sum + (row[j] - mean) ** 2, 0) / (all.length - 1);
    assert.ok(Math.abs(mean) < 0.00005); assert.ok(Math.abs(variance - 1) < 0.00005);
  }
});
test('more components reduce reconstruction error; whitening reverses correctly', () => {
  const face = P.getFace(pixels, manifest.testIndices[13]); let previous = Infinity;
  for (const count of [1, 10, 40, 85, 150]) {
    const reconstruction = P.reconstruct(P.project(face, model, count), model);
    const error = P.mse(face, reconstruction); assert.ok(error <= previous + 1e-8); previous = error;
    const unwhitened = P.reconstruct(P.project(face, model, count, false), model, false);
    assert.ok(P.mse(reconstruction, unwhitened) < 1e-20);
  }
});
test('the cumulative variance first crosses 90 percent at component 85', () => {
  const cumulative = P.cumulative(model.ratios);
  assert.ok(cumulative[83] < .9); assert.ok(cumulative[84] >= .9);
  assert.ok(Math.abs(cumulative[149] - manifest.results.variance150) < 1e-6);
});
test('all 258 browser RBF SVM predictions match the genuine Python reference', () => {
  const predictions = manifest.testIndices.map(index => P.classify(P.project(P.getFace(pixels, index), model), model).label);
  assert.deepEqual(predictions, manifest.results.predictions);
  const report = P.evaluate(manifest.testIndices.map(index => manifest.labels[index]), predictions, 7);
  assert.equal(report.correct, 219); assert.equal(report.total, 258);
  assert.deepEqual(report.matrix, manifest.results.confusion);
  assert.equal(report.accuracy, manifest.results.accuracy);
  report.rows.forEach((row, i) => assert.ok(Math.abs(row.f1 - manifest.results.report[manifest.names[i]]['f1-score']) < 1e-12));
});
test('invalid input is rejected rather than returning a fabricated result', () => {
  assert.throws(() => P.getFace(pixels, -1)); assert.throws(() => P.project(new Float32Array(100), model));
  assert.throws(() => P.project(P.getFace(pixels, 0), model, 151));
  const bad = Float32Array.from(P.getFace(pixels, 0)); bad[12] = NaN;
  assert.throws(() => P.project(bad, model)); assert.throws(() => P.classify(new Float64Array(85), model));
});
