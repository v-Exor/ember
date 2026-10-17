importScripts('./processing.js');
let state;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'initialize') {
      state = { manifest: data.manifest, model: LabPCA.decodeModel(data.manifest, data.model), pixels: new Float32Array(data.faces) };
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'evaluate') {
      if (!state) throw new Error('Load the dataset before evaluation.');
      const { manifest, model, pixels } = state;
      const predictions = [];
      for (const [position, index] of manifest.testIndices.entries()) {
        const scores = LabPCA.project(LabPCA.getFace(pixels, index), model);
        predictions.push(LabPCA.classify(scores, model).label);
        if (position % 16 === 0) self.postMessage({ type: 'progress', completed: position + 1, total: manifest.testIndices.length });
      }
      const truth = manifest.testIndices.map(index => manifest.labels[index]);
      self.postMessage({ type: 'complete', predictions, report: LabPCA.evaluate(truth, predictions, manifest.names.length) });
    }
  } catch (error) { self.postMessage({ type: 'error', message: error.message }); }
};
