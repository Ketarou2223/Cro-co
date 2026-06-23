# seed_test_users_dev_v2.ps1
# Create / cleanup / list E2E test users on the dev Supabase project (v2).
#
# 40-user matrix: MF / FM / MM / FF x 10 users each.
#   MF = gender=male,   interest_in=female
#   FM = gender=female, interest_in=male
#   MM = gender=male,   interest_in=male
#   FF = gender=female, interest_in=female
#   Emails: {combo}{n}@ecs.osaka-u.ac.jp  (e.g. mf1, fm10, mm5, ff7)
#   Names : {COMBO}-{n}({detail})         (e.g. MF-1(m2/b3))
#
# Per-combo state distribution (n = 1..10):
#   1..7  approved   8 pending_review   9 banned   10 deleted
#
# Match / block pattern (within approved 1..7; MF<->FM, MM<->MM, FF<->FF):
#   n | match | block
#   1 | 2     | 3
#   2 | 1     | -
#   3 | 4     | -
#   4 | 3     | 5
#   5 | 6,7   | -
#   6 | 5     | 7
#   7 | 5     | -
# Matches are created by direct INSERT into matches (not via detect_match trigger).
# Likes are also inserted both directions for referential completeness.
#
# Usage:
#   $env:SUPABASE_URL        = 'https://<project-ref>.supabase.co'
#   $env:SUPABASE_SECRET_KEY = '<dev service_role key>'
#   $env:DEV_TEST_PASSWORD   = 'keita2004'   # optional, defaults below
#   .\scripts\seed_test_users_dev_v2.ps1 --create
#   .\scripts\seed_test_users_dev_v2.ps1 --list
#   .\scripts\seed_test_users_dev_v2.ps1 --cleanup
#   $env:SUPABASE_URL = $null; $env:SUPABASE_SECRET_KEY = $null
#
# Expected --create output tail: RESULT: created=40 errors=0 (matches=N blocks=N)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$domain = '@ecs.osaka-u.ac.jp'

# v2 prefixes plus v1 leftovers that --cleanup / --list should sweep up.
$testEmailRegex = '^(e2etest_.+|(mf|fm|mm|ff)(10|[1-9]))@ecs\.osaka-u\.ac\.jp$'

# ------------------------------------------------------------------
# Arg / env validation
# ------------------------------------------------------------------
$mode = if ($args.Count -ge 1) { [string]$args[0] } else { '' }

function Show-Help {
  Write-Host ''
  Write-Host 'seed_test_users_dev_v2.ps1 - dev Supabase test user seeder (40-user matrix)'
  Write-Host ''
  Write-Host '  --create    Create 40 test users (MF/FM/MM/FF x10) + match/block wiring (idempotent)'
  Write-Host '  --list      List current v1+v2 test users (id / email / name / status / gender)'
  Write-Host '  --cleanup   Delete all v1+v2 test users (storage + auth.users; profiles/profile_images cascade)'
  Write-Host ''
  Write-Host 'Required env: SUPABASE_URL, SUPABASE_SECRET_KEY'
  Write-Host 'Optional env: DEV_TEST_PASSWORD (defaults to keita2004)'
  Write-Host ''
}

if ($mode -notin @('--create', '--cleanup', '--list')) {
  Show-Help
  exit 0
}

$base = $env:SUPABASE_URL
if (-not $base) {
  Write-Error 'SUPABASE_URL env var is not set. Set $env:SUPABASE_URL to the dev project URL before running.'
  exit 1
}
$base = $base.TrimEnd('/')

$srk = $env:SUPABASE_SECRET_KEY
if (-not $srk) {
  Write-Error 'SUPABASE_SECRET_KEY env var is not set. Set $env:SUPABASE_SECRET_KEY to the dev service_role key before running.'
  exit 1
}

$password = $env:DEV_TEST_PASSWORD
if (-not $password) {
  $password = 'keita2004'
  if ($mode -eq '--create') {
    Write-Warning "DEV_TEST_PASSWORD not set. Using default password '$password' for all test users."
  }
}

