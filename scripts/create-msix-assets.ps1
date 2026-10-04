param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$sourceImage = [System.Drawing.Image]::FromFile($Source)
try {
  $targets = @{
    'StoreLogo.png' = @(50, 50)
    'Square44x44Logo.png' = @(44, 44)
    'Square150x150Logo.png' = @(150, 150)
    'Wide310x150Logo.png' = @(310, 150)
  }
  foreach ($name in $targets.Keys) {
    $width = $targets[$name][0]
    $height = $targets[$name][1]
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $side = [Math]::Min($width, $height)
        $left = [int](($width - $side) / 2)
        $top = [int](($height - $side) / 2)
        $graphics.DrawImage($sourceImage, $left, $top, $side, $side)
      } finally {
        $graphics.Dispose()
      }
      $bitmap.Save((Join-Path $Destination $name), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  }
} finally {
  $sourceImage.Dispose()
}
