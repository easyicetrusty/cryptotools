param([string]$Assets)
$ErrorActionPreference='Stop'
$global:Calls=@()
function docker { $global:LASTEXITCODE=0; $global:Calls+=@("$args image=$env:CRYPTOTOOLS_IMAGE") }
function Invoke-WebRequest { param($Uri,$OutFile); Copy-Item (Join-Path $Assets ([uri]$Uri).Segments[-1]) $OutFile }
function Invoke-RestMethod { param($Uri); return @([pscustomobject]@{draft=$false;tag_name='v0.7.4'}) }
$root=Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
$env:CRYPTOTOOLS_DIR=$root
Remove-Item Env:CRYPTOTOOLS_IMAGE -ErrorAction SilentlyContinue
try {
    & (Join-Path $Assets 'install.ps1') -NoBrowser
    $expected='ghcr.io/easyicetrusty/cryptotools@sha256:' + ('a'*64)
    if ($env:CRYPTOTOOLS_IMAGE -ne $expected) { throw 'Install pin mismatch' }
    Write-Output 'PASS PowerShell install pins generated release digest'
    Remove-Item Env:CRYPTOTOOLS_IMAGE
    & (Join-Path $Assets 'install.ps1') -NoBrowser -Update
    if ($env:CRYPTOTOOLS_IMAGE -ne $expected) { throw 'Update pin mismatch' }
    Write-Output 'PASS PowerShell update resolves newest release and pins digest'
    if ((Get-Content -Raw (Join-Path $root '.env')).Trim() -ne "CRYPTOTOOLS_IMAGE=$expected") { throw 'Persisted pin mismatch' }
    Write-Output 'PASS PowerShell persists pin in .env'
    $env:CRYPTOTOOLS_IMAGE='ghcr.io/easyicetrusty/cryptotools:latest'
    $blocked=$false
    try { & (Join-Path $Assets 'install.ps1') -NoBrowser } catch { if ($_.Exception.Message -match 'digest pin') { $blocked=$true } else { throw } }
    if (-not $blocked) { throw 'Mutable image accepted' }
    Write-Output 'PASS PowerShell refuses mutable installer image override'
    Remove-Item Env:CRYPTOTOOLS_IMAGE
    $original=[IO.File]::ReadAllBytes((Join-Path $Assets 'compose.yaml'))
    try {
        Set-Content (Join-Path $Assets 'compose.yaml') 'tampered'
        $blocked=$false
        try { & (Join-Path $Assets 'install.ps1') -NoBrowser } catch { if ($_.Exception.Message -match 'Checksum failed') { $blocked=$true } else { throw } }
        if (-not $blocked) { throw 'Tampered asset accepted' }
        Write-Output 'PASS PowerShell refuses checksum mismatch'
    } finally { [IO.File]::WriteAllBytes((Join-Path $Assets 'compose.yaml'),$original) }
    Write-Output 'Mock Docker calls (no network/registry operations):'
    $global:Calls | Write-Output
} finally { Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue }
