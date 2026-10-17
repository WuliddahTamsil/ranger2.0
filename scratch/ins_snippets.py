from zipfile import ZipFile
p=r"C:\Users\ACER\Downloads\Aplikasi Geoverse.docx"
with ZipFile(p) as z:
 xml=z.read("word/document.xml").decode("utf-8", errors="ignore")
 i=0
 while True:
  i=xml.find("<w:ins", i)
  if i<0: break
  print(xml[i:i+500])
  i+=6
