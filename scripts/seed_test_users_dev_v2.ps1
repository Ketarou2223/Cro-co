# seed_test_users_dev_v2.ps1
# Create / cleanup / list E2E test users on the dev Supabase project (v2).
#
# v2 replaces the v1 roster (e2etest_* / fm1 / fm2) with a 40-user matrix:
#   4 combinations x 10 users each.
#     MF = gender=male,   interest_in=female
#     FM = gender=female, interest_in=male
#     MM = gender=male,   interest_in=male
#     FF = gender=female, interest_in=female
#   Emails: {combo}{n}@ecs.osaka-u.ac.jp  (e.g. mf1, fm10, mm5, ff7)
#   Names : {COMBO}-{n}({detail})         (e.g. MF-1(m2/b3))
#
# Per-combo state distribution (n = 1..10):
#   1..7  approved   8 pending_review   9 banned   10 deleted
#
# Match / block pattern (within the 7 approved users of the matching system;
# MF<->FM, FM<->MF, MM<->MM, FF<->FF). The number references the No. in the
# partner system:
#   n | match | block
#   1 | 2     | 3
#   2 | 1     | -
#   3 | 4     | -
#   4 | 3     | 5
#   5 | 6,7   | -
#   6 | 5     | 7
#   7 | 5     | -
# Match and block targets never collide (no user both matches and blocks the
# same person), so direct block inserts do not disturb matches.
#
# Matches are created by the detect_match trigger (008_matches.sql), NOT inserted
# directly. Inserting both like directions makes the SECOND like fire the trigger,
# which upserts the normalized matches row (ON CONFLICT (user_a_id,user_b_id) DO
# NOTHING). A direct matches INSERT collided with that trigger-created row on the
# UNIQUE (user_a_id,user_b_id) constraint and returned 409, so it was removed.
# After the two likes, we SELECT-verify the matches pair exists and log an error
# if the trigger did not create it.
#
# Usage (pass the service_role key via env var so it never lands in chat/logs):
#   $env:DEV_SRK = '<dev service_role key>'
#   $env:DEV_PRIVACY_HASH_SALT = '<dev Render PRIVACY_HASH_SALT value>'   # required for --create (No.5-7 hash)
#   $env:DEV_TEST_PASSWORD = 'keita2004'   # optional, defaults below
#   .\scripts\seed_test_users_dev_v2.ps1 --create     # create the 40 test users + wiring
#   .\scripts\seed_test_users_dev_v2.ps1 --list        # list current v1+v2 test users
#   .\scripts\seed_test_users_dev_v2.ps1 --cleanup     # delete all v1+v2 test users
#   $env:DEV_SRK = $null
#   $env:DEV_PRIVACY_HASH_SALT = $null
#   $env:DEV_TEST_PASSWORD = $null
#
# PII layout for approved users (case-1 of the 2-state split, mirrors prod):
#   No.1-4 (post-review state)    : real_name/student_number plain,  hash NULL, privacy_purged_at NULL
#   No.5-7 (post-purge-batch state): real_name/student_number  NULL, hash set,  privacy_purged_at = 4 days ago
# pending_review (No.8) and banned (No.9) carry plain PII (banned is NOT eligible for the
# privacy_purge batch per backend/app/core/privacy_purge.py:124-156). deleted (No.10) keeps
# the existing all-NULL body unchanged; migration 042 adds 'deleted' to profiles_status_check
# so the PATCH now lands instead of 400-ing.
#
# Expected --create output tail: RESULT: created=40 errors=0 (matches=N blocks=N)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$base   = 'https://hpkpndjqtzycnytymdkk.supabase.co'   # dev project (hpkpndjqtzycnytymdkk) - dev only, never prod
$domain = '@ecs.osaka-u.ac.jp'

# v2 prefixes plus v1 leftovers that --cleanup / --list should sweep up.
# Strict regex (anchored) prevents deleting any real account that happens to
# start with these letters.
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
  Write-Host 'Required env: DEV_SRK (dev service_role key)'
  Write-Host 'Optional env: DEV_TEST_PASSWORD (defaults to keita2004)'
  Write-Host ''
}

