$defenderIP = "10.197.159.27"
$attackerIP  = "10.197.159.99"   # simulated secondary device

Write-Host "Starting Brute Force simulation against ACDS at $defenderIP ..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

for ($i = 1; $i -le 15; $i++) {
    $body = '{"events":[{"src_ip":"' + $attackerIP + '","endpoint":"/api/login","status_code":401,"layer":"application","method":"POST"}]}'
    try {
        $r = Invoke-RestMethod -Uri "http://${defenderIP}:8000/ingest" -Method Post -ContentType "application/json" -Body $body
        Write-Host "Attempt ${i}: SUCCESS" -ForegroundColor Green
    } catch {
        Write-Host "Attempt ${i}: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 300
}

Write-Host "Done. Check your ACDS dashboard for BruteForce alerts!" -ForegroundColor Yellow
