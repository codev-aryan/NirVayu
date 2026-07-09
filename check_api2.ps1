$base = "https://nirvayu.vercel.app"

# Test /api/user (should return 401 without session)
try {
    $r = Invoke-WebRequest -Uri "$base/api/user" -UseBasicParsing -TimeoutSec 30
    Write-Host "/api/user -> Status $($r.StatusCode)"
} catch {
    $s = $_.Exception.Response.StatusCode.value__
    Write-Host "/api/user -> Status $s (expected 401 when not logged in)"
}

# Test /api/predictions  
try {
    $r = Invoke-WebRequest -Uri "$base/api/predictions" -UseBasicParsing -TimeoutSec 30
    Write-Host "/api/predictions -> Status $($r.StatusCode) len=$($r.Content.Length)"
} catch {
    $s = $_.Exception.Response.StatusCode.value__
    Write-Host "/api/predictions -> Status $s"
}

# Test /api/alerts  
try {
    $r = Invoke-WebRequest -Uri "$base/api/alerts" -UseBasicParsing -TimeoutSec 30
    Write-Host "/api/alerts -> Status $($r.StatusCode)"
} catch {
    $s = $_.Exception.Response.StatusCode.value__
    Write-Host "/api/alerts -> Status $s"
}

Write-Host "Done"
