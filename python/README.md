# Laboratory 5 Python implementation

`lab5_pca.py` is the complete commented solution developed from the laboratory handout. It includes Tasks 1–4 and post-lab plots for Questions 1, 2, and 4. Question 3 and all five follow-up answers are in the website, printable report, and `downloads/ANSWERS.md`.

From the website project folder:

```powershell
python -m pip install -r python/requirements.txt
python python/lab5_pca.py
```

The first run downloads the complete LFW archive (approximately 243 MB) from scikit-learn's configured dataset mirror. It may take a few minutes. The script caches data in `python/data` and saves figures in `python/outputs`. Close each Matplotlib window to continue. Use an internet connection on the first run; subsequent runs use the cache. The grayscale image shape is 50 by 37, with 1,288 images across seven identities.

## Rebuild the browser assets

```powershell
python python/export_model.py --data-home python/data
```

You can supply an existing scikit-learn cache directory with `--data-home`. The exporter writes exact preprocessed float32 pixels, the PCA basis/mean/variances, and the trained libsvm parameters into `assets/data`. It also regenerates reference metrics and the small hero images. The original Matplotlib figures in `assets/results` come from the completed lab script; if retraining changes results, regenerate those figures as well and update static answers and the printable report. Run `python scripts/generate-content.py` after export, and `npm test` before distribution. A changed model requires revalidating all reported numbers.

## Fixed experiment settings

- `fetch_lfw_people(min_faces_per_person=70, resize=0.4)`.
- `train_test_split(..., test_size=0.2, random_state=42)` without stratification, as specified in the handout.
- PCA: 150 components, randomized SVD, whitening enabled; random seed 42 added for reproducibility.
- Fit PCA only to the 1,030 training images; transform both partitions with the same model.
- `SVC(kernel='rbf', class_weight='balanced')` with default C=1 and gamma='scale'.
- An independent full-SVD PCA on training data verifies the minimum 90% threshold.

The reference environment is recorded in `assets/data/manifest.json`. Minor numerical or resizing differences across library versions can change results. The shipped browser data and model are fixed and tested together.

## Scope

Browser reconstruction is an added PCA demonstration. Browser inference uses the trained model and does not refit PCA or SVM. The training script remains the reproducible implementation of the original fitting tasks. Uploads are resized but not face-aligned; a seven-class SVM always returns one of its known labels and cannot verify identity or recognize arbitrary people.