if ($mode -notin @('--create', '--cleanup', '--list')) {
  Show-Help
  exit 0
}

$srk = $env:DEV_SRK
if (-not $srk) {
  Write-Error 'DEV_SRK env var is not set. Set $env:DEV_SRK to the dev service_role key before running.'
  exit 1
}

$password = $env:DEV_TEST_PASSWORD
if (-not $password) {
  $password = 'keita2004'
  if ($mode -eq '--create') {
    Write-Warning "DEV_TEST_PASSWORD not set. Using default password '$password' for all test users. Record it."
  }
}

# service_role: apikey and Bearer are the same key. Content-Type is passed per call.
$srkHeaders = @{ Authorization = "Bearer $srk"; apikey = $srk }

# ------------------------------------------------------------------
# Minimal dependency-free PNG encoder (solid color, RGB truecolor).
# Avoids System.Drawing and avoids hand-computed Base64: we build the
# PNG bytes at runtime with a manual CRC32 + Adler32 + a single stored
# (uncompressed) zlib block. Raw scanline size stays < 65535 for the
# chosen image size so one stored block is valid DEFLATE.
# ------------------------------------------------------------------
function Build-Crc32Table {
  $table = New-Object 'System.UInt32[]' 256
  for ($n = 0; $n -lt 256; $n++) {
    [long]$c = $n
    for ($k = 0; $k -lt 8; $k++) {
      if (($c -band 1) -ne 0) {
        $c = (0xEDB88320L) -bxor ($c -shr 1)
      } else {
        $c = $c -shr 1
      }
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
  [long]$a = 1
  [long]$b = 0
  $mod = 65521
  foreach ($byte in $Data) {
    $a = ($a + $byte) % $mod
    $b = ($b + $a) % $mod
  }
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
  $crcInput = New-Object System.Collections.Generic.List[byte]
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

  # IHDR: width, height, bit depth 8, color type 2 (RGB), no compression/filter/interlace
  $ihdr = New-Object System.Collections.Generic.List[byte]
  $ihdr.AddRange((ConvertTo-Be4 ([uint32]$Size)))
  $ihdr.AddRange((ConvertTo-Be4 ([uint32]$Size)))
  $ihdr.AddRange([byte[]]@(8, 2, 0, 0, 0))

  # Raw image data: each row = filter byte 0 + (R,G,B) * Size
  $row = New-Object System.Collections.Generic.List[byte]
  $row.Add([byte]0)
  for ($i = 0; $i -lt $Size; $i++) {
    $row.Add([byte]$R); $row.Add([byte]$G); $row.Add([byte]$B)
  }
  $rowArr = $row.ToArray()
  $raw = New-Object System.Collections.Generic.List[byte]
  for ($y = 0; $y -lt $Size; $y++) { $raw.AddRange($rowArr) }
  $rawArr = $raw.ToArray()

  # zlib stream: header + single stored DEFLATE block + Adler32 (big-endian)
  $zlib = New-Object System.Collections.Generic.List[byte]
  $zlib.Add([byte]0x78); $zlib.Add([byte]0x01)
  $zlib.Add([byte]0x01)                                  # BFINAL=1, BTYPE=00 (stored)
  $len = $rawArr.Length
  $zlib.Add([byte]($len -band 0xFF)); $zlib.Add([byte](($len -shr 8) -band 0xFF))
  $nlen = (-bnot $len) -band 0xFFFF
  $zlib.Add([byte]($nlen -band 0xFF)); $zlib.Add([byte](($nlen -shr 8) -band 0xFF))
  $zlib.AddRange($rawArr)
  $zlib.AddRange((ConvertTo-Be4 (Get-Adler32 -Data $rawArr)))
  $idatData = $zlib.ToArray()

  $out = New-Object System.Collections.Generic.List[byte]
  $out.AddRange([byte[]]@(137, 80, 78, 71, 13, 10, 26, 10))   # PNG signature
  $out.AddRange((New-PngChunk -Type 'IHDR' -Data $ihdr.ToArray() -CrcTable $CrcTable))
  $out.AddRange((New-PngChunk -Type 'IDAT' -Data $idatData -CrcTable $CrcTable))
  $out.AddRange((New-PngChunk -Type 'IEND' -Data (New-Object byte[] 0) -CrcTable $CrcTable))
  return , $out.ToArray()
}

# ------------------------------------------------------------------
# JSON helpers. PowerShell 5.1 ConvertTo-Json unwraps single-element
# arrays, so array bodies (clubs, storage prefixes) are built by hand.
# Non-ASCII is emitted raw (not \uXXXX), so bodies are sent as UTF-8
# bytes in Invoke-SupabaseJson.
# ------------------------------------------------------------------
function ConvertTo-JsonArray {
  param($Items)
  if ($null -eq $Items) { return '[]' }
  $arr = @($Items)
  if ($arr.Count -eq 0) { return '[]' }
  $parts = $arr | ForEach-Object { ($_ | ConvertTo-Json -Compress) }
  return '[' + ($parts -join ',') + ']'
}

function Build-ProfileJson {
  param([hashtable]$Fields, $Clubs)
  $scalar = ($Fields | ConvertTo-Json -Depth 5 -Compress)
  $clubsJson = ConvertTo-JsonArray $Clubs
  return ($scalar.TrimEnd('}') + ',"clubs":' + $clubsJson + '}')
}

# ------------------------------------------------------------------
# Supabase API wrappers
# ------------------------------------------------------------------
# Extract the HTTP response body from a terminating Invoke-RestMethod /
# Invoke-WebRequest error so 4xx/5xx detail (PostgREST/GoTrue JSON) is
# visible. PS 5.1 hides it inside Exception.Response; PS 7 surfaces it in
# ErrorDetails.Message. Try both. Returns '' when no body is available.
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
      $body = $reader.ReadToEnd()
      $reader.Close()
      return [string]$body
    } catch {}
  }
  return ''
}

