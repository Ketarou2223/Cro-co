# storage_smoke_dev.ps1
# dev Supabase の storage 疎通確認: profile-images バケットへ service_role で
# アップロード → 署名 URL で GET(200) → 削除（後始末）まで自動実行する。
#
# 使い方（service_role キーはチャット/ログに残さず環境変数で渡す）:
#   $env:DEV_SRK = '<dev service_role key>'
#   .\scripts\storage_smoke_dev.ps1
#
# 期待結果: upload=200 download=200 delete=200

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$base   = 'https://hpkpndjqtzycnytymdkk.supabase.co'   # dev project (hpkpndjqtzycnytymdkk)
$bucket = 'profile-images'
$path   = "_healthcheck/smoke_$([guid]::NewGuid().ToString('N')).png"

$srk = $env:DEV_SRK
if (-not $srk) { Write-Error 'DEV_SRK 環境変数が未設定です。$env:DEV_SRK に dev service_role キーを入れてから実行してください。'; exit 1 }
$auth = @{ Authorization = "Bearer $srk" }

# 1x1 透明 PNG
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
