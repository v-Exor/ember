# CSST106 Laboratory 5 Principal Component Analysis

A standalone, white-and-orange VisionLab website for **Laboratory Exercise 5: Facial Recognition using Principal Component Analysis (Eigenfaces)**. It is independent of Laboratories 1–4 and 6–7 and is ready for its own public GitHub repository and GitHub Pages deployment.

The primary source is `CSST106_Lab_Experiment_05_PCA_in_CV.docx`, supplied in this conversation. No school logos or images extracted from the Word document are included. The generic VisionLab branding matches the other laboratory websites in the workspace.

## GitHub location

- Repository: https://github.com/v-Exor/LabAct5_CSST106
- GitHub Pages deployment URL: https://v-exor.github.io/LabAct5_CSST106/
- Use the Pages URL as the destination of your compilation website's Laboratory Activity 5 button.
- The repository link is configured in `site-config.js`. The compilation return URL remains configurable until your compilation website is online.

## Quick start

The website has **no runtime dependencies and no build requirement**. Use an HTTP server; opening `index.html` directly with `file://` prevents the model fetch and worker from working.

```powershell
cd "C:\Users\Admin\Documents\ChatGPT\Laboratory_Activities_CSST106\lab-05"
node scripts/serve.mjs
```

Open **http://127.0.0.1:4177/**. The same server provides **http://127.0.0.1:4177/lab-05/** to test GitHub Pages repository paths. Stop the server with Ctrl+C.

Alternatively, from the project folder:

```powershell
python -m http.server 8000
```

Then open http://localhost:8000/. The default preview needs only Node or Python, not `npm install`.

## What works

| Module | Behavior |
| --- | --- |
| Task 1 | Load all 1,288 actual LFW images, filter by identity and train/test partition, page through faces, select a face, inspect flattened pixels and array shapes. |
| Task 2 | Compute genuine PCA projections and inverse reconstructions from 1–150 components; toggle whitening of displayed weights; inspect MSE, variance retention, and signed weights; download a reconstruction or CSV. |
| Task 3 | Display the first 12 eigenfaces, the last 12 of the retained 150, or the first 3 vs. last 3; inspect and download any of the 150 components. |
| Task 4 | Run genuine RBF SVM inference on a selected image; evaluate all 258 held-out faces in a cancellable web worker; update classification metrics, confusion matrix, and failed predictions. |
| Upload | Decode PNG/JPEG/WebP locally, center-crop to a 37:50 aspect ratio, resize to 37 × 50 grayscale, and use the actual pixels for projection and closed-set inference. |
| Analysis | Interactive cumulative variance graph; all four post-lab answers and five follow-up answers; genuine saved figures and failure hypotheses. |
| Report | `report.html` contains methods, all required answers, genuine figures, metrics, and a conclusion. Add your name/section and choose **Print / Save as PDF**. |
| Downloads | Original commented Python script, Python kit ZIP, written answers, saved evaluation TXT/JSON, live weights, reconstructions, component images, evaluation JSON, notes, and link configuration. |
| Integration | Configurable compilation and repository destinations; local link settings dialog; downloadable configuration. |

The first experiment downloads about **11.4 MiB** of local static pixel/model data. Those files are bundled with the site; no live external dataset service or Python backend is needed. Hero images, written content, and the saved figures are available before that download.

## What is fitted offline and what is computed live

`python/export_model.py` trains the PCA and SVM with the exact laboratory split and settings. The website uses that genuine fitted model. It does **not** refit PCA or SVM in the visitor's browser.

`processing.js` computes centering, projection, whitening, inverse projection, RBF support-vector kernel values, multiclass pairwise voting, and evaluation metrics from the exported arrays. Browser evaluation has been tested against every scikit-learn prediction: **258/258 agree**.

The reconstruction slider is an additional exploration. The SVM always uses the original **150 whitened features**, even if the slider displays fewer components or unwhitened weights. Changing the display settings does not retrain the classifier or alter the fixed test set.

Uploaded images are **not detected or aligned**. Recognition is closed-set: the model must choose one of seven known LFW identities. It cannot verify a real-world identity or recognize arbitrary people. Pairwise vote counts are not probabilities. Uploaded-image experiments are not included in the 84.88% held-out accuracy.

## Genuine reference result

- 1,288 grayscale images; 50 × 37 = 1,850 features; seven identities.
- 1,030 training images and 258 held-out test images; split seed 42.
- PCA with 150 components, randomized SVD, whitening; decomposition seed 42.
- 85 components reach 90% of **training** variance: 89.8876% at 84 and 90.0017% at 85.
- 150 components retain approximately 94.56% of training variance.
- Balanced RBF SVC with C=1 and gamma='scale': 219/258 correct, **84.88% accuracy**, 39 incorrect.

`assets/data/manifest.json` records the exact versions, labels, split indices, all reference predictions, binary array offsets/types, and SHA-256 hashes. `SOURCE_MAP.md` maps the handout to this website. `assets/NOTICE.md` documents imagery and data provenance.