# PowerShell 5.1 mangles non-ASCII string bodies on the wire, so JSON
# is always sent as an explicit UTF-8 byte array (test users carry
# Japanese names / bio / faculty / hometown).
function Invoke-SupabaseJson {
  param([string]$Method, [string]$Uri, [string]$Json, [hashtable]$ExtraHeaders)
  $h = $srkHeaders.Clone()
  if ($ExtraHeaders) { foreach ($k in $ExtraHeaders.Keys) { $h[$k] = $ExtraHeaders[$k] } }
  $bytes = [Text.Encoding]::UTF8.GetBytes($Json)
  return Invoke-RestMethod -Method $Method -Uri $Uri `
    -Headers $h -ContentType 'application/json; charset=utf-8' -Body $bytes
}

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
  try {
    $res = Invoke-RestMethod -Method Get -Uri $uri -Headers $srkHeaders
    return @($res).Count
  } catch {
    return 0
  }
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

# Relationship inserts (PK upsert = idempotent). service_role bypasses RLS.
function Add-Like {
  param([string]$LikerId, [string]$LikedId)
  $body = @{ liker_id = $LikerId; liked_id = $LikedId } | ConvertTo-Json -Compress
  Invoke-SupabaseJson -Method Post -Uri "$base/rest/v1/likes" `
    -Json $body -ExtraHeaders @{ Prefer = 'resolution=merge-duplicates,return=minimal' } | Out-Null
}

# Verify the detect_match trigger created the normalized matches row for a pair.
# matches is stored normalized as (LEAST,GREATEST) by detect_match; ordinal compare
# of canonical lowercase UUID strings matches Postgres uuid ordering, so we query the
# same canonical (a,b). Returns $true when the row exists.
function Test-MatchExists {
  param([string]$Id1, [string]$Id2)
  if ([string]::CompareOrdinal($Id1, $Id2) -lt 0) { $a = $Id1; $b = $Id2 } else { $a = $Id2; $b = $Id1 }
  $uri = "$base/rest/v1/matches?select=user_a_id&user_a_id=eq.$a&user_b_id=eq.$b"
  $res = Invoke-RestMethod -Method Get -Uri $uri -Headers $srkHeaders
  return (@($res).Count -ge 1)
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
  } catch {
    return @()
  }
}

