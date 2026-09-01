param(
  [string]$Version = "22.23.2"
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$runtimeRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '.runtime')).TrimEnd('\')
$archiveName = "node-v$Version-win-x64.zip"
$archivePath = Join-Path $runtimeRoot $archiveName
$checksumsPath = Join-Path $runtimeRoot "node-v$Version-SHASUMS256.txt"
$destination = Join-Path $runtimeRoot "node-v$Version-win-x64"
$executable = Join-Path $destination 'node.exe'

if (-not $runtimeRoot.StartsWith($projectRoot, [StringComparison]::OrdinalIgnoreCase)) { throw "Caminho de runtime inseguro: $runtimeRoot" }
if (Test-Path -LiteralPath $executable) {
  Write-Output "Node.js v$Version já está disponível em $destination"
  exit 0
}

New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$releaseBase = "https://nodejs.org/dist/v$Version"
if (-not (Test-Path -LiteralPath $archivePath)) { Invoke-WebRequest -UseBasicParsing -Uri "$releaseBase/$archiveName" -OutFile $archivePath }
if (-not (Test-Path -LiteralPath $checksumsPath)) { Invoke-WebRequest -UseBasicParsing -Uri "$releaseBase/SHASUMS256.txt" -OutFile $checksumsPath }

$escapedArchiveName = [regex]::Escape($archiveName)
$expectedLine = Get-Content -LiteralPath $checksumsPath | Where-Object { $_ -match "\s\*?$escapedArchiveName$" } | Select-Object -First 1
if (-not $expectedLine) { throw "Checksum oficial não encontrado para $archiveName" }
$expectedHash = ($expectedLine -split '\s+')[0].ToUpperInvariant()
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToUpperInvariant()
if ($actualHash -ne $expectedHash) { throw "Checksum inválido para o runtime Node.js." }

Expand-Archive -LiteralPath $archivePath -DestinationPath $runtimeRoot -Force
if (-not (Test-Path -LiteralPath $executable)) { throw "node.exe não foi encontrado após a extração." }
Write-Output "Node.js v$Version verificado e extraído em $destination"
