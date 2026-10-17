/* Pure numerical routines shared by the page, evaluation worker, and tests.
 * The SVM implements libsvm's multiclass one-vs-one vote on exported parameters.
 * Predictions and PCA coefficients are verified against scikit-learn fixtures.
 */
(() => {
  'use strict';
  const finite = (value, label) => { if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`); return value; };
  function decodeModel(manifest, buffer) {
    if (manifest.schema !== 1 || manifest.settings.nComponents !== 150) throw new Error('Unsupported model version.');
    if (buffer.byteLength !== manifest.files['model.bin'].bytes) throw new Error('Model download is incomplete. Please retry.');
    const model = { manifest };
    for (const [name, spec] of Object.entries(manifest.arrays)) {
      const Type = { '<f4': Float32Array, '<f8': Float64Array, '<i4': Int32Array }[spec.type];
      if (!Type || spec.offset < 0 || spec.offset + spec.length * Type.BYTES_PER_ELEMENT > buffer.byteLength) throw new Error('Invalid model array.');
      model[name] = new Type(buffer, spec.offset, spec.length);
    }
    return model;
  }
  function getFace(pixels, index, features = 1850) {
    if (!Number.isInteger(index) || index < 0 || (index + 1) * features > pixels.length) throw new Error('Face index is outside the dataset.');
    return pixels.subarray(index * features, (index + 1) * features);
  }
  function project(face, model, count = 150, whiten = true) {
    const features = model.mean.length;
    if (face.length !== features || !Number.isInteger(count) || count < 1 || count > 150) throw new Error('Use a 1,850-pixel image and between 1 and 150 components.');
    const centered = new Float64Array(features);
    for (let j = 0; j < features; j++) centered[j] = finite(face[j], 'Pixel') - model.mean[j];
    const scores = new Float64Array(count);
    for (let k = 0; k < count; k++) {
      let sum = 0;
      const offset = k * features;
      for (let j = 0; j < features; j++) sum += centered[j] * model.components[offset + j];
      scores[k] = whiten ? sum / Math.sqrt(model.variance[k]) : sum;
    }
    return scores;
  }
  function reconstruct(scores, model, whiten = true) {
    if (!scores.length || scores.length > 150) throw new Error('Invalid projection size.');
    const reconstructed = Float64Array.from(model.mean);
    const features = reconstructed.length;
    for (let k = 0; k < scores.length; k++) {
      const weight = finite(scores[k], 'Projection') * (whiten ? Math.sqrt(model.variance[k]) : 1);
      for (let j = 0; j < features; j++) reconstructed[j] += weight * model.components[k * features + j];
    }
    return reconstructed;
  }
  function mse(original, reconstructed) {
    if (original.length !== reconstructed.length || !original.length) throw new Error('Image dimensions must match.');
    let total = 0;
    for (let i = 0; i < original.length; i++) total += (original[i] - reconstructed[i]) ** 2;
    return total / original.length;
  }
  function cumulative(ratios) { let total = 0; return Array.from(ratios, value => (total += value)); }
  function classify(scores, model) {
    const classes = model.manifest.names.length;
    const features = model.manifest.settings.nComponents;
    if (scores.length !== features) throw new Error('The trained SVM requires all 150 whitened component weights.');
    const nSupport = model.supportVectors.length / features;
    const kernels = new Float64Array(nSupport);
    const gamma = model.manifest.settings.gamma;
    for (let i = 0; i < nSupport; i++) {
      let distance = 0;
      for (let j = 0; j < features; j++) distance += (scores[j] - model.supportVectors[i * features + j]) ** 2;
      kernels[i] = Math.exp(-gamma * distance);
    }
    const starts = [0];
    for (let i = 0; i < classes; i++) starts.push(starts[i] + model.supportCounts[i]);
    const votes = new Int32Array(classes);
    const decisions = [];
    let pair = 0;
    for (let i = 0; i < classes; i++) {
      for (let j = i + 1; j < classes; j++) {
        let sum = model.intercepts[pair++];
        for (let k = starts[i]; k < starts[i + 1]; k++) sum += model.dual[(j - 1) * nSupport + k] * kernels[k];
        for (let k = starts[j]; k < starts[j + 1]; k++) sum += model.dual[i * nSupport + k] * kernels[k];
        votes[sum > 0 ? i : j]++;
        decisions.push({ first: i, second: j, margin: sum });
      }
    }
    let label = 0;
    for (let i = 1; i < classes; i++) if (votes[i] > votes[label]) label = i;
    return { label, votes: Array.from(votes), decisions };
  }
  function evaluate(truth, predicted, classes) {
    if (truth.length !== predicted.length || !truth.length) throw new Error('Evaluation arrays must be nonempty and have equal lengths.');
    const matrix = Array.from({ length: classes }, () => Array(classes).fill(0));
    for (let i = 0; i < truth.length; i++) matrix[truth[i]][predicted[i]]++;
    const rows = matrix.map((row, k) => {
      const tp = row[k], support = row.reduce((a, b) => a + b, 0);
      const selected = matrix.reduce((sum, current) => sum + current[k], 0);
      const precision = selected ? tp / selected : 0, recall = support ? tp / support : 0;
      return { precision, recall, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0, support };
    });
    const correct = matrix.reduce((sum, row, i) => sum + row[i], 0);
    const average = weighted => ['precision', 'recall', 'f1'].map(key => rows.reduce((sum, row) => sum + row[key] * (weighted ? row.support : 1), 0) / (weighted ? truth.length : classes));
    return { matrix, rows, correct, total: truth.length, accuracy: correct / truth.length, macro: average(false), weighted: average(true) };
  }
  globalThis.LabPCA = Object.freeze({ decodeModel, getFace, project, reconstruct, mse, cumulative, classify, evaluate });
})();