function Remove-StorageObjects {
  param([string]$Bucket, [string[]]$Paths)
  if (-not $Paths -or $Paths.Count -eq 0) { return }
  $body = '{"prefixes":' + (ConvertTo-JsonArray $Paths) + '}'
  try {
    Invoke-SupabaseJson -Method Delete -Uri "$base/storage/v1/object/$Bucket" -Json $body | Out-Null
  } catch {}
}

function Remove-AuthUser {
  param([string]$Id)
  # Deleting auth.users cascades to profiles and profile_images (ON DELETE CASCADE).
  Invoke-RestMethod -Method Delete -Uri "$base/auth/v1/admin/users/$Id" -Headers $srkHeaders | Out-Null
}

function Get-TestProfiles {
  # Fetch v1 (e2etest_) + v2 (mf/fm/mm/ff) candidates, then strict-filter client-side.
  $or = 'or=(email.like.e2etest_*,email.like.mf*,email.like.fm*,email.like.mm*,email.like.ff*)'
  $uri = "$base/rest/v1/profiles?select=id,email,name,status,gender&$or&order=email.asc"
  $res = Invoke-RestMethod -Method Get -Uri $uri -Headers $srkHeaders
  return @($res | Where-Object { $_.email -match $testEmailRegex })
}

# ------------------------------------------------------------------
# Salted SHA-256 hex. Must reproduce backend/app/core/privacy_purge.py
# `_hash`: hashlib.sha256(f"{salt}:{value}".encode("utf-8")).hexdigest().
# Verified equal to the Python implementation for inputs
#   (salt=testsalt, value=テスト太郎) -> b9f122b6...1bf66d2
#   (salt=testsalt, value=e99MF01)     -> fc7160e1...f29dd790
# When the salt env var is unset, returns $null and emits a warning.
# Callers must treat $null as "skip hash for this user".
# ------------------------------------------------------------------
$script:hashSaltWarned = $false
function Get-SaltedSha256Hex {
  param([string]$Value)
  if ([string]::IsNullOrEmpty($Value)) { return $null }
  $salt = $env:DEV_PRIVACY_HASH_SALT
  if ([string]::IsNullOrEmpty($salt)) {
    if (-not $script:hashSaltWarned) {
      Write-Warning 'DEV_PRIVACY_HASH_SALT not set. Post-purge fixtures (No.5-7) will have NULL hash columns and cannot exercise re-registration detection.'
      $script:hashSaltWarned = $true
    }
    return $null
  }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes("${salt}:${Value}")
    return ([BitConverter]::ToString($sha.ComputeHash($bytes)) -replace '-', '').ToLower()
  } finally {
    $sha.Dispose()
  }
}

# ------------------------------------------------------------------
# Palette (ColorfulCard) -> RGB
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
$comboCfg = @{
  MF = @{ gender = 'male';   interest = 'female'; partner = 'FM' }
  FM = @{ gender = 'female'; interest = 'male';   partner = 'MF' }
  MM = @{ gender = 'male';   interest = 'male';   partner = 'MM' }
  FF = @{ gender = 'female'; interest = 'female'; partner = 'FF' }
}

# Detail label inside the name: {COMBO}-{n}({detail})
$detailByNo = @{
  1 = 'm2/b3'; 2 = 'm1'; 3 = 'm4'; 4 = 'm3/b5'; 5 = 'm6,7'
  6 = 'm5/b7'; 7 = 'm5'; 8 = 'pending'; 9 = 'banned'; 10 = 'deleted'
}

# status per No.
$statusByNo = @{
  1 = 'approved'; 2 = 'approved'; 3 = 'approved'; 4 = 'approved'; 5 = 'approved'
  6 = 'approved'; 7 = 'approved'; 8 = 'pending_review'; 9 = 'banned'; 10 = 'deleted'
}

