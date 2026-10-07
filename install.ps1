param([string]$Image = $env:CRYPTOTOOLS_IMAGE, [switch]$LocalImage, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($Image)) { throw 'Set -Image or CRYPTOTOOLS_IMAGE.' }
$env:CRYPTOTOOLS_IMAGE = $Image
function Assert-Docker { if ($LASTEXITCODE -ne 0) { throw "Docker failed: $LASTEXITCODE" } }
if ($LocalImage) {
    docker image inspect $Image | Out-Null; Assert-Docker
    docker compose up -d --pull never --wait --wait-timeout 120; Assert-Docker
} else {
    docker compose pull; Assert-Docker
    docker compose up -d --wait --wait-timeout 120; Assert-Docker
}
$port = if ($env:APP_PORT) { $env:APP_PORT } else { '8080' }
$url = "http://127.0.0.1:$port"
Write-Output "cryptotools is ready: $url"
if (-not $NoBrowser) { Start-Process $url }
