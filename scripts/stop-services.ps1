$ErrorActionPreference = "SilentlyContinue"

$ports = 5173, 8000, 27017

foreach ($port in $ports) {
    $lines = netstat -ano | Select-String -Pattern ":$port "
    foreach ($line in $lines) {
        $parts = ($line.ToString() -split "\s+") | Where-Object { $_ }
        $pid = $parts[-1]
        if ($pid -match "^\d+$") {
            Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "Stopped any process on ports 5173, 8000, and 27017."
