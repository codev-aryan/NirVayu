$resp = Invoke-WebRequest -Uri 'https://nirvayu.vercel.app/api/wards' -UseBasicParsing -TimeoutSec 30
$data = $resp.Content | ConvertFrom-Json
Write-Host "Total wards: $($data.wards.Count)"
Write-Host ""
$data.wards | Sort-Object aqi -Descending | Select-Object name, aqi, pm25, pm10, no2, dominant_source | Format-Table -AutoSize
Write-Host ""
$avgAqi = ($data.wards | Measure-Object aqi -Average).Average
Write-Host "Average AQI: $([Math]::Round($avgAqi))"
$maxAqi = ($data.wards | Measure-Object aqi -Maximum).Maximum
Write-Host "Max AQI: $maxAqi"
$minAqi = ($data.wards | Measure-Object aqi -Minimum).Minimum
Write-Host "Min AQI: $minAqi"
