# CSST106 Laboratory Activity 5

Principal Component Analysis in Computer Vision

Based on CSST106_Lab_Experiment_05_PCA_in_CV.docx. Results are from the fixed LFW training/test split in the completed laboratory.

## Post-lab analysis

### 1. How many components retain 90% of the variance?

85 components are required with the handout’s training split: 84 retain 89.8876% and 85 retain 90.0017%. The 150-component model retains about 94.56%. The interactive variance graph uses the same training data and displays the required cumulative explained variance alongside an exact full-SVD check. These figures measure variance, not recognition accuracy.

### 2. What do the first three and last three eigenfaces capture?

Eigenface 1 emphasizes broad facial structure and overall facial contrast. Eigenface 2 shows a strong left-to-right brightness gradient, consistent with lighting-direction variation. Eigenface 3 contrasts the center of the face with outer regions, suggesting facial shading and outline changes. Eigenfaces 148–150 show finer fragmented patterns around features, with much lower individual variance; these may include subtle detail, alignment differences, and noise. Each component can mix several effects. Use Task 3’s comparison view to inspect the actual patterns.

### 3. What does whitening do, and why does it help an SVM?

For component j, whitening computes zⱼ = ((x − μ) · vⱼ) / √λⱼ, where λⱼ is the component’s training variance (singular value squared divided by n_train − 1). It gives the retained training projections unit sample variance and approximately zero cross-covariance. An RBF SVM uses squared Euclidean distance, so whitening prevents high-variance directions from dominating distance. This can improve prediction, although it can also amplify low-variance noise and does not guarantee better accuracy. Scikit-learn PCA documentation ↗

### 4. Why did the eigenface approach fail on specific images?

The Python run made 39 errors. At test index 13, Tony Blair was predicted as George W Bush: head tilt and an open mouth may shift facial patterns. At index 21, Donald Rumsfeld was predicted as George W Bush: glasses and a broad smile may alter eye and mouth features. At index 31, George W Bush was predicted as Colin Powell: uneven lighting and forehead/eye shadows may obscure identity-related detail. These image-based hypotheses reflect PCA’s sensitivity to global appearance, rather than proving the cause of each error. The program extracts failures using np.flatnonzero(y_pred != y_test).

## Follow-up questions

### 1. Why is dimensionality reduction important in computer vision?

It reduces computation, memory use, and redundant features. Keeping informative components can also reduce noise and overfitting, while making high-dimensional image data easier to model and visualize.

### 2. How do the first and second principal components differ?

The first captures the greatest variance. The second captures the greatest remaining variance while being orthogonal to the first. Their training projections are uncorrelated.

### 3. What might be lost when 1,000 features become 100 components?

Variation along the discarded directions is lost. This can include fine texture, subtle edges, small facial details, and noise. Retaining 100 out of 1,000 components does not mean retaining only 10% of the information; the retained variance depends on the data.

### 4. How can PCA be applied to face recognition?

Resize and align face images consistently, flatten them, learn the training mean and eigenfaces, and project faces onto the retained components. Train a classifier on those weights to predict the known identities. Apply the same training mean and PCA transformation to held-out images.

### 5. Why should image features be centered before PCA?

Subtracting each pixel’s training mean makes PCA describe variation around the mean face. Without centering, the common offset can dominate the decomposition. Scikit-learn PCA centers features automatically; it does not standardize the original pixels to unit variance.

