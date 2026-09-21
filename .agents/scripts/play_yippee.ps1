# Antigravity completion notification - Yippee!
param()

$soundPath = "C:\Users\ACER\Downloads\notif omp\yippe.mp3"

try {
    if (Test-Path $soundPath) {
        try {
            Add-Type -AssemblyName presentationCore
            $player = New-Object System.Windows.Media.MediaPlayer
            $player.Open([System.Uri]$soundPath)
            $player.Play()
            Start-Sleep -Milliseconds 1500
        } catch {
            $wmp = New-Object -ComObject WMPlayer.OCX
            $wmp.settings.volume = 100
            $wmp.URL = $soundPath
            $wmp.controls.play()
            Start-Sleep -Milliseconds 1500
        }
    }
} catch {
    # Ignore errors to never interrupt agent loop
}

# Return required JSON for Antigravity Stop lifecycle
Write-Output "{}"