$srkHeaders = @{ Authorization = "Bearer $srk"; apikey = $srk }

# ------------------------------------------------------------------
# Minimal dependency-free PNG encoder (solid color, RGB truecolor).
# Avoids System.Drawing: builds PNG bytes at runtime with manual
# CRC32 + Adler32 + single stored (uncompressed) zlib block.
# ------------------------------------------------------------------
function Build-Crc32Table {
  $table = New-Object 'System.UInt32[]' 256
  for ($n = 0; $n -lt 256; $n++) {
    [long]$c = $n
    for ($k = 0; $k -lt 8; $k++) {
      if (($c -band 1) -ne 0) { $c = (0xEDB88320L) -bxor ($c -shr 1) }
      else                    { $c = $c -shr 1 }
      $c = $c -band 0xFFFFFFFFL
    }
    $table[$n] = [uint32]$c
  }
  return , $table
}

function Get-Crc32 {
  param([byte[]]$Data, [uint32[]]$Table)
  [long]$crc = 0xFFFFFFFFL
  foreach ($b in $Data) {
    $idx = [int]((($crc -bxor $b) -band 0xFF))
    $crc = (([long]$Table[$idx]) -bxor ($crc -shr 8)) -band 0xFFFFFFFFL
  }
  return [uint32]($crc -bxor 0xFFFFFFFFL)
}

function Get-Adler32 {
  param([byte[]]$Data)
  [long]$a = 1; [long]$b = 0; $mod = 65521
  foreach ($byte in $Data) { $a = ($a + $byte) % $mod; $b = ($b + $a) % $mod }
  return [uint32](((($b -shl 16) -bor $a)) -band 0xFFFFFFFFL)
}

function ConvertTo-Be4 {
  param([uint32]$Value)
  $bytes = [BitConverter]::GetBytes($Value)
  if ([BitConverter]::IsLittleEndian) { [Array]::Reverse($bytes) }
  return , $bytes
}

function New-PngChunk {
  param([string]$Type, [byte[]]$Data, [uint32[]]$CrcTable)
  $typeBytes = [Text.Encoding]::ASCII.GetBytes($Type)
  $crcInput  = New-Object System.Collections.Generic.List[byte]
  $crcInput.AddRange($typeBytes)
  if ($Data.Length -gt 0) { $crcInput.AddRange($Data) }
  $crc = Get-Crc32 -Data $crcInput.ToArray() -Table $CrcTable
  $chunk = New-Object System.Collections.Generic.List[byte]
  $chunk.AddRange((ConvertTo-Be4 ([uint32]$Data.Length)))
  $chunk.AddRange($typeBytes)
  if ($Data.Length -gt 0) { $chunk.AddRange($Data) }
  $chunk.AddRange((ConvertTo-Be4 $crc))
  return , $chunk.ToArray()
}

