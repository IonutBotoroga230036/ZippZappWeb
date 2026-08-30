# Regenerates the favicon and the iOS home-screen icon from assets/img/favicon-source.png.
# This machine has no node, python or ImageMagick, so the compositing is done with .NET's
# System.Drawing - the same reason serve.ps1 exists.
#
# Both outputs are committed, so this only needs running when the source art or the tuning
# below changes. Run it from anywhere:
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/make-icons.ps1
param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  # How far the disc gradient is pulled toward the brand hue, 0 = ship it exactly as
  # drawn, 1 = flatten it to a single hue. The source art runs 235 to 274 degrees,
  # straddling the brand's 251-260 rather than sitting on it, which reads blue next to
  # the hero waves. At 0.55 the ends land at 246 and 263, which is what is committed.
  [double]$HueBlend = 0.55
)

Add-Type -AssemblyName System.Drawing

$BrandHue = 255.0                      # midpoint of --volt-deep (251) and --volt (260)
$imgDir   = Join-Path $Root 'assets\img'
$source   = Join-Path $imgDir 'favicon-source.png'
if (-not (Test-Path $source)) { throw "Source art not found: $source" }

# --- resampling -----------------------------------------------------------
# Halve repeatedly before the final step. Going from 2505px to 32px in one bicubic jump
# aliases both the disc edge and the bolt; stepping down keeps them clean.
function Shrink-Half($bmp) {
  $w = [Math]::Max(1, [int]($bmp.Width / 2))
  $h = [Math]::Max(1, [int]($bmp.Height / 2))
  $out = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.SmoothingMode = 'HighQuality'
  $g.CompositingQuality = 'HighQuality'
  $g.CompositingMode = 'SourceCopy'      # preserve alpha rather than blending onto black
  $g.DrawImage($bmp, 0, 0, $w, $h)
  $g.Dispose()
  return $out
}

function Resample($bmp, $size) {
  $work = $bmp; $owned = $false
  while (($work.Height / 2) -gt $size) {
    $next = Shrink-Half $work
    if ($owned) { $work.Dispose() }
    $work = $next; $owned = $true
  }
  $out = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.SmoothingMode = 'HighQuality'
  $g.CompositingQuality = 'HighQuality'
  $g.CompositingMode = 'SourceCopy'
  $g.DrawImage($work, 0, 0, $size, $size)
  $g.Dispose()
  if ($owned) { $work.Dispose() }
  return $out
}

