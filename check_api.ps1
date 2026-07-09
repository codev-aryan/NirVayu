$base = "https://nirvayu.vercel.app"
$eps = @("/api/wards", "/api/predictions", "/api/alerts")

foreach ($ep in $eps) {
    try {
        $resp = Invoke-WebRequest -Uri "$base$ep" -UseBasicParsing -TimeoutSec 30
        Write-Host "OK $ep -> $($resp.StatusCode) len=$($resp.Content.Length)"
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-Host "FAIL $ep -> Status=$status Error=$($_.Exception.Message)"
    }
}

# Test login
try {
    $loginBody = @{username="admin"; password="password123"} | ConvertTo-Json
    $resp = Invoke-WebRequest -Uri "$base/api/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
    Write-Host "OK /api/login -> $($resp.StatusCode)"
    $user = $resp.Content | ConvertFrom-Json
    Write-Host "  User: $($user.username) role=$($user.role)"
} catch {
    Write-Host "FAIL /api/login -> $($_.Exception.Message)"
}
