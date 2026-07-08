$body = ConvertTo-Json @{username='admin'; password='password123'}
try {
    $r = Invoke-WebRequest -Uri 'https://nirvayu.vercel.app/api/login' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing
    Write-Host "Status: $($r.StatusCode)"
    Write-Host "Body: $($r.Content)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "HTTP Error: $statusCode"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body: $($reader.ReadToEnd())"
}