# --- gradient correction --------------------------------------------------
# Pulls the disc's hues toward the brand purple, never the bolt - the bolt is already on
# brand at 259 degrees. The discriminator is measured from the source art: the bolt is
# violet-leaning (R clearly above G) while the disc gradient is blue-leaning (G >= R) or
# too dark to matter.
#
# Blending toward a target rather than rotating by a fixed amount is deliberate. A uniform
# rotation large enough to fix the light stop drags the dark stop from 274 to 292 degrees,
# out of violet and into plum.
function Recolour-Disc($bmp, $blend) {
  $out = New-Object System.Drawing.Bitmap $bmp.Width, $bmp.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.CompositingMode = 'SourceCopy'
  $g.DrawImage($bmp, 0, 0, $bmp.Width, $bmp.Height)
  $g.Dispose()
  if ($blend -le 0) { return $out }

  $rect = New-Object System.Drawing.Rectangle 0, 0, $out.Width, $out.Height
  $data = $out.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $n = [Math]::Abs($data.Stride) * $out.Height
  $buf = New-Object byte[] $n
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $n)

  for ($i = 0; $i -lt $n; $i += 4) {
    if ($buf[$i + 3] -lt 128) { continue }
    $b = [double]$buf[$i]; $gr = [double]$buf[$i + 1]; $r = [double]$buf[$i + 2]
    if ((($r - $gr) -gt 14) -and ($r -gt 130)) { continue }   # the bolt: leave alone

    $rr = $r / 255.0; $gg = $gr / 255.0; $bb = $b / 255.0
    $mx = [Math]::Max($rr, [Math]::Max($gg, $bb)); $mn = [Math]::Min($rr, [Math]::Min($gg, $bb))
    $l = ($mx + $mn) / 2.0; $dl = $mx - $mn
    if ($dl -le 0.0001) { continue }
    $s = if ($l -gt 0.5) { $dl / (2.0 - $mx - $mn) } else { $dl / ($mx + $mn) }
    $h = if ($mx -eq $rr) { (($gg - $bb) / $dl) % 6.0 }
         elseif ($mx -eq $gg) { (($bb - $rr) / $dl) + 2.0 }
         else { (($rr - $gg) / $dl) + 4.0 }
    $h = (($h * 60.0) + 360.0) % 360.0
    $h = ($BrandHue + ($h - $BrandHue) * (1.0 - $blend) + 360.0) % 360.0

    $cc = (1.0 - [Math]::Abs(2.0 * $l - 1.0)) * $s
    $hp = $h / 60.0
    $xx = $cc * (1.0 - [Math]::Abs(($hp % 2.0) - 1.0))
    $m = $l - $cc / 2.0
    switch ([int][Math]::Floor($hp)) {
      0 { $r1 = $cc; $g1 = $xx; $b1 = 0.0 }
      1 { $r1 = $xx; $g1 = $cc; $b1 = 0.0 }
      2 { $r1 = 0.0; $g1 = $cc; $b1 = $xx }
      3 { $r1 = 0.0; $g1 = $xx; $b1 = $cc }
      4 { $r1 = $xx; $g1 = 0.0; $b1 = $cc }
      default { $r1 = $cc; $g1 = 0.0; $b1 = $xx }
    }
    $buf[$i]     = [byte][Math]::Round([Math]::Max(0, [Math]::Min(255, ($b1 + $m) * 255)))
    $buf[$i + 1] = [byte][Math]::Round([Math]::Max(0, [Math]::Min(255, ($g1 + $m) * 255)))
    $buf[$i + 2] = [byte][Math]::Round([Math]::Max(0, [Math]::Min(255, ($r1 + $m) * 255)))
  }

  [System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $n)
  $out.UnlockBits($data)
  return $out
}

# --- build ----------------------------------------------------------------
$src = [System.Drawing.Image]::FromFile($source)
# The recolour runs at 512: large enough that the bolt/disc boundary is still clean, small
# enough that a per-pixel loop in PowerShell finishes in seconds.
$mid = Resample $src 512
$disc = Recolour-Disc $mid $HueBlend
$mid.Dispose(); $src.Dispose()

# Tab icon. Keeps the source's transparent corners - browsers handle PNG alpha in a tab
# bar, and the disc is opaque enough to read on light and dark chrome alike.
$favPath = Join-Path $imgDir 'favicon-32.png'
$fav = Resample $disc 32
$fav.Save($favPath, [System.Drawing.Imaging.ImageFormat]::Png)
$fav.Dispose()
Write-Output ("favicon-32.png        32x32   {0,6} bytes" -f (Get-Item $favPath).Length)

# iOS home screen. Must be fully opaque: Apple composites transparency to black rather
# than to the wallpaper, so a transparent disc would arrive sitting on a black square. The
# disc runs at 82% of the square, which keeps it clear of the squircle mask iOS adds.
$S = 180
$touchPath = Join-Path $imgDir 'apple-touch-icon.png'
$touch = New-Object System.Drawing.Bitmap $S, $S, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($touch)
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0a0a0e'))   # --ink
$g.InterpolationMode = 'HighQualityBicubic'
$g.PixelOffsetMode = 'HighQuality'
$g.SmoothingMode = 'AntiAlias'
$g.CompositingQuality = 'HighQuality'
$d = [int][Math]::Round($S * 0.82)
$stepped = Resample $disc $d
$offset = [int][Math]::Round(($S - $d) / 2.0)
$g.DrawImage($stepped, $offset, $offset, $d, $d)
$g.Dispose(); $stepped.Dispose()
$touch.Save($touchPath, [System.Drawing.Imaging.ImageFormat]::Png)
$touch.Dispose(); $disc.Dispose()
Write-Output ("apple-touch-icon.png  180x180 {0,6} bytes   disc {1}px on #0A0A0E" -f (Get-Item $touchPath).Length, $d)
