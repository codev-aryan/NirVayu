try {
    $r = Invoke-WebRequest -Uri 'https://nirvayu.vercel.app/api/wards' -UseBasicParsing
    Write-Host "Status:" $r.StatusCode
    Write-Host ($r.Content.Substring(0, [Math]::Min(500, $r.Content.Length)))
} catch {
    Write-Host "Error:" $_.Exception.Message
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Body:" $reader.ReadToEnd()
    }
}
