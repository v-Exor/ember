"""Reproduce the handout's fitted PCA/SVM and export a static browser model.

Run from the project root with:
    python python/export_model.py --data-home /path/to/scikit_learn_data
No school logos or images from the handout are extracted.
"""
from pathlib import Path
import argparse
import hashlib
import json
import platform

import numpy as np
import sklearn
from PIL import Image
from sklearn.datasets import fetch_lfw_people
from sklearn.decomposition import PCA
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from threadpoolctl import threadpool_limits


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-home", default=None)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    assets = root / "assets"
    data = assets / "data"
    data.mkdir(parents=True, exist_ok=True)
    threadpool_limits(limits=4)
    faces = fetch_lfw_people(min_faces_per_person=70, resize=0.4, data_home=args.data_home)
    X, y = faces.data, faces.target
    train, test = train_test_split(np.arange(len(X)), test_size=0.2, random_state=42)
    pca = PCA(n_components=150, svd_solver="randomized", whiten=True, random_state=42).fit(X[train])
    projected_train, projected_test = pca.transform(X[train]), pca.transform(X[test])
    svm = SVC(kernel="rbf", class_weight="balanced").fit(projected_train, y[train])
    predicted = svm.predict(projected_test)
    full = PCA(svd_solver="full").fit(X[train])
    full_cumulative = full.explained_variance_ratio_.cumsum()
    arrays = {}
    with (data / "model.bin").open("wb") as file:
        def write(name, values, dtype):
            # Float64 blocks must start on 8-byte boundaries for JS typed arrays.
            padding = (-file.tell()) % 8
            file.write(b"\0" * padding)
            values = np.ascontiguousarray(values, dtype=dtype)
            arrays[name] = {"offset": file.tell(), "length": values.size, "shape": list(values.shape), "type": dtype}
            file.write(values.tobytes())
        write("mean", pca.mean_, "<f4")
        write("components", pca.components_, "<f4")
        write("variance", pca.explained_variance_, "<f4")
        write("ratios", pca.explained_variance_ratio_, "<f4")
        write("fullCumulative", full_cumulative, "<f4")
        write("supportVectors", svm.support_vectors_, "<f8")
        write("dual", svm.dual_coef_, "<f8")
        write("intercepts", svm.intercept_, "<f8")
        write("supportCounts", svm.n_support_, "<i4")
    # Preserve the exact preprocessed float32 pixels used by scikit-learn.
    (data / "faces.bin").write_bytes(np.ascontiguousarray(X, dtype="<f4").tobytes())
    manifest = {
        "schema": 1,
        "source": "CSST106_Lab_Experiment_05_PCA_in_CV.docx",
        "dataset": "Labeled Faces in the Wild (LFW), funneled",
        "preprocessing": {"minFacesPerPerson": 70, "resize": 0.4, "height": 50, "width": 37, "features": 1850},
        "samples": len(X), "names": faces.target_names.tolist(), "labels": y.tolist(),
        "trainIndices": train.tolist(), "testIndices": test.tolist(),
        "settings": {"testSize": 0.2, "randomState": 42, "nComponents": 150, "svdSolver": "randomized", "whiten": True, "kernel": "rbf", "classWeight": "balanced", "C": 1.0, "gamma": float(svm._gamma)},
        "arrays": arrays,
        "files": {},
        "results": {
            "accuracy": float(accuracy_score(y[test], predicted)),
            "correct": int(np.sum(predicted == y[test])), "incorrect": int(np.sum(predicted != y[test])),
            "n90": int(np.searchsorted(full_cumulative, 0.9) + 1),
            "variance84": float(full_cumulative[83]), "variance85": float(full_cumulative[84]),
            "variance150": float(pca.explained_variance_ratio_.sum()),
            "predictions": predicted.tolist(), "testProjections": projected_test[:3].astype(float).tolist(),
            "confusion": confusion_matrix(y[test], predicted).tolist(),
            "report": classification_report(y[test], predicted, target_names=faces.target_names, output_dict=True, zero_division=0),
        },
        "environment": {"python": platform.python_version(), "numpy": np.__version__, "scikitLearn": sklearn.__version__},
        "classCounts": np.bincount(y).tolist(),
    }
    for name in ["faces.bin", "model.bin"]:
        raw = (data / name).read_bytes()
        manifest["files"][name] = {"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
    (data / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    report = classification_report(y[test], predicted, target_names=faces.target_names, zero_division=0)
    (root / "downloads" / "classification_report.txt").write_text(report, encoding="utf-8")
    (root / "downloads" / "reference-results.json").write_text(json.dumps({k: v for k, v in manifest.items() if k not in ["arrays", "labels", "trainIndices", "testIndices"]}, indent=2), encoding="utf-8")

    def save_face(values, path, normalize=False):
        values = np.asarray(values).reshape(50, 37)
        if normalize:
            values = (values - values.min()) / max(1e-12, np.ptp(values))
        Image.fromarray(np.uint8(np.clip(values, 0, 1) * 255)).resize((222, 300), Image.Resampling.NEAREST).save(path, quality=87)
    save_face(X[test[0]], assets / "hero-face.webp")
    save_face(pca.components_[1], assets / "hero-eigenface.webp", normalize=True)
    reconstructed = pca.mean_ + (projected_test[0, :50] * np.sqrt(pca.explained_variance_[:50])) @ pca.components_[:50]
    save_face(reconstructed, assets / "hero-reconstruction.webp")
    save_face(pca.mean_, assets / "mean-face.webp")
    sprite = Image.new("L", (37 * 16, 50 * 17), color=245)
    for i, row in enumerate(X[test]):
        sprite.paste(Image.fromarray(np.uint8(np.clip(row.reshape(50, 37), 0, 1) * 255)), ((i % 16) * 37, (i // 16) * 50))
    sprite.save(assets / "test-faces.webp", quality=87)
    print(json.dumps({"accuracy": manifest["results"]["accuracy"], "n90": manifest["results"]["n90"], "supportVectors": len(svm.support_vectors_), "files": manifest["files"]}, indent=2))


if __name__ == "__main__":
    main()
