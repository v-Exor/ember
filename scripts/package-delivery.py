"""Package the complete deployable project without caches or QA artifacts."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
output = root.parent / "CSST106-Lab05-Website.zip"
excluded = {"node_modules", "artifacts", "test-results", "__pycache__", ".git", ".venv", "data", "outputs"}
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        # assets/data contains the required model, and must be included.
        blocked = any(part in excluded - {"data"} for part in relative.parts)
        if relative.parts[0] == "data" or (len(relative.parts) > 1 and relative.parts[:2] == ("python", "data")):
            blocked = True
        if path.is_file() and not blocked:
            archive.write(path, Path("lab-05") / relative)
print(f"Created {output} ({output.stat().st_size / 1024 / 1024:.2f} MiB)")
