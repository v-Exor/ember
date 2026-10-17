"""Internal visual QA helper; uses bundled PDFium to render the browser print PDF."""
from pathlib import Path
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
document = pdfium.PdfDocument(root / "artifacts/report-print-qa.pdf")
pages = []
for i in range(len(document)):
    page = document[i]
    image = page.render(scale=1.3).to_pil()
    image.save(root / f"artifacts/report-page-{i+1}.png")
    thumbnail = image.copy()
    thumbnail.thumbnail((300, 440))
    tile = Image.new("RGB", (320, 475), "#eeeae2")
    tile.paste(thumbnail, ((320-thumbnail.width)//2, 25))
    ImageDraw.Draw(tile).text((12, 8), f"Page {i+1}", fill="black")
    pages.append(tile)
contact = Image.new("RGB", (320*3, 475*((len(pages)+2)//3)), "white")
for i, tile in enumerate(pages):
    contact.paste(tile, ((i%3)*320, (i//3)*475))
contact.save(root / "artifacts/report-contact.png")
print(f"Rendered all {len(pages)} report pages for QA.")
