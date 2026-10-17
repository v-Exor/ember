# %% Task 1: Data acquisition and preprocessing
from pathlib import Path
from time import perf_counter

import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import fetch_lfw_people
from sklearn.model_selection import train_test_split

# Keep the downloaded dataset and generated figures beside this script.
BASE = Path(__file__).resolve().parent
OUTPUT = BASE / "outputs"
OUTPUT.mkdir(exist_ok=True)

print("Loading LFW; the first run needs an internet connection...", flush=True)
lfw_people = fetch_lfw_people(
    min_faces_per_person=70,
    resize=0.4,
    data_home=str(BASE / "data"),
)
n_samples, h, w = lfw_people.images.shape
X = lfw_people.data
y = lfw_people.target
target_names = lfw_people.target_names
n_classes = len(target_names)

print(f"Images: {n_samples}")
print(f"Image dimensions: {h} x {w}")
print(f"Features per image: {X.shape[1]}")
print(f"Classes: {n_classes}")
print(f"X shape: {X.shape}; y shape: {y.shape}")

# Match the split specified in the laboratory document.
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"Training shape: {X_train.shape}; test shape: {X_test.shape}")


# %% Task 2: Computing the principal components
from sklearn.decomposition import PCA

n_components = 150
start = perf_counter()
pca = PCA(
    n_components=n_components,
    svd_solver="randomized",
    whiten=True,
    random_state=42,  # Make the randomized decomposition reproducible.
)
# Learn the mean and eigenfaces exclusively from the training set.
pca.fit(X_train)
X_train_pca = pca.transform(X_train)
X_test_pca = pca.transform(X_test)
print(f"PCA completed in {perf_counter() - start:.3f} seconds")
print(f"Reduced training shape: {X_train_pca.shape}")
print(f"Reduced test shape: {X_test_pca.shape}")


# %% Task 3: Visualizing the eigenfaces
eigenfaces = pca.components_.reshape(n_components, h, w)


def plot_gallery(images, titles, filename, n_row=3, n_col=4):
    """Display images and save a figure for the laboratory report."""
    fig, axes = plt.subplots(
        n_row, n_col, figsize=(3 * n_col, 3.3 * n_row), squeeze=False
    )
    for i, ax in enumerate(axes.ravel()):
        ax.axis("off")
        if i < len(images):
            ax.imshow(np.asarray(images[i]).reshape(h, w), cmap="gray")
            ax.set_title(titles[i], fontsize=10)
    fig.tight_layout()
    fig.savefig(OUTPUT / filename, dpi=180, bbox_inches="tight")
    plt.show()
    plt.close(fig)


eigenface_titles = [f"Eigenface {i + 1}" for i in range(n_components)]
plot_gallery(eigenfaces[:12], eigenface_titles[:12], "task3_eigenfaces.png")


# %% Task 4: Face recognition in the reduced space
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report

start = perf_counter()
clf = SVC(kernel="rbf", class_weight="balanced")
clf.fit(X_train_pca, y_train)
print(f"SVM fitted in {perf_counter() - start:.3f} seconds")
y_pred = clf.predict(X_test_pca)
report = classification_report(
    y_test,
    y_pred,
    labels=np.arange(n_classes),
    target_names=target_names,
    zero_division=0,
)
print(report)
print(f"Test accuracy: {accuracy_score(y_test, y_pred):.2%}")
(OUTPUT / "classification_report.txt").write_text(report, encoding="utf-8")


# %% Post-lab Q1: Cumulative explained variance and the 90% threshold
# Plot the required 150-component model's cumulative explained variance.
cumulative = pca.explained_variance_ratio_.cumsum()

# Use a separate exact decomposition to check the minimum threshold.
# Preserve the 150-component PCA used by the classifier.
pca_variance = PCA(svd_solver="full").fit(X_train)
exact_cumulative = pca_variance.explained_variance_ratio_.cumsum()
n_90 = int(np.searchsorted(exact_cumulative, 0.90) + 1)
print(f"Q1: Minimum components retaining at least 90% variance: {n_90}")
print(f"Variance at {n_90 - 1} components: {exact_cumulative[n_90 - 2]:.4%}")
print(f"Variance at {n_90} components: {exact_cumulative[n_90 - 1]:.4%}")
print(f"Variance retained by Task 2's 150 components: {cumulative[-1]:.4%}")

fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(np.arange(1, len(cumulative) + 1), cumulative, label="Task 2 PCA")
limit = max(150, n_90 + 10)
ax.plot(
    np.arange(1, min(limit, len(exact_cumulative)) + 1),
    exact_cumulative[:limit],
    "--",
    label="Exact PCA check",
)
ax.axhline(0.90, color="red", linestyle=":", label="90% variance")
ax.axvline(n_90, color="green", linestyle=":", label=f"{n_90} components")
ax.scatter([n_90], [exact_cumulative[n_90 - 1]], color="green", zorder=3)
ax.set(xlabel="Number of principal components", ylabel="Cumulative explained variance")
ax.set_title("Cumulative Explained Variance on the Training Set")
ax.grid(alpha=0.3)
ax.legend()
fig.tight_layout()
fig.savefig(OUTPUT / "q1_variance.png", dpi=180)
plt.show()
plt.close(fig)


# %% Post-lab Q2: Compare the first three and last three retained eigenfaces
selected = [0, 1, 2, 147, 148, 149]
plot_gallery(
    eigenfaces[selected],
    [eigenface_titles[i] for i in selected],
    "q2_eigenface_comparison.png",
    n_row=2,
    n_col=3,
)


# %% Post-lab Q4: Display actual incorrect predictions
wrong_indices = np.flatnonzero(y_pred != y_test)
print(f"Incorrect predictions: {len(wrong_indices)} / {len(y_test)}")
if len(wrong_indices):
    selected_errors = wrong_indices[:6]
    error_titles = [
        f"Test index {i}\nTrue: {target_names[y_test[i]]}\n"
        f"Predicted: {target_names[y_pred[i]]}"
        for i in selected_errors
    ]
    plot_gallery(
        X_test[selected_errors],
        error_titles,
        "q4_failed_predictions.png",
        n_row=2,
        n_col=3,
    )
    for i in selected_errors:
        print(f"Test index {i}: {target_names[y_test[i]]} -> {target_names[y_pred[i]]}")
else:
    print("No misclassified test images in this run.")