function New-SolidPng {
  param([int]$R, [int]$G, [int]$B, [int]$Size = 64, [uint32[]]$CrcTable)
  $ihdr = New-Object System.Collections.Generic.List[byte]
  $ihdr.AddRange((ConvertTo-Be4 ([uint32]$Size))); $ihdr.AddRange((ConvertTo-Be4 ([uint32]$Size)))
  $ihdr.AddRange([byte[]]@(8, 2, 0, 0, 0))
  $row = New-Object System.Collections.Generic.List[byte]
  $row.Add([byte]0)
  for ($i = 0; $i -lt $Size; $i++) { $row.Add([byte]$R); $row.Add([byte]$G); $row.Add([byte]$B) }
  $rowArr = $row.ToArray()
  $raw = New-Object System.Collections.Generic.List[byte]
  for ($y = 0; $y -lt $Size; $y++) { $raw.AddRange($rowArr) }
  $rawArr = $raw.ToArray()
  $zlib = New-Object System.Collections.Generic.List[byte]
  $zlib.Add([byte]0x78); $zlib.Add([byte]0x01); $zlib.Add([byte]0x01)
  $len  = $rawArr.Length
  $zlib.Add([byte]($len -band 0xFF)); $zlib.Add([byte](($len -shr 8) -band 0xFF))
  $nlen = (-bnot $len) -band 0xFFFF
  $zlib.Add([byte]($nlen -band 0xFF)); $zlib.Add([byte](($nlen -shr 8) -band 0xFF))
  $zlib.AddRange($rawArr)
  $zlib.AddRange((ConvertTo-Be4 (Get-Adler32 -Data $rawArr)))
  $out = New-Object System.Collections.Generic.List[byte]
  $out.AddRange([byte[]]@(137, 80, 78, 71, 13, 10, 26, 10))
  $out.AddRange((New-PngChunk -Type 'IHDR' -Data $ihdr.ToArray() -CrcTable $CrcTable))
  $out.AddRange((New-PngChunk -Type 'IDAT' -Data $zlib.ToArray()  -CrcTable $CrcTable))
  $out.AddRange((New-PngChunk -Type 'IEND' -Data (New-Object byte[] 0) -CrcTable $CrcTable))
  return , $out.ToArray()
}

# ------------------------------------------------------------------
# HTTP helpers
# ------------------------------------------------------------------
# Extract response body from 4xx/5xx (PS 5.1 / 7 compatible).
function Get-HttpErrorBody {
  param($ErrorRecord)
  if ($ErrorRecord.ErrorDetails -and $ErrorRecord.ErrorDetails.Message) {
    return [string]$ErrorRecord.ErrorDetails.Message
  }
  $resp = $ErrorRecord.Exception.PSObject.Properties['Response']
  if ($resp -and $resp.Value) {
    try {
      $stream = $resp.Value.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $body   = $reader.ReadToEnd(); $reader.Close()
      return [string]$body
    } catch {}
  }
  return ''
}

# PS 5.1 mangles non-ASCII string bodies; send as explicit UTF-8 byte array.
function Invoke-SupabaseJson {
  param([string]$Method, [string]$Uri, [string]$Json, [hashtable]$ExtraHeaders)
  $h = $srkHeaders.Clone()
  if ($ExtraHeaders) { foreach ($k in $ExtraHeaders.Keys) { $h[$k] = $ExtraHeaders[$k] } }
  $bytes = [Text.Encoding]::UTF8.GetBytes($Json)
  return Invoke-RestMethod -Method $Method -Uri $Uri `
    -Headers $h -ContentType 'application/json; charset=utf-8' -Body $bytes
}

# ------------------------------------------------------------------
# Supabase API wrappers
# ------------------------------------------------------------------
function Invoke-AdminCreate {
  param([string]$Email, [string]$Password)
  $body = @{ email = $Email; password = $Password; email_confirm = $true } | ConvertTo-Json -Compress
  return Invoke-SupabaseJson -Method Post -Uri "$base/auth/v1/admin/users" -Json $body
}

function Get-ProfileIdByEmail {
  param([string]$Email)
  $uri = "$base/rest/v1/profiles?select=id&email=eq.$([uri]::EscapeDataString($Email))"
  $res = Invoke-RestMethod -Method Get -Uri $uri -Headers $srkHeaders
  if ($res -and $res.Count -ge 1) { return $res[0].id }
  return $null
}

function Update-Profile {
  param([string]$Id, [string]$JsonBody)
  Invoke-SupabaseJson -Method Patch -Uri "$base/rest/v1/profiles?id=eq.$Id" `
    -Json $JsonBody -ExtraHeaders @{ Prefer = 'return=minimal' } | Out-Null
}

function Get-ProfileImageCount {
  param([string]$UserId)
  $uri = "$base/rest/v1/profile_images?select=id&user_id=eq.$UserId"
  try { return @(Invoke-RestMethod -Method Get -Uri $uri -Headers $srkHeaders).Count }
  catch { return 0 }
}

