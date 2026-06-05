# storage_smoke_dev.ps1
# Storage connectivity check for dev Supabase: upload a file to the
# profile-images bucket with service_role -> GET via signed URL (200) ->
# delete (cleanup). Runs end to end automatically.
#
# Usage (pass the service_role key via env var so it never lands in chat/logs):
#   $env:DEV_SRK = '<dev service_role key>'
#   .\scripts\storage_smoke_dev.ps1
#
# Expected result: upload=200 download=200 delete=200

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$base   = 'https://hpkpndjqtzycnytymdkk.supabase.co'   # dev project (hpkpndjqtzycnytymdkk)
$bucket = 'profile-images'
$path   = "_healthcheck/smoke_$([guid]::NewGuid().ToString('N')).png"

$srk = $env:DEV_SRK
if (-not $srk) { Write-Error 'DEV_SRK env var is not set. Set $env:DEV_SRK to the dev service_role key before running.'; exit 1 }
$auth = @{ Authorization = "Bearer $srk" }

# 1x1 transparent PNG
$pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC'
$bytes  = [Convert]::FromBase64String($pngB64)

Write-Host "== 1) Upload  ($bucket/$path) =="
$up = Invoke-WebRequest -Method Post -Uri "$base/storage/v1/object/$bucket/$path" -Headers $auth -ContentType 'image/png' -Body $bytes -UseBasicParsing
Write-Host "  upload status: $($up.StatusCode)"

Write-Host "== 2) Sign URL =="
$signBody  = @{ expiresIn = 60 } | ConvertTo-Json
$sign      = Invoke-RestMethod -Method Post -Uri "$base/storage/v1/object/sign/$bucket/$path" -Headers $auth -ContentType 'application/json' -Body $signBody
$signedUrl = if ($sign.signedURL -match '^https?://') { $sign.signedURL } else { "$base/storage/v1$($sign.signedURL)" }
Write-Host "  signed URL acquired"

Write-Host "== 3) GET via signed URL =="
$get = Invoke-WebRequest -Method Get -Uri $signedUrl -UseBasicParsing
Write-Host "  download status: $($get.StatusCode)  bytes: $($get.RawContentLength)"

Write-Host "== 4) Delete (cleanup) =="
$del = Invoke-WebRequest -Method Delete -Uri "$base/storage/v1/object/$bucket/$path" -Headers $auth -UseBasicParsing
Write-Host "  delete status: $($del.StatusCode)"

Write-Host ""
Write-Host "RESULT: upload=$($up.StatusCode) download=$($get.StatusCode) delete=$($del.StatusCode)"