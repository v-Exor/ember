# Laboratory 5 validation

Validated locally on 16 October 2026 against the supplied Laboratory Exercise 5 Word document and the actual LFW PCA/SVM implementation from this conversation. Publishing was subsequently authorized on 17 October 2026 for `v-Exor/LabAct5_CSST106`.

## Numerical verification

Seven automated numerical tests pass:

1. SHA-256 integrity of both binary artifacts, 1,288 face rows, and the disjoint 1,030/258 split.
2. Browser PCA projections against scikit-learn's first three held-out projection vectors (all 150 components).
3. Zero training-score mean and unit sample variance after whitening (first eight components, all 1,030 training faces).
4. Decreasing reconstruction MSE with more components and equivalent inverse reconstruction with/without whitening.
5. The first cumulative-variance crossing of 90% at component 85.
6. Exact predicted-label agreement on **all 258 held-out faces**, with 219 correct (84.8837%), and matching confusion matrix and class F1 values.
7. Rejection of invalid pixel shapes, nonfinite input, invalid component counts, and incorrect SVM feature dimensions.

Run with `npm test`. The SVM is a genuine RBF implementation using the exported support vectors, coefficients, and intercepts; test results are not hardcoded into the prediction function.

## Browser verification

All five browser scenarios pass in an isolated installed Chrome profile using Playwright:

- **All four tasks under `/lab-05/`:** lazy data loading; class and partition filtering; face selection; PCA projection; a working component slider; whitening toggle; reconstruction error; image upload; CSV download; eigenface modes and inspector; actual SVM inference; all-test worker evaluation; exact 258/258 agreement with Python; live report and real failed predictions.
- **Mobile and integration:** responsive navigation; output layouts checked at 320, 375, 768, and 1440 pixels; no document horizontal overflow; persisted local notes; configurable external links; downloadable configuration.
- **Failure handling:** interrupted model download, visible error, successful retry, malformed image decoding, and unsupported file-type feedback.
- **Cancellation:** an evaluation worker can be stopped while keeping the prior reference results.
- **Printable report:** all four tasks, all nine answers, loaded genuine figures, and browser print-to-PDF rendering.

Normal experiment flows produce no unhandled browser errors and make no upload/POST requests. The desktop and mobile pages and the printable report pass automated axe WCAG 2 A/AA and WCAG 2.1 A/AA checks in the tested states. Automated checks do not establish complete accessibility conformance across every assistive technology. Visible labels, focus outlines, reduced-motion support, native dialogs, and keyboard-focusable wide tables are included.

The desktop landing page, mobile landing page, live projection, and live result layouts were visually reviewed. The print PDF was rendered to page images and inspected internally. Development screenshots and the QA PDF remain in ignored `artifacts/` and are not included in the delivery archive.

## Static and deployment verification

`npm run check` verifies script syntax, referenced local HTML assets, unique IDs, valid in-page anchors, the presence of all four tasks and nine answers, binary file sizes, source/documentation downloads, and deployment files. HTML uses relative asset paths. The same real browser flow passes at a repository subpath, not only `/`.

The GitHub Pages workflow stages only static runtime assets, source downloads, and documentation. No API keys, runtime backend, remote fonts, CDN scripts, or other laboratory repositories are required. The source delivery ZIP excludes `node_modules`, test results, QA artifacts, local caches, and Git state.

The repository destination in `site-config.js` points to `https://github.com/v-Exor/LabAct5_CSST106`. The compilation destination remains empty until the compilation website is online; that button opens working configuration controls instead of a broken placeholder page. Production deployment verification is recorded separately after publication.

## Technical limits

- Training/fitting runs in the included Python source; the website performs new inference and reconstruction with the genuine fixed model.
- Full original pixels and model require about 11.4 MiB when an experiment first loads.
- Uploaded images are center-cropped/resized but are not face-detected or aligned; upload results are separate from held-out accuracy.
- Closed-set SVM prediction always chooses one of seven known dataset identities; pairwise votes are not probability estimates.
- Test evaluation always uses the original 150 whitened components, regardless of reconstruction controls.
- The report contains saved Python results and blank student details; use its Print / Save as PDF control for the required academic report.
- Browser runtime compatibility was checked in Chrome; Safari and Firefox were not independently tested.
