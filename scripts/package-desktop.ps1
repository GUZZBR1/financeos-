param(
  [string]$Version = "43.0.0",
  [string]$DestinationName = "FinanceOS-win-x64"
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$runtimeSource = [IO.Path]::GetFullPath((Join-Path $projectRoot ".runtime\electron-v$Version")).TrimEnd('\')
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'release')).TrimEnd('\')
if ($DestinationName -notmatch '^[A-Za-z0-9._-]+$') {
  throw "Nome de destino inválido: $DestinationName"
}
$destination = [IO.Path]::GetFullPath((Join-Path $releaseRoot $DestinationName)).TrimEnd('\')
$backupRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '.omc\package-backups')).TrimEnd('\')

foreach ($path in @($runtimeSource, $releaseRoot, $destination, $backupRoot)) {
  if (-not $path.StartsWith($projectRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Caminho de empacotamento inseguro: $path"
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $runtimeSource 'electron.exe'))) {
  throw 'Runtime ausente. Execute npm run setup:desktop-runtime.'
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) {
  throw 'Build web ausente. Execute npm run build.'
}

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
if (Test-Path -LiteralPath $destination) {
  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  $backupDestination = Join-Path $backupRoot ($DestinationName + "-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  Move-Item -LiteralPath $destination -Destination $backupDestination
}

Copy-Item -LiteralPath $runtimeSource -Destination $destination -Recurse
$appDestination = Join-Path $destination 'resources\app'
New-Item -ItemType Directory -Path $appDestination -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'dist') -Destination (Join-Path $appDestination 'dist') -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'electron') -Destination (Join-Path $appDestination 'electron') -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'package.json') -Destination (Join-Path $appDestination 'package.json')

$electronExecutable = Join-Path $destination 'electron.exe'
$financeExecutable = Join-Path $destination 'FinanceOS.exe'
Move-Item -LiteralPath $electronExecutable -Destination $financeExecutable

Write-Output "FinanceOS portátil criado em $destination"