# photo plan per No.: count + status. Empty list = no photos.
$photoPlanByNo = @{
  1 = @{ count = 3; status = 'approved' }
  2 = @{ count = 3; status = 'approved' }
  3 = @{ count = 1; status = 'approved' }
  4 = @{ count = 1; status = 'approved' }
  5 = @{ count = 2; status = 'approved' }
  6 = @{ count = 0; status = 'approved' }
  7 = @{ count = 0; status = 'approved' }
  8 = @{ count = 1; status = 'pending' }
  9 = @{ count = 1; status = 'approved' }
  10 = @{ count = 0; status = 'approved' }
}

# Match / block targets (partner-system No.) for the 7 approved users.
$matchByNo = @{
  1 = @(2); 2 = @(1); 3 = @(4); 4 = @(3); 5 = @(6, 7); 6 = @(5); 7 = @(5)
}
$blockByNo = @{
  1 = @(3); 4 = @(5); 6 = @(7)
}

# Field distribution helpers (deterministic by No.).
$faculties = @('人間科学部', '経済学部', '法学部', '工学部', '医学部', '理学部', '文学部', '基礎工学部', '外国語学部')
$hometowns = @('大阪府', '東京都', '京都府', '兵庫県', '神奈川県', '愛知県', '福岡県', '北海道', '広島県', '奈良県')
$bioByNo = @{
  6 = '理系の学生です。週末はだいたいカフェで作業してる。映画と散歩が好きなので、気軽に話しかけてください。'
  7 = '音楽と写真が趣味です。最近は朝活にハマってます。同じ大学の人と気軽に話せたら嬉しいです。よろしく。'
}

# faculty -> department (1:1 fixed). identity_hide.py only consults department
# when faculty_hide_level='department', which the seed does NOT set (DB default
# 'none' per migration 021), so a fixed-per-faculty mapping does not skew the
# 身バレ judgement matrix.
$departmentByFaculty = @{
  '人間科学部'   = '人間科学科'
  '経済学部'     = '経済学科'
  '法学部'       = '法学科'
  '工学部'       = '電子情報工学科'
  '医学部'       = '医学科'
  '理学部'       = '物理学科'
  '文学部'       = '人文学科'
  '基礎工学部'   = '電子物理科学科'
  '外国語学部'   = '英語専攻'
}

function Get-FacultyForNo { param([int]$No) return $faculties[($No - 1) % $faculties.Count] }
function Get-DepartmentForFaculty { param([string]$Faculty) return $departmentByFaculty[$Faculty] }
function Get-HometownForNo { param([int]$No) return $hometowns[($No - 1) % $hometowns.Count] }
function Get-YearForNo { param([int]$No) return (($No % 4) + 1) }
function Get-BirthDateForNo {
  param([int]$No)
  $age = 18 + ($No % 5)                 # 18..22
  $yob = 2026 - $age
  $month = (($No * 2) % 12) + 1
  $day = (($No * 3) % 28) + 1
  return ('{0:d4}-{1:d2}-{2:d2}' -f $yob, $month, $day)
}

# real_name / student_number generators. Deterministic per (Combo,No).
# - real_name: "テスト太郎{Combo}-{No}" for male combo, "テスト花子{Combo}-{No}" for female combo.
#              The "テスト" prefix makes test rows trivially identifiable; the per-combo suffix
#              keeps every name unique without collisions across the 4 combos.
# - student_number: "e99{Combo}{No:00}". Frontend validator (SetupRequiredPage.tsx:79) requires
#              /^[a-zA-Z0-9]+$/; backend (profile.py:226) only rejects empty. 'e99' is not a real
#              阪大学籍番号 prefix, so collisions with real accounts are unlikely.
function Get-PlainRealName {
  param([string]$Combo, [int]$No)
  $cfg = $comboCfg[$Combo]
  if ($cfg.gender -eq 'male') { return "テスト太郎$Combo-$No" }
  return "テスト花子$Combo-$No"
}
function Get-PlainStudentNumber {
  param([string]$Combo, [int]$No)
  return ('e99{0}{1:d2}' -f $Combo, $No)
}

