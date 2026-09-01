param(
  [string]$Version = "43.0.0"
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$runtimeRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '.runtime')).TrimEnd('\')
$destination = [IO.Path]::GetFullPath((Join-Path $runtimeRoot "electron-v$Version")).TrimEnd('\')

if (-not $runtimeRoot.StartsWith($projectRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Caminho de runtime inseguro: $runtimeRoot"
}
if (-not $destination.StartsWith($runtimeRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Destino de runtime inseguro: $destination"
}

$executable = Join-Path $destination 'electron.exe'
if (Test-Path -LiteralPath $executable) {
  Write-Output "Electron v$Version já está disponível em $destination"
  exit 0
}

New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$archiveName = "electron-v$Version-win32-x64.zip"
$archivePath = Join-Path $runtimeRoot $archiveName
$checksumsPath = Join-Path $runtimeRoot "electron-v$Version-SHASUMS256.txt"
$releaseBase = "https://github.com/electron/electron/releases/download/v$Version"

if (-not (Test-Path -LiteralPath $archivePath)) {
  Invoke-WebRequest -UseBasicParsing -Uri "$releaseBase/$archiveName" -OutFile $archivePath
}
if (-not (Test-Path -LiteralPath $checksumsPath)) {
  Invoke-WebRequest -UseBasicParsing -Uri "$releaseBase/SHASUMS256.txt" -OutFile $checksumsPath
}

$escapedArchiveName = [regex]::Escape($archiveName)
$expectedLine = Get-Content -LiteralPath $checksumsPath | Where-Object { $_ -match "\s\*?$escapedArchiveName$" } | Select-Object -First 1
if (-not $expectedLine) { throw "Checksum oficial não encontrado para $archiveName" }
$expectedHash = ($expectedLine -split '\s+')[0].ToUpperInvariant()
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToUpperInvariant()
if ($actualHash -ne $expectedHash) { throw "Checksum inválido para o runtime Electron." }

New-Item -ItemType Directory -Path $destination -Force | Out-Null
Expand-Archive -LiteralPath $archivePath -DestinationPath $destination -Force
if (-not (Test-Path -LiteralPath $executable)) { throw "electron.exe não foi encontrado após a extração." }
Write-Output "Electron v$Version verificado e extraído em $destination"
