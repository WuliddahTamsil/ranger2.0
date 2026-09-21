On Error Resume Next
Set Sound = CreateObject("WMPlayer.OCX")
Sound.settings.volume = 100
Sound.URL = "C:\Users\ACER\Downloads\notif omp\yippe.mp3"
Sound.Controls.play

dim count
count = 0
do while (Sound.currentmedia.duration = 0 and count < 30)
    WScript.Sleep 100
    count = count + 1
loop

WScript.Sleep 1500
WScript.StdOut.WriteLine "{}"
