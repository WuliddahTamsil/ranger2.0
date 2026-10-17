from zipfile import ZipFile
from pathlib import Path
from PIL import Image
src=Path(r"C:\Users\ACER\Downloads\Aplikasi Geoverse.docx")
out=Path(r"D:\ranger2.0\scratch\geoverse_docx_media")
out.mkdir(parents=True, exist_ok=True)
with ZipFile(src) as z:
    data=z.read("word/media/image1.png")
(out/"image1.png").write_bytes(data)
with Image.open(out/"image1.png") as im:
    print(im.size, im.mode)
