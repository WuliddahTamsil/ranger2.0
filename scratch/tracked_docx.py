from zipfile import ZipFile
from lxml import etree
p=r"C:\Users\ACER\Downloads\Aplikasi Geoverse.docx"
ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(p) as z:
    root=etree.fromstring(z.read("word/document.xml"))
for idx,ins in enumerate(root.xpath(".//w:ins", namespaces=ns)):
    txt="".join(ins.xpath(".//w:t/text()", namespaces=ns))
    print(idx, repr(txt), ins.attrib)