## Connect your compilation website

Edit `site-config.js` with your actual URLs. Both defaults are empty; no GitHub username or repository is invented.

```javascript
window.LAB_CONFIG = {
  compilationUrl: '', // Paste the actual compilation website URL here.
  repositoryUrl: '',  // Paste this laboratory's actual GitHub repository URL here.
};
```

You can also choose **Configure website links** in the footer. Saving changes only this browser; use **Download config** and replace `site-config.js` to set the destinations for all visitors. Browser overrides take precedence, so update them as well when testing a new config. Empty destinations open the configuration dialog rather than sending visitors to a broken placeholder.

## Deploy to GitHub Pages

This project is configured for the repository and Pages URL above. The following instructions also explain how to redeploy it or publish a separate copy.

1. Create a new **public repository** for Lab 5 in your own GitHub account. Choose the actual repository name yourself.
2. Upload the **contents of `lab-05`** into the repository root, including `.github/workflows/pages.yml` and `.nojekyll`. `index.html` must be at the repository root, not inside another `lab-05` folder. Do not upload `node_modules`, `artifacts`, `test-results`, `.venv`, or the complete original LFW cache.
3. Set your actual compilation and repository URLs in `site-config.js` and commit them.
4. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
5. Push or commit to `main`, or run **Actions → Deploy Lab 5 to GitHub Pages → Run workflow**. If your default branch has another name, update `pages.yml` accordingly.
6. When the workflow succeeds, open the URL shown in its `github-pages` environment or Settings → Pages.

The included workflow stages only the public website files and deploys them. There is no Node server on GitHub Pages and no Python fitting at deployment time.

**Alternative:** select **Deploy from a branch → main → /(root)** in Pages settings. The same buildless root files work without the custom Actions workflow. Use one publishing approach at a time.

The URL to add to your compilation's **Open Laboratory Activity 5** button will have this format:

```text
https://YOUR-USERNAME.github.io/YOUR-LAB5-REPOSITORY/
```

All application asset URLs are relative. No custom domain, paid backend, environment variables, credentials, or API keys are required. The site works independently of the compilation website.

## Development and checks

Development dependencies are only for automated testing:

```powershell
npm ci
npm run check
npm test
npm run test:e2e
```

Browser tests use an installed Google Chrome in an isolated headless profile. They test real inference under `/lab-05/`, sliders, uploads, test evaluation/cancellation, failure handling, downloads, link configuration, notes, responsive layouts, accessibility, and printable report content. Screenshots and print QA output go into ignored `artifacts/`. `VALIDATION.md` records the completed checks and limits.

To rebuild the Python artifacts, see `python/README.md`. To regenerate answers/report and the Python kit after editing content:

```powershell
python scripts/generate-content.py
```

To produce the source delivery archive (excludes development dependencies and QA artifacts):

```powershell
python scripts/package-delivery.py
```

## Project structure

```text
lab-05/
  index.html, styles.css, app.js       Website and interactions
  processing.js, worker.js            Genuine PCA/SVM mathematics and evaluation
  site-config.js                     Your configurable external destinations
  report.html                        Printable academic report
  assets/data/                       Fixed real pixels, fitted model, manifest
  assets/results/                    Genuine saved Python figures
  assets/NOTICE.md                   Data and image provenance
  python/                            Original lab script and model exporter
  downloads/                         Python kit, answers, saved metrics
  scripts/                           Local server, checks, packaging
  tests/                             Numerical and browser verification
  .github/workflows/pages.yml        Independent GitHub Pages deployment
```

## Troubleshooting

- **The experiments cannot load:** use localhost or the published HTTPS site, not `file://`. Confirm both `.bin` files and `manifest.json` were uploaded under `assets/data`.
- **404 on GitHub Pages:** put `index.html` at the publishing root, preserve filename case, check the workflow/selected branch, and open the complete repository URL including its final slash.
- **The first experiment is slow:** the bundled original pixels and model are about 11.4 MiB. Wait for loading to finish; subsequent interactions reuse them in memory.
- **Recognition seems wrong on my photo:** the SVM is trained only on seven LFW identities. It cannot identify you or an arbitrary person. Pose/alignment differences are especially important for global eigenfaces.
- **The component slider changes the image but not test accuracy:** reconstruction uses the selected component count; the fixed classifier always uses its original 150 whitened features.
- **No external link opens:** enter your actual destinations in the footer settings or `site-config.js`. Allow a normal user-initiated browser tab if your browser blocks it.
- **Python stops at an image window:** close that Matplotlib figure so execution continues to the next task.
- **Browser checks cannot launch:** install Chrome or adjust the test configuration to your installed Playwright browser. Tests require permission to access the local preview.
- **Need the required PDF submission:** open `report.html`, add your student details, then choose Print / Save as PDF. Submit the PDF and commented Python script according to the handout. The website is an accompanying interactive presentation.
