"""Generate the printable report and answers from the site's verified content."""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class Questions(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.details = False
        self.summary = False
        self.paragraph = False
        self.items = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "section" and attrs.get("id") == "questions":
            self.active = True
        if not self.active:
            return
        if tag == "details":
            self.details = True
            self.question = []
            self.answer = []
        if tag == "summary" and self.details:
            self.summary = True
        if tag == "p" and self.details:
            self.paragraph = True

    def handle_endtag(self, tag):
        if tag == "section" and self.active:
            self.active = False
        if not self.active:
            return
        if tag == "summary":
            self.summary = False
        if tag == "p":
            self.paragraph = False
        if tag == "details" and self.details:
            question = " ".join("".join(self.question).split()).strip("+ ")
            if question[:2].isdigit():
                question = question[2:].strip()
            self.items.append((question, " ".join("".join(self.answer).split())))
            self.details = False

    def handle_data(self, data):
        if self.active and self.details:
            if self.summary:
                self.question.append(data)
            elif self.paragraph:
                self.answer.append(data)


questions = Questions()
questions.feed((ROOT / "index.html").read_text(encoding="utf-8"))
assert len(questions.items) == 9, f"Expected all 9 questions, found {len(questions.items)}"
manifest = json.loads((ROOT / "assets/data/manifest.json").read_text())
answers = "# CSST106 Laboratory Activity 5\n\nPrincipal Component Analysis in Computer Vision\n\n"
answers += "Based on CSST106_Lab_Experiment_05_PCA_in_CV.docx. Results are from the fixed LFW training/test split in the completed laboratory.\n\n"
for i, (question, answer) in enumerate(questions.items):
    if i in [0, 4]:
        answers += "## " + ("Post-lab analysis" if i == 0 else "Follow-up questions") + "\n\n"
    answers += f"### {i + 1 if i < 4 else i - 3}. {question}\n\n{answer}\n\n"
(ROOT / "downloads/ANSWERS.md").write_text(answers, encoding="utf-8")
q_html = ""
for i, (question, answer) in enumerate(questions.items):
    if i in [0, 4]:
        q_html += "<h2>" + ("Post laboratory analysis" if i == 0 else "Follow up questions") + "</h2>"
    q_html += f"<article><h3>{i + 1 if i < 4 else i - 3}. {escape(question)}</h3><p>{escape(answer)}</p></article>"
rows = ""
for name in manifest["names"]:
    row = manifest["results"]["report"][name]
    rows += f"<tr><th scope='row'>{escape(name)}</th><td>{row['precision']:.2f}</td><td>{row['recall']:.2f}</td><td>{row['f1-score']:.2f}</td><td>{int(row['support'])}</td></tr>"
for key, label in [("macro avg", "Macro average"), ("weighted avg", "Weighted average")]:
    row = manifest["results"]["report"][key]
    rows += f"<tr><th scope='row'>{label}</th><td>{row['precision']:.2f}</td><td>{row['recall']:.2f}</td><td>{row['f1-score']:.2f}</td><td>{int(row['support'])}</td></tr>"
report = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Laboratory 5 PCA Report</title><link rel="icon" href="./assets/favicon.svg" type="image/svg+xml"><style>
*{box-sizing:border-box}body{font:14px/1.75 'Segoe UI',Arial,sans-serif;color:#292c27;background:#faf9f5;margin:0}main{max-width:880px;margin:35px auto;padding:45px 55px;background:white;border:1px solid #e2e2d7;border-radius:12px}h1{font-size:32px;line-height:1.25;letter-spacing:-1px;margin:10px 0 20px}h2{font-size:22px;margin:32px 0 15px;line-height:1.3}h3{font-size:15px;line-height:1.6;margin:20px 0 8px}p{margin:8px 0 15px;color:#505749}.eyebrow{font-size:10px;letter-spacing:1px;color:#925020}nav{display:flex;gap:15px;align-items:center;flex-wrap:wrap;padding:18px 0;border-bottom:1px solid #e3e3d7;margin-bottom:25px}button,a{font:12px 'Segoe UI',Arial,sans-serif;color:#994510}button{padding:12px 18px;color:white;background:#b54e09;border:0;border-radius:7px;cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #a8470c;outline-offset:4px}.student{display:flex;gap:24px;flex-wrap:wrap;margin:25px 0}.student label{flex:1;min-width:180px;font-size:12px}input{display:block;width:100%;padding:8px;border:0;border-bottom:1px solid #bbb;font:14px 'Segoe UI',Arial,sans-serif}figure{margin:22px 0}img{width:100%;height:auto;border:1px solid #ddd}figcaption{font-size:11px;color:#606754;margin-top:7px}table{width:100%;border-collapse:collapse;font-size:12px}caption{font-size:11px;text-align:left;margin-bottom:8px}th,td{padding:10px;border:1px solid #ddd;text-align:left}thead{background:#f6f2e9}td{text-align:right}code{font-size:12px;overflow-wrap:anywhere}.source{font-size:11px;overflow-wrap:anywhere}.table-wrap{overflow-x:auto}article{break-inside:avoid}@media(max-width:600px){main{padding:25px 20px;margin:15px;border-radius:8px}h1{font-size:28px}table{font-size:10px}td,th{padding:7px}.student{gap:12px}}@media print{@page{size:A4;margin:17mm}body{background:white;font-size:10pt;line-height:1.55}main{max-width:none;border:0;margin:0;padding:0;border-radius:0}.no-print{display:none!important}h1{font-size:24pt}h2{font-size:16pt;break-after:avoid}h3{font-size:11pt;break-after:avoid}figure{break-inside:avoid}figure img{max-height:105mm;object-fit:contain}table{break-inside:avoid}table{font-size:9pt}tr{break-inside:avoid}thead{display:table-header-group}a{color:inherit;text-decoration:none}input{padding:3px;border-color:#888}p{orphans:3;widows:3;margin:6px 0 10px}h2{margin:24px 0 12px}h3{margin:13px 0 6px}.source{font-size:9pt}}
</style></head><body><main><nav class="no-print"><a href="./index.html">← Back to Laboratory 5</a><button id="print-report">Print / Save as PDF</button><a href="./python/lab5_pca.py" download>Download Python script</a></nav><span class="eyebrow">CSST106 · COMPUTER VISION AND PERCEPTION · WEEKS 7–8</span><h1>Laboratory Activity 5<br>Principal Component Analysis in Computer Vision</h1><p><strong>Experiment:</strong> Facial Recognition using Principal Component Analysis (Eigenfaces)<br><strong>Module:</strong> Dimensionality Reduction and Feature Extraction<br>First Semester · Academic Year 2026–2027</p><div class="student"><label for="student-name">Student name<input id="student-name" autocomplete="name"></label><label for="section-name">Section and date<input id="section-name"></label></div><p>This activity reduces face images to eigenface coordinates and uses a support vector machine to recognize seven known identities. The experiment retains approximately 94.56% of training variance with 150 components and achieves 84.88% accuracy on 258 held-out images.</p>
<h2>Objectives</h2><ol><li>Load, flatten, and preprocess high-dimensional image data.</li><li>Apply PCA to extract the most significant variation as eigenfaces.</li><li>Quantify the component count and cumulative variance trade-off.</li><li>Recognize individuals using an SVM on reduced PCA projections.</li></ol>
<h2>Methods and task results</h2><h3>Task 1 Data acquisition and preprocessing</h3><p>LFW was loaded with <code>min_faces_per_person=70, resize=0.4</code>. There are 1,288 grayscale images, each 50 × 37 pixels (1,850 features), across seven identities. The split uses <code>test_size=0.2, random_state=42</code>: 1,030 training images and 258 test images. X has shape (1288, 1850) and y has shape (1288,).</p><h3>Task 2 Principal components</h3><p>PCA uses 150 components, randomized SVD, whitening, and an added random seed of 42 for reproducibility. It is fitted only on training images. The transformed training and test shapes are (1030, 150) and (258, 150). An independent full-SVD PCA checks the variance threshold.</p><h3>Task 3 Eigenface visualization</h3><p>The 150 eigenvectors are reshaped to (150, 50, 37). The first 12 components are shown below. Each is displayed with its own grayscale contrast range.</p><figure><img src="./assets/results/task3_eigenfaces.png" alt="The first twelve eigenfaces from the fitted PCA"><figcaption>Figure 1. Genuine eigenfaces generated by the completed Python script.</figcaption></figure><h3>Task 4 Recognition using an SVM</h3><p>An <code>SVC(kernel='rbf', class_weight='balanced')</code> with default C=1 and gamma='scale' is fitted to the 150 whitened training weights. It correctly predicts 219 of 258 test images, an accuracy of 84.88%, with 39 incorrect predictions.</p><div class="table-wrap" tabindex="0" role="region" aria-label="Classification report"><table><caption>Held-out test classification report</caption><thead><tr><th scope="col">Identity</th><th scope="col">Precision</th><th scope="col">Recall</th><th scope="col">F1</th><th scope="col">Support</th></tr></thead><tbody>__ROWS__</tbody></table></div>
<h2>Analysis figures</h2><figure><img src="./assets/results/q1_variance.png" alt="Cumulative explained variance reaching 90 percent at 85 components"><figcaption>Figure 2. Exact variance is 89.8876% at 84 components and 90.0017% at 85 components.</figcaption></figure><figure><img src="./assets/results/q2_eigenface_comparison.png" alt="Eigenfaces 1 to 3 compared with 148 to 150"><figcaption>Figure 3. Broad early patterns versus finer late patterns in the retained 150-component set.</figcaption></figure><figure><img src="./assets/results/q4_failed_predictions.png" alt="Six failed test predictions with true and predicted identities"><figcaption>Figure 4. Incorrect predictions extracted programmatically from the held-out test set.</figcaption></figure>
__QUESTIONS__
<h2>Conclusion</h2><p>PCA compressed 1,850 pixel features into 150 coordinates while retaining approximately 94.56% of training variance. Eighty-five components were sufficient for 90%. The balanced RBF SVM achieved 84.88% held-out accuracy. Failure examples show that pose, expression, glasses, and lighting can change the global appearance modeled by eigenfaces. Retaining high variance does not automatically preserve all identity-discriminating information.</p><h2>Sources and reproducibility</h2><p class="source">Primary handout: CSST106_Lab_Experiment_05_PCA_in_CV.docx. Python source: python/lab5_pca.py. Fixed model, training/test indices, array hashes, library versions, and predictions: assets/data/manifest.json. Dataset: Labeled Faces in the Wild, through scikit-learn. PCA reference: <a href="https://scikit-learn.org/stable/modules/generated/sklearn.decomposition.PCA.html">https://scikit-learn.org/stable/modules/generated/sklearn.decomposition.PCA.html</a>.</p></main><script>document.getElementById('print-report').addEventListener('click',()=>window.print());</script></body></html>"""
(ROOT / "report.html").write_text(report.replace("__ROWS__", rows).replace("__QUESTIONS__", q_html), encoding="utf-8")
with zipfile.ZipFile(ROOT / "downloads/python-lab5.zip", "w", zipfile.ZIP_DEFLATED) as kit:
    for path in sorted((ROOT / "python").glob("*")):
        if path.is_file():
            kit.write(path, Path("python") / path.name)
    kit.write(ROOT / "downloads/ANSWERS.md", "downloads/ANSWERS.md")
    kit.writestr("README.md", "# Laboratory 5 Python kit\n\nRun these commands from the extracted folder:\n\n```powershell\npython -m pip install -r python/requirements.txt\npython python/lab5_pca.py\n```\n\nClose each plot window to continue. The first run downloads LFW. See python/README.md for settings and downloads/ANSWERS.md for all nine written answers. The model exporter is included for reproducing website assets; it is not required to complete the original activity.\n")
print(f"Generated report.html, all {len(questions.items)} answers, and the Python kit.")




