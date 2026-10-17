from zipfile import ZipFile
from pathlib import Path
p=Path(r"C:\Users\ACER\Downloads\Aplikasi Geoverse.docx")
with ZipFile(p) as z:
    names=z.namelist()
    print("MEDIA:", [n for n in names if n.startswith("word/media/")])
    print("COMMENTS:", [n for n in names if "comment" in n.lower()])
    print("TRACKED_CHANGE_TAGS:", end=" ")
    xml=z.read("word/document.xml").decode("utf-8", errors="ignore")
    print({tag: xml.count(tag) for tag in ["<w:ins", "<w:del", "<w:commentRangeStart", "<w:commentReference"]})
