# Published release asset. Verify SHA256SUMS before execution; source template fails closed.
param([string]$Image = $env:CRYPTOTOOLS_IMAGE, [switch]$Update, [switch]$LocalImage, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$ReleaseVersion = '@RELEASE_VERSION@'
$PinnedImage = 'ghcr.io/easyicetrusty/cryptotools@sha256:@IMAGE_DIGEST@'
function Assert-Docker { if ($LASTEXITCODE -ne 0) { throw "Docker failed: $LASTEXITCODE" } }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Install Docker with Compose v2 first.' }
docker compose version | Out-Null; Assert-Docker
if ($Update) {
    $releases = Invoke-RestMethod 'https://api.github.com/repos/easyicetrusty/cryptotools/releases?per_page=20'
    $ReleaseVersion = ($releases | Where-Object { -not $_.draft } | Select-Object -First 1).tag_name
}
if ($ReleaseVersion -notmatch '^v[0-9]+\.[0-9]+\.[0-9]+(-beta\.[0-9]+)?$') { throw 'Run a published release installer, not the source template.' }
$directory = if ($env:CRYPTOTOOLS_DIR) { $env:CRYPTOTOOLS_DIR } else { Join-Path $HOME '.cryptotools' }
New-Item -ItemType Directory -Force -Path $directory | Out-Null
$work = Join-Path $directory ('download.' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $work | Out-Null
try {
    $base = "https://github.com/easyicetrusty/cryptotools/releases/download/$ReleaseVersion"
    foreach ($name in @('SHA256SUMS','compose.yaml','image-reference.txt')) { Invoke-WebRequest "$base/$name" -OutFile (Join-Path $work $name) }
    $sums = Get-Content (Join-Path $work 'SHA256SUMS')
    foreach ($name in @('compose.yaml','image-reference.txt')) {
        $entry = @($sums | Where-Object { $_ -match ('^[a-f0-9]{64}  ' + [regex]::Escape($name) + '$') })
        if ($entry.Count -ne 1 -or (Get-FileHash (Join-Path $work $name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry[0].Substring(0,64)) { throw "Checksum failed: $name" }
    }
    $releasedImage = (Get-Content -Raw (Join-Path $work 'image-reference.txt')).Trim()
    if ($releasedImage -notmatch '^ghcr.io/easyicetrusty/cryptotools@sha256:[a-f0-9]{64}$') { throw 'Invalid pinned image reference.' }
    if (-not $Update -and $releasedImage -ne $PinnedImage) { throw 'Installer and release digest disagree.' }
    if ([string]::IsNullOrWhiteSpace($Image)) { $Image = $releasedImage }
    if (-not $LocalImage -and $Image -notmatch '^ghcr.io/easyicetrusty/cryptotools@sha256:[a-f0-9]{64}$') { throw 'Installer requires a digest pin; use Compose directly for manual tags.' }
    $env:CRYPTOTOOLS_IMAGE = $Image
    "CRYPTOTOOLS_IMAGE=$Image" | Set-Content -Encoding utf8 (Join-Path $work '.env')
    Move-Item -Force (Join-Path $work 'compose.yaml') (Join-Path $directory 'compose.yaml')
    Move-Item -Force (Join-Path $work '.env') (Join-Path $directory '.env')
} finally { if (Test-Path $work) { Remove-Item -Recurse -Force $work } }
$config = Join-Path $directory 'compose.yaml'
if ($LocalImage) { docker image inspect $Image | Out-Null; Assert-Docker } else { docker compose -f $config pull; Assert-Docker }
docker compose -f $config up -d --pull never --force-recreate --wait --wait-timeout 180; Assert-Docker
$port = if ($env:APP_PORT) { $env:APP_PORT } else { '8080' }
$url = "http://127.0.0.1:$port"
$action = if ($Update) { 'update' } else { 'install' }
Write-Output "cryptotools $action complete: $url"
Write-Output "Pinned image: $Image. Data volumes retained."
if (-not $NoBrowser) { Start-Process $url }