# ------------------------------------------------------------------
# Build the profile field set for one user (combo + No).
# Returns @{ fields = [ordered]; clubs = @(); name = '...'; status = '...' }
# ------------------------------------------------------------------
function Build-UserFields {
  param([string]$Combo, [int]$No)
  $cfg = $comboCfg[$Combo]
  $status = $statusByNo[$No]
  $name = "$Combo-$No($($detailByNo[$No]))"

  $bio = $null
  if ($bioByNo.ContainsKey($No)) { $bio = $bioByNo[$No] }   # only 6,7 carry bio

  $faculty = (Get-FacultyForNo -No $No)
  $department = (Get-DepartmentForFaculty -Faculty $faculty)
  $plainRealName = (Get-PlainRealName -Combo $Combo -No $No)
  $plainStudentNumber = (Get-PlainStudentNumber -Combo $Combo -No $No)

  $fields = [ordered]@{
    name        = $name
    gender      = $cfg.gender
    interest_in = $cfg.interest
    year        = (Get-YearForNo -No $No)
    faculty     = $faculty
    department  = $department
    bio         = $bio
    hometown    = (Get-HometownForNo -No $No)
    birth_date  = (Get-BirthDateForNo -No $No)
    status      = $status
  }

  switch ($status) {
    'approved' {
      $fields['identity_verified']       = $true
      $fields['profile_setup_completed'] = $true
      $fields['student_id_submitted']    = $true
      $fields['onboarding_completed']    = $true
      $fields['profile_completed']       = $true

      # 2-state PII split: No.1-4 = post-review (plain, no hash), No.5-7 = post-purge-batch
      # (NULL plain, hash set, privacy_purged_at = 4 days ago). Mirrors prod after the
      # APScheduler privacy_purge run that fires 3 days after approval.
      if ($No -le 4) {
        $fields['real_name']             = $plainRealName
        $fields['student_number']        = $plainStudentNumber
        $fields['real_name_hash']        = $null
        $fields['student_number_hash']   = $null
        $fields['privacy_purged_at']     = $null
      } else {
        $fields['real_name']             = $null
        $fields['student_number']        = $null
        $fields['real_name_hash']        = (Get-SaltedSha256Hex -Value $plainRealName)
        $fields['student_number_hash']   = (Get-SaltedSha256Hex -Value $plainStudentNumber)
        $fields['privacy_purged_at']     = ((Get-Date).AddDays(-4).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))
      }
    }
    'pending_review' {
      $fields['identity_verified']       = $false
      $fields['profile_setup_completed'] = $true
      $fields['student_id_submitted']    = $true
      $fields['onboarding_completed']    = $false
      $fields['profile_completed']       = $false
      $fields['real_name']               = $plainRealName
      $fields['student_number']          = $plainStudentNumber
    }
    'banned' {
      $fields['identity_verified']       = $false
      $fields['profile_setup_completed'] = $true
      $fields['student_id_submitted']    = $true
      $fields['onboarding_completed']    = $true
      $fields['profile_completed']       = $true
      $fields['banned_at']               = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
      $fields['ban_reason']              = 'E2E test fixture'
      # banned is NOT eligible for the privacy_purge batch (privacy_purge.py:124-156),
      # so plain PII is the correct fixture state.
      $fields['real_name']               = $plainRealName
      $fields['student_number']          = $plainStudentNumber
    }
    'deleted' {
      # Soft-delete fixture: keep the numbered name for anonymization tests,
      # clear PII just like DELETE /api/profile/me, set deleted_at to now.
      # auth.users is intentionally NOT deleted (that would cascade-delete the
      # profiles row); we want the row to persist in the deleted state.
      $fields['identity_verified']       = $false
      $fields['profile_setup_completed'] = $true
      $fields['student_id_submitted']    = $true
      $fields['onboarding_completed']    = $true
      $fields['deleted_at']              = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
      $fields['bio']                     = $null
      $fields['profile_image_path']      = $null
      $fields['real_name']               = $null
      $fields['student_number']          = $null
      $fields['birth_date']              = $null
      $fields['student_id_image_path']   = $null
      $fields['age']                     = $null
      $fields['real_name_hash']          = $null
      $fields['student_number_hash']     = $null
    }
  }

  return @{ fields = $fields; clubs = @(); name = $name; status = $status }
}

