param(
    [switch]$Hard
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot 'backend'
$dataPath = Join-Path $backendPath 'database\data'

if (-not (Test-Path $backendPath)) {
    throw "Backend path not found: $backendPath"
}

if ($Hard) {
    Write-Host 'Stopping Postgres container and wiping persisted database files...'
    docker compose down | Out-Host

    if (Test-Path $dataPath) {
        $resolvedDataPath = (Resolve-Path $dataPath).Path
        $resolvedBackendPath = (Resolve-Path $backendPath).Path

        if (-not $resolvedDataPath.StartsWith($resolvedBackendPath, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to delete path outside backend directory: $resolvedDataPath"
        }

        Remove-Item -LiteralPath $resolvedDataPath -Recurse -Force
    }

    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null

    Write-Host 'Starting Postgres container again...'
    docker compose up -d db | Out-Host
}

Write-Host 'Running migrate:fresh --seed...'
Push-Location $backendPath
try {
    php artisan migrate:fresh --seed
}
finally {
    Pop-Location
}
