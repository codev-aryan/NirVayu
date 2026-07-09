try {
    # Test /api/wards
    $r = Invoke-WebRequest -Uri 'https://nirvayu.vercel.app/api/wards' -UseBasicParsing
    Write-Host "GET /api/wards -> Status:" $r.StatusCode
    Write-Host "Body preview:" $r.Content.Substring(0, [Math]::Min(300, $r.Content.Length))
} catch {
    Write-Host "GET /api/wards -> Error:" $_.Exception.Message
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Body:" $reader.ReadToEnd()
    }
}

Write-Host "---"

try {
    # Test hitting /api/index directly (the function file)
    $r2 = Invoke-WebRequest -Uri 'https://nirvayu.vercel.app/api/index' -UseBasicParsing
    Write-Host "GET /api/index -> Status:" $r2.StatusCode
    Write-Host "Body:" $r2.Content.Substring(0, [Math]::Min(200, $r2.Content.Length))
} catch {
    Write-Host "GET /api/index -> Error:" $_.Exception.Message
    $stream2 = $_.Exception.Response.GetResponseStream()
    if ($stream2) {
        $reader2 = New-Object System.IO.StreamReader($stream2)
        Write-Host "Body:" $reader2.ReadToEnd()
    }
}