# ==================================================================
# --create
# ==================================================================
function Invoke-Create {
  $crcTable = Build-Crc32Table
  $created = 0
  $errors  = 0
  $idByKey = @{}

  # --- Phase 1: users + profiles + photos ---
  foreach ($combo in $comboOrder) {
    for ($no = 1; $no -le 10; $no++) {
      $email = "$($combo.ToLower())$no" + $domain
      $key = "$combo-$no"
      try {
        $id = $null
        $isNew = $false
        try {
          $res = Invoke-AdminCreate -Email $email -Password $password
          $id = $res.id
          $isNew = $true
          Write-Host "[OK] $key ($email) created (id=$id)"
        } catch {
          $id = Get-ProfileIdByEmail -Email $email
          if ($id) {
            Write-Host "[SKIP] $key already exists (id=$id) - re-applying profile"
          } else {
            throw
          }
        }
        $idByKey[$key] = $id

        $built = Build-UserFields -Combo $combo -No $no
        $jsonBody = Build-ProfileJson -Fields ([hashtable]$built.fields) -Clubs $built.clubs
        Update-Profile -Id $id -JsonBody $jsonBody

        # Photos: skip when the user already had photos (idempotent re-runs).
        $plan = $photoPlanByNo[$no]
        if ($plan.count -gt 0) {
          $existing = Get-ProfileImageCount -UserId $id
          if ($existing -gt 0) {
            Write-Host "       photos exist ($existing) - skipping upload"
          } else {
            $ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
            $comboIdx = $comboOrder.IndexOf($combo)
            $mainPath = $null
            for ($p = 0; $p -lt $plan.count; $p++) {
              $colorName = $paletteNames[(($comboIdx * 7) + ($no * 3) + $p) % $paletteNames.Count]
              $rgb = $palette[$colorName]
              $png = New-SolidPng -R $rgb[0] -G $rgb[1] -B $rgb[2] -Size 64 -CrcTable $crcTable
              $rand = [guid]::NewGuid().ToString('N').Substring(0, 4)
              $path = "$id/photo_${ts}_$rand.png"
              Upload-StorageObject -Bucket 'profile-images' -Path $path -Bytes $png
              Add-ProfileImage -UserId $id -Path $path -Order $p -Status $plan.status
              if ($p -eq 0) { $mainPath = $path }
            }
            # Only approved photos drive the main thumbnail (profile_image_path).
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
  $matchCount = 0
  $blockCount = 0
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
          # likes both directions (idempotent). The 2nd like fires detect_match,
          # which upserts the matches row. We do NOT insert matches directly.
          $lk1 = "$meId|$targetId"; $lk2 = "$targetId|$meId"
          if ($doneLikes.Add($lk1)) { Add-Like -LikerId $meId -LikedId $targetId }
          if ($doneLikes.Add($lk2)) { Add-Like -LikerId $targetId -LikedId $meId }
          if ([string]::CompareOrdinal($meId, $targetId) -lt 0) { $mk = "$meId|$targetId" } else { $mk = "$targetId|$meId" }
          if ($doneMatches.Add($mk)) {
            if (Test-MatchExists -Id1 $meId -Id2 $targetId) {
              $matchCount++
              Write-Host "[MATCH] $combo-$no <-> $partner-$t (trigger-verified)"
            } else {
              $errors++
              Write-Host "[ERR] match NOT created by detect_match: $combo-$no <-> $partner-$t (both likes inserted, no matches row)"
            }
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
      Remove-AuthUser -Id $id   # cascades profiles + profile_images (+ likes/matches/blocks)
      Write-Host "[OK] deleted $($p.email) (id=$id)"
      $deleted++
    } catch {
      $errors++
      Write-Host "[ERR] $($p.email): $($_.Exception.Message) $(Get-HttpErrorBody $_)"
    }
  }

  Write-Host ''
  Write-Host "RESULT: deleted=$deleted errors=$errors"

  # Proof of cleanup: re-fetch and report any residual test users (expect 0).
  # Covers e2etest_* (v1) + mf/fm/mm/ff 1..10 (v2, incl. v1 fm1/fm2) via the
  # same strict regex used by Get-TestProfiles.
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