function Upload-StorageObject {
  param([string]$Bucket, [string]$Path, [byte[]]$Bytes)
  Invoke-WebRequest -Method Post -Uri "$base/storage/v1/object/$Bucket/$Path" `
    -Headers $srkHeaders -ContentType 'image/png' -Body $Bytes -UseBasicParsing | Out-Null
}

function Add-ProfileImage {
  param([string]$UserId, [string]$Path, [int]$Order, [string]$Status = 'approved')
  $body = @{ user_id = $UserId; image_path = $Path; display_order = $Order; status = $Status } | ConvertTo-Json -Compress
  Invoke-SupabaseJson -Method Post -Uri "$base/rest/v1/profile_images" `
    -Json $body -ExtraHeaders @{ Prefer = 'return=minimal' } | Out-Null
}

function Add-Like {
  param([string]$LikerId, [string]$LikedId)
  $body = @{ liker_id = $LikerId; liked_id = $LikedId } | ConvertTo-Json -Compress
  Invoke-SupabaseJson -Method Post -Uri "$base/rest/v1/likes" `
    -Json $body -ExtraHeaders @{ Prefer = 'resolution=merge-duplicates,return=minimal' } | Out-Null
}

function Add-Match {
  param([string]$Id1, [string]$Id2)
  # matches CHECK requires user_a_id < user_b_id
  if ([string]::CompareOrdinal($Id1, $Id2) -lt 0) { $a = $Id1; $b = $Id2 } else { $a = $Id2; $b = $Id1 }
  $body = @{ user_a_id = $a; user_b_id = $b } | ConvertTo-Json -Compress
  Invoke-SupabaseJson -Method Post -Uri "$base/rest/v1/matches" `
    -Json $body -ExtraHeaders @{ Prefer = 'resolution=merge-duplicates,return=minimal' } | Out-Null
}

