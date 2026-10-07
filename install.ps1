# Read before running: https://github.com/easyicetrusty/cryptotools/blob/main/install.ps1
param([string]$Image = $env:CRYPTOTOOLS_IMAGE, [switch]$Update, [switch]$LocalImage, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Image)) { $Image = 'ghcr.io/easyicetrusty/cryptotools:latest' }
$env:CRYPTOTOOLS_IMAGE = $Image
function Assert-Docker { if ($LASTEXITCODE -ne 0) { throw "Docker failed: $LASTEXITCODE" } }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Install and start Docker with Compose v2 first.' }
docker compose version | Out-Null; Assert-Docker
$directory = if ($env:CRYPTOTOOLS_DIR) { $env:CRYPTOTOOLS_DIR } else { Join-Path $HOME '.cryptotools' }
New-Item -ItemType Directory -Force -Path $directory | Out-Null
$config = Join-Path $directory 'compose.yaml'
$temp = Join-Path $directory ('compose.' + [guid]::NewGuid().ToString() + '.tmp')
try {
    Invoke-WebRequest 'https://raw.githubusercontent.com/easyicetrusty/cryptotools/v0.5.0/compose.yaml' -OutFile $temp
    Move-Item -Force $temp $config
} finally {
    if (Test-Path $temp) { Remove-Item $temp }
}
if ($LocalImage) {
    docker image inspect $Image | Out-Null; Assert-Docker
} else {
    docker compose -f $config pull; Assert-Docker
}
# Recreate services, never remove the named data volumes.
docker compose -f $config up -d --pull never --force-recreate --wait --wait-timeout 180; Assert-Docker
$port = if ($env:APP_PORT) { $env:APP_PORT } else { '8080' }
$url = "http://127.0.0.1:$port"
$action = if ($Update) { 'update' } else { 'install' }
Write-Output "cryptotools $action complete: $url"
Write-Output "Data volumes retained. Compose file: $config"
if (-not $NoBrowser) { Start-Process $url }
