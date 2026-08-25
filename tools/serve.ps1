# Minimal static file server for local preview - this machine has no node or python,
# so the site is served straight from .NET's HttpListener.
param(
  [int]$Port = 8080,
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

# Maps a file extension to the Content-Type header the browser needs to parse it correctly.
function Get-MimeType($path) {
  switch ([IO.Path]::GetExtension($path).ToLower()) {
    '.html' { 'text/html; charset=utf-8' }
    '.css'  { 'text/css; charset=utf-8' }
    '.js'   { 'application/javascript; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.svg'  { 'image/svg+xml' }
    '.png'  { 'image/png' }
    '.jpg'  { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.webp' { 'image/webp' }
    '.woff2'{ 'font/woff2' }
    '.woff' { 'font/woff' }
    '.otf'  { 'font/otf' }
    '.ttf'  { 'font/ttf' }
    '.ico'  { 'image/x-icon' }
    default { 'application/octet-stream' }
  }
}

# Resolves a request URL to a real file inside $Root, refusing anything that escapes it.
function Resolve-Safe($urlPath, $root) {
  $rel = [Uri]::UnescapeDataString($urlPath).TrimStart('/')
  if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
  $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
  if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { return $null }
  if (Test-Path $full -PathType Container) { $full = Join-Path $full 'index.html' }
  if (Test-Path $full -PathType Leaf) { return $full }
  return $null
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "serving $Root on http://localhost:$Port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $file = Resolve-Safe $ctx.Request.Url.AbsolutePath $Root
  try {
    if ($file) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ctx.Response.ContentType = Get-MimeType $file
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Host "200 $($ctx.Request.Url.AbsolutePath)"
    } else {
      $ctx.Response.StatusCode = 404
      Write-Host "404 $($ctx.Request.Url.AbsolutePath)"
    }
  } catch {
    $ctx.Response.StatusCode = 500
    Write-Host "500 $($ctx.Request.Url.AbsolutePath) - $_"
  } finally {
    $ctx.Response.OutputStream.Close()
  }
}