function Add-Block {
  param([string]$BlockerId, [string]$BlockedId)
  $body = @{ blocker_id = $BlockerId; blocked_id = $BlockedId } | ConvertTo-Json -Compress
  Invoke-SupabaseJson -Method Post -Uri "$base/rest/v1/blocks" `
    -Json $body -ExtraHeaders @{ Prefer = 'resolution=merge-duplicates,return=minimal' } | Out-Null
}

function Get-StorageObjectNames {
  param([string]$Bucket, [string]$Prefix)
  $body = @{ prefix = $Prefix; limit = 100; offset = 0 } | ConvertTo-Json -Compress
  try {
    $res = Invoke-SupabaseJson -Method Post -Uri "$base/storage/v1/object/list/$Bucket" -Json $body
    return @($res | Where-Object { $_.name -and $_.name -ne '.emptyFolderPlaceholder' } | ForEach-Object { $_.name })
  } catch { return @() }
}

function Remove-StorageObjects {
  param([string]$Bucket, [string[]]$Paths)
  if (-not $Paths -or $Paths.Count -eq 0) { return }
  $parts = @($Paths) | ForEach-Object { $_ | ConvertTo-Json -Compress }
  $body  = '{"prefixes":[' + ($parts -join ',') + ']}'
  try { Invoke-SupabaseJson -Method Delete -Uri "$base/storage/v1/object/$Bucket" -Json $body | Out-Null } catch {}
}

function Remove-AuthUser {
  param([string]$Id)
  # Cascades to profiles, profile_images, likes, matches, blocks
  Invoke-RestMethod -Method Delete -Uri "$base/auth/v1/admin/users/$Id" -Headers $srkHeaders | Out-Null
}

function Get-TestProfiles {
  $or  = 'or=(email.like.e2etest_*,email.like.mf*,email.like.fm*,email.like.mm*,email.like.ff*)'
  $uri = "$base/rest/v1/profiles?select=id,email,name,status,gender&$or&order=email.asc"
  $res = Invoke-RestMethod -Method Get -Uri $uri -Headers $srkHeaders
  return @($res | Where-Object { $_.email -match $testEmailRegex })
}

# ------------------------------------------------------------------
# Palette (matches ColorfulCard CARD_COLORS) -> RGB
# ------------------------------------------------------------------
$palette = @{
  yellow = @(255, 233, 77)   # #FFE94D
  pink   = @(255, 125, 168)  # #FF7DA8
  orange = @(255, 122, 61)   # #FF7A3D
  blue   = @(107, 181, 255)  # #6BB5FF
  mint   = @(138, 232, 181)  # #8AE8B5
  purple = @(201, 168, 255)  # #C9A8FF
}
$paletteNames = @('yellow', 'pink', 'orange', 'blue', 'mint', 'purple')

# ------------------------------------------------------------------
# Matrix configuration
# ------------------------------------------------------------------
$comboOrder = @('MF', 'FM', 'MM', 'FF')
$comboCfg   = @{
  MF = @{ gender = 'male';   interest = 'female'; partner = 'FM' }
  FM = @{ gender = 'female'; interest = 'male';   partner = 'MF' }
  MM = @{ gender = 'male';   interest = 'male';   partner = 'MM' }
  FF = @{ gender = 'female'; interest = 'female'; partner = 'FF' }
}

# Detail label in the name: {COMBO}-{n}({detail})
$detailByNo = @{
  1 = 'm2/b3'; 2 = 'm1';      3 = 'm4';      4 = 'm3/b5'; 5 = 'm6,7'
  6 = 'm5/b7'; 7 = 'm5';      8 = 'pending'; 9 = 'banned'; 10 = 'deleted'
}

$statusByNo = @{
  1 = 'approved'; 2 = 'approved'; 3 = 'approved'; 4 = 'approved'; 5 = 'approved'
  6 = 'approved'; 7 = 'approved'; 8 = 'pending_review'; 9 = 'banned'; 10 = 'deleted'
}

# Photo plan: count + profile_images.status
$photoPlanByNo = @{
  1  = @{ count = 3; status = 'approved' }
  2  = @{ count = 3; status = 'approved' }
  3  = @{ count = 1; status = 'approved' }
  4  = @{ count = 1; status = 'approved' }
  5  = @{ count = 2; status = 'approved' }
  6  = @{ count = 1; status = 'approved' }
  7  = @{ count = 1; status = 'approved' }
  8  = @{ count = 1; status = 'pending'  }  # pending only -> profile_image_path stays null
  9  = @{ count = 1; status = 'approved' }
  10 = @{ count = 0; status = 'approved' }   # deleted -> no photos
}

# Match / block targets (partner-system No.)
$matchByNo = @{ 1=@(2); 2=@(1); 3=@(4); 4=@(3); 5=@(6,7); 6=@(5); 7=@(5) }
$blockByNo = @{ 1=@(3);         4=@(5);          6=@(7)                    }

# Faculty / department (fixed 1:1 mapping)
$faculties = @('人間科学部','経済学部','法学部','工学部','医学部','理学部','文学部','基礎工学部','外国語学部')
$deptByFaculty = @{
  '人間科学部' = '人間科学科'; '経済学部' = '経済学科';   '法学部'   = '法学科'
  '工学部'     = '電子情報工学科'; '医学部' = '医学科';   '理学部'   = '物理学科'
  '文学部'     = '人文学科';   '基礎工学部' = '電子物理科学科'; '外国語学部' = '英語専攻'
}

# year 1–11 with graduate students at No.5 (M2=8) and No.7 (M1=7)
$yearByNo = @{1=1; 2=2; 3=3; 4=4; 5=8; 6=2; 7=7; 8=2; 9=3; 10=1}

# age aligned with year (graduates are older)
$ageByNo  = @{1=19; 2=20; 3=21; 4=22; 5=24; 6=20; 7=23; 8=20; 9=21; 10=22}

# bio for No.1-7 (1-2 sentences each)
$bioByNo = @{
  1 = '趣味はゲームと料理です。ゆっくり話せる人と知り合いたいです。'
  2 = 'カフェ巡りが好きです。新しいお店を見つけると嬉しい。'
  3 = '映画と読書が好きです。最近はカメラにもはまっています。'
  4 = '週末はよくサイクリングをしています。外で過ごすのが好きです。'
  5 = '修士2年です。研究の合間に音楽を聴くのがリフレッシュになってます。'
  6 = '理系の学生です。週末はだいたいカフェで作業してる。映画と散歩が好きなので、気軽に話しかけてください。'
  7 = '修士1年です。音楽と写真が趣味。同じ大学の人と気軽に話せたら嬉しいです。'
}

function Get-BirthDateForNo {
  param([int]$No)
  $yob   = 2026 - $ageByNo[$No]
  $month = (($No * 2) % 12) + 1
  $day   = (($No * 3) % 28) + 1
  return ('{0:d4}-{1:d2}-{2:d2}' -f $yob, $month, $day)
}

# ------------------------------------------------------------------
# Build profile field set for one user.
# Returns @{ fields = [ordered]; name = '...' }
# ------------------------------------------------------------------
function Build-UserFields {
  param([string]$Combo, [int]$No)
  $cfg     = $comboCfg[$Combo]
  $status  = $statusByNo[$No]
  $name    = "$Combo-$No($($detailByNo[$No]))"
  $now     = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  $faculty = $faculties[($No - 1) % $faculties.Count]
  $dept    = $deptByFaculty[$faculty]
  $bio     = if ($bioByNo.ContainsKey($No)) { $bioByNo[$No] } else { $null }

  $fields = [ordered]@{
    name        = $name
    gender      = $cfg.gender
    interest_in = $cfg.interest
    year        = $yearByNo[$No]
    faculty     = $faculty
    department  = $dept
    bio         = $bio
    birth_date  = (Get-BirthDateForNo -No $No)
    age         = $ageByNo[$No]
    status      = $status
  }

  switch ($status) {
    'approved' {
      $fields['identity_verified']       = $true
      $fields['profile_setup_completed'] = $true
      $fields['student_id_submitted']    = $true
      $fields['onboarding_completed']    = $true
      $fields['profile_completed']       = $true
      $fields['submitted_at']            = $now
      $fields['reviewed_at']             = $now
    }
    'pending_review' {
      $fields['identity_verified']       = $false
      $fields['profile_setup_completed'] = $true
      $fields['student_id_submitted']    = $true
      $fields['onboarding_completed']    = $true
      $fields['profile_completed']       = $false
      $fields['submitted_at']            = $now
      # reviewed_at stays null (not yet reviewed)
    }
    'banned' {
      # "他フラグは approved 相当"
      $fields['identity_verified']       = $true
      $fields['profile_setup_completed'] = $true
      $fields['student_id_submitted']    = $true
      $fields['onboarding_completed']    = $true
      $fields['profile_completed']       = $true
      $fields['submitted_at']            = $now
      $fields['reviewed_at']             = $now
      $fields['banned_at']               = $now
      $fields['ban_reason']              = 'テストBAN'
    }
    'deleted' {
      $fields['identity_verified']       = $false
      $fields['profile_setup_completed'] = $true
      $fields['student_id_submitted']    = $true
      $fields['onboarding_completed']    = $true
      $fields['deleted_at']              = $now
      # PII clear: faculty/department/bio/birth_date/age -> null; name is kept for anonymization tests
      $fields['faculty']                 = $null
      $fields['department']              = $null
      $fields['bio']                     = $null
      $fields['birth_date']              = $null
      $fields['age']                     = $null
      $fields['profile_image_path']      = $null
    }
  }

  return @{ fields = $fields; name = $name }
}

# ==================================================================
# --create
# ==================================================================
function Invoke-Create {
  $crcTable = Build-Crc32Table
  $created  = 0
  $errors   = 0
  $idByKey  = @{}

  # --- Phase 1: users + profiles + photos ---
  foreach ($combo in $comboOrder) {
    for ($no = 1; $no -le 10; $no++) {
      $email = "$($combo.ToLower())$no$domain"
      $key   = "$combo-$no"
      try {
        $id = $null
        try {
          $res = Invoke-AdminCreate -Email $email -Password $password
          $id  = $res.id
          Write-Host "[OK] $key ($email) created (id=$id)"
        } catch {
          $id = Get-ProfileIdByEmail -Email $email
          if ($id) {
            Write-Host "[SKIP] $key already exists (id=$id) - re-applying profile"
          } else { throw }
        }
        $idByKey[$key] = $id

        $built    = Build-UserFields -Combo $combo -No $no
        $jsonBody = ($built.fields | ConvertTo-Json -Depth 3 -Compress)
        Update-Profile -Id $id -JsonBody $jsonBody

        # Photos: skip when already uploaded (idempotent re-runs).
        $plan = $photoPlanByNo[$no]
        if ($plan.count -gt 0) {
          $existing = Get-ProfileImageCount -UserId $id
          if ($existing -gt 0) {
            Write-Host "       photos exist ($existing) - skipping upload"
          } else {
            $ts       = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
            $comboIdx = $comboOrder.IndexOf($combo)
            $mainPath = $null
            for ($p = 0; $p -lt $plan.count; $p++) {
              $colorName = $paletteNames[(($comboIdx * 7) + ($no * 3) + $p) % $paletteNames.Count]
              $rgb  = $palette[$colorName]
              $png  = New-SolidPng -R $rgb[0] -G $rgb[1] -B $rgb[2] -Size 64 -CrcTable $crcTable
              $rand = [guid]::NewGuid().ToString('N').Substring(0, 4)
              $path = "$id/photo_${ts}_$rand.png"
              Upload-StorageObject -Bucket 'profile-images' -Path $path -Bytes $png
              Add-ProfileImage -UserId $id -Path $path -Order $p -Status $plan.status
              if ($p -eq 0) { $mainPath = $path }
            }
            # profile_image_path only when photos are approved (pending photo must not be shown publicly)
            if ($plan.status -eq 'approved' -and $mainPath) {
              Update-Profile -Id $id -JsonBody (@{ profile_image_path = $mainPath } | ConvertTo-Json -Compress)
            }
            Write-Host "       +$($plan.count) photo(s) [$($plan.status)]"
          }
        }

        $created++
      } catch {
        $errors++
        Write-Host "[ERR] $key ($email): $($_.Exception.Message) $(Get-HttpErrorBody $_)"
      }
    }
  }

  # --- Phase 2: match / block wiring (approved 1..7 only) ---
  $matchCount  = 0
  $blockCount  = 0
  $doneMatches = New-Object System.Collections.Generic.HashSet[string]
  $doneLikes   = New-Object System.Collections.Generic.HashSet[string]
  $doneBlocks  = New-Object System.Collections.Generic.HashSet[string]

  foreach ($combo in $comboOrder) {
    $partner = $comboCfg[$combo].partner
    for ($no = 1; $no -le 7; $no++) {
      $meId = $idByKey["$combo-$no"]
      if (-not $meId) { continue }

      foreach ($t in $matchByNo[$no]) {
        $targetId = $idByKey["$partner-$t"]
        if (-not $targetId) { continue }
        try {
          # Insert likes both directions for referential completeness.
          $lk1 = "$meId|$targetId"; $lk2 = "$targetId|$meId"
          if ($doneLikes.Add($lk1)) { Add-Like -LikerId $meId     -LikedId $targetId }
          if ($doneLikes.Add($lk2)) { Add-Like -LikerId $targetId -LikedId $meId     }

          # Direct INSERT into matches (not relying on detect_match trigger).
          if ([string]::CompareOrdinal($meId, $targetId) -lt 0) { $mk = "$meId|$targetId" } else { $mk = "$targetId|$meId" }
          if ($doneMatches.Add($mk)) {
            Add-Match -Id1 $meId -Id2 $targetId
            $matchCount++
            Write-Host "[MATCH] $combo-$no <-> $partner-$t"
          }
        } catch {
          $errors++
          Write-Host "[ERR] match $combo-$no <-> $partner-$t : $($_.Exception.Message) $(Get-HttpErrorBody $_)"
        }
      }

      if ($blockByNo.ContainsKey($no)) {
        foreach ($b in $blockByNo[$no]) {
          $targetId = $idByKey["$partner-$b"]
          if (-not $targetId) { continue }
          try {
            $bk = "$meId|$targetId"
            if ($doneBlocks.Add($bk)) {
              Add-Block -BlockerId $meId -BlockedId $targetId
              $blockCount++
              Write-Host "[BLOCK] $combo-$no -> $partner-$b"
            }
          } catch {
            $errors++
            Write-Host "[ERR] block $combo-$no -> $partner-$b : $($_.Exception.Message) $(Get-HttpErrorBody $_)"
          }
        }
      }
    }
  }

  Write-Host ''
  Write-Host "RESULT: created=$created errors=$errors (matches=$matchCount blocks=$blockCount)"
}

# ==================================================================
# --cleanup
# ==================================================================
function Invoke-Cleanup {
  $profiles = Get-TestProfiles
  if ($profiles.Count -eq 0) {
    Write-Host 'No v1/v2 test users found.'
    Write-Host ''
    Write-Host 'RESULT: deleted=0 errors=0'
    return
  }

  $deleted = 0
  $errors  = 0
  foreach ($p in $profiles) {
    try {
      $id = $p.id
      foreach ($bucket in @('profile-images', 'student-ids')) {
        $names = Get-StorageObjectNames -Bucket $bucket -Prefix "$id/"
        if ($names.Count -gt 0) {
          $paths = $names | ForEach-Object { "$id/$_" }
          Remove-StorageObjects -Bucket $bucket -Paths $paths
        }
      }
      Remove-AuthUser -Id $id   # cascades profiles, profile_images, likes, matches, blocks
      Write-Host "[OK] deleted $($p.email) (id=$id)"
      $deleted++
    } catch {
      $errors++
      Write-Host "[ERR] $($p.email): $($_.Exception.Message) $(Get-HttpErrorBody $_)"
    }
  }

  Write-Host ''
  Write-Host "RESULT: deleted=$deleted errors=$errors"

  $remaining = Get-TestProfiles
  Write-Host "POST-CLEANUP残存: $($remaining.Count) 件 (期待値 0)"
  foreach ($r in $remaining) {
    Write-Host "  ! 残存: $($r.email) (id=$($r.id) status=$($r.status))"
  }
}

# ==================================================================
# --list
# ==================================================================
function Invoke-List {
  $profiles = Get-TestProfiles
  if ($profiles.Count -eq 0) {
    Write-Host 'No v1/v2 test users found.'
    return
  }
  Write-Host ("{0,-26} {1,-18} {2,-15} {3,-8} {4}" -f 'email', 'name', 'status', 'gender', 'id')
  Write-Host ('-' * 104)
  foreach ($p in $profiles) {
    Write-Host ("{0,-26} {1,-18} {2,-15} {3,-8} {4}" -f $p.email, $p.name, $p.status, $p.gender, $p.id)
  }
  Write-Host ''
  Write-Host "RESULT: listed=$($profiles.Count)"
}

# ------------------------------------------------------------------
# Dispatch
# ------------------------------------------------------------------
switch ($mode) {
  '--create'  { Invoke-Create }
  '--cleanup' { Invoke-Cleanup }
  '--list'    { Invoke-List }
}
