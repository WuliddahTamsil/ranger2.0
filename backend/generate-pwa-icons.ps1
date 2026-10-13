Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\ACER\.gemini\antigravity-ide\brain\ccc9a836-642a-4cf7-b7c3-26a0922dfc17\.user_uploaded\media_1791882707950.png"
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source file not found at $sourcePath"
    exit 1
}

$srcImage = [System.Drawing.Image]::FromFile($sourcePath)

# Function to resize image with high quality
function Resize-Image {
    param (
        [System.Drawing.Image]$img,
        [int]$width,
        [int]$height,
        [string]$destPath,
        [double]$paddingRatio = 0.0,
        [System.Drawing.Color]$bgColor = [System.Drawing.Color]::Transparent
    )

    $dir = [System.IO.Path]::GetDirectoryName($destPath)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $destBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)

    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgColor -ne [System.Drawing.Color]::Transparent) {
        $g.Clear($bgColor)
    } else {
        $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    }

    $padX = [int]($width * $paddingRatio)
    $padY = [int]($height * $paddingRatio)
    $destW = $width - (2 * $padX)
    $destH = $height - (2 * $padY)

    $g.DrawImage($img, $padX, $padY, $destW, $destH)
    $g.Dispose()

    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Output "Created: $destPath ($width x $height)"
}

$publicDir = "d:\ranger2.0\public"
$assetsDir = "d:\ranger2.0\assets"

# 1. PWA Icons in public/
Resize-Image $srcImage 192 192 "$publicDir\icon-192.png" 0.0
Resize-Image $srcImage 512 512 "$publicDir\icon-512.png" 0.0
Resize-Image $srcImage 192 192 "$publicDir\icon-maskable-192.png" 0.10 ([System.Drawing.Color]::White)
Resize-Image $srcImage 512 512 "$publicDir\icon-maskable-512.png" 0.10 ([System.Drawing.Color]::White)
Resize-Image $srcImage 180 180 "$publicDir\apple-touch-icon.png" 0.0
Resize-Image $srcImage 32 32 "$publicDir\favicon-32x32.png" 0.0
Resize-Image $srcImage 16 16 "$publicDir\favicon-16x16.png" 0.0
Resize-Image $srcImage 48 48 "$publicDir\favicon.png" 0.0

# 2. Native Expo Icons in assets/
Resize-Image $srcImage 1024 1024 "$assetsDir\icon.png" 0.0
Resize-Image $srcImage 512 512 "$assetsDir\android-icon-foreground.png" 0.15
Resize-Image $srcImage 512 512 "$assetsDir\splash-icon.png" 0.0
Resize-Image $srcImage 48 48 "$assetsDir\favicon.png" 0.0

$srcImage.Dispose()
Write-Output "All icons successfully generated!"
