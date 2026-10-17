# Laboratory 5 handout coverage

Primary source: `CSST106_Lab_Experiment_05_PCA_in_CV.docx`, reviewed directly from the user's Downloads folder. This is Laboratory Exercise 5, topic PCA, weeks 7–8, CSST106 Computer Vision and Perception, first semester, AY 2026–2027. No other activity's algorithm or questions are included.

| Handout requirement | Implementation |
| --- | --- |
| Introduction: high dimensionality, curse of dimensionality, orthogonal components and eigenfaces | Overview, concept explanations, report introduction. |
| Four learning objectives | Objectives section contains all four. |
| NumPy, Matplotlib and scikit-learn prerequisites | Python code panel, `python/requirements.txt`, Python README. |
| Task 1: LFW, at least 70 faces per identity, resize 0.4, shapes, X/y meaning, 80/20 split seed 42 | Task 1 gallery, identity/partition filters, flatten visualization, fixed disjoint membership; original Python implementation and model exporter. |
| Task 2: 150 components, randomized solver, whitening, fit on training only, transform train/test | Original Python fits the model. Task 2 uses its genuine mean/components/variances for live projection, with fixed settings and shapes explained. |
| Task 3: reshape components and display first 12 eigenfaces | First-12 gallery by default; component inspector; saved original Matplotlib plot. |
| Task 4: balanced RBF SVC, prediction, precision/recall/F1 classification report | Original Python training; live genuine model inference; cancellable all-test evaluation; report table, confusion matrix, evaluation export. |
| Post-lab Q1: plot cumulative explained variance and find 90% threshold | Required randomized PCA curve and exact full-SVD check, interactive component input, original saved plot, answer 85. |
| Post-lab Q2: first 3 vs. last 3 of retained 150 eigenfaces | Task 3 comparison option, saved comparison PNG, detailed observed answer. |
| Post-lab Q3: mathematical whitening and SVM benefit with documentation | Full formula, unit sample variance explanation, RBF distance implications, qualification about noise, official scikit-learn PCA link. |
| Post-lab Q4: extract errors, plot faces, evidence-based hypotheses | Actual `y_pred != y_test` failures, live error gallery, saved six-error figure, specific test 13/21/31 hypotheses. |
| Five follow-up questions | All five in Questions, `downloads/ANSWERS.md`, and printable report. |
| Submit commented notebook/script and PDF report | Original commented script and Python kit; complete printable report with Print / Save as PDF. No student identity is invented. |
| Rubric: code, variance threshold, concepts, failure evidence | Reproducible source; 85-component threshold; conceptual answers; real misclassifications and measured classifier report. |

## Additional explorations

The reconstruction slider, arbitrary-image upload, MSE, confusion matrix, and web interface are additions that explain the original PCA activity. They are not presented as extra requirements from the handout. Uploads are processed locally, and the closed-set recognition limitation is explicit.

## Boundary between fitting and inference

GitHub Pages does not execute the training Python. The shipped parameters were genuinely fitted offline on the laboratory's training partition. Browser controls perform new projection, inverse projection, and RBF SVM inference using those parameters. Saved Python figures and reference metrics are explicitly labeled; live evaluation replaces the results table only after it completes. All 258 predictions are checked against the original implementation in numerical and browser tests.
