# seed_test_users_dev.ps1
# Create / cleanup / list E2E test users on the dev Supabase project.
#
# These users let us exercise the app on dev without going through the normal
# signup flow (email confirmation is OFF on dev, but the frontend always routes
# new signups to /check-email, which dead-ends manual testing). We instead use
# the Supabase Admin API to create already-confirmed users and then promote them
# to approved/banned/pending/deleted states directly via PostgREST.
#
# All test users share the e2etest_ email prefix so --cleanup can find them.
#
# Usage (pass the service_role key via env var so it never lands in chat/logs):
#   $env:DEV_SRK = '<dev service_role key>'
#   $env:DEV_TEST_PASSWORD = 'TestUser_2026!'   # optional, defaults below
#   .\scripts\seed_test_users_dev.ps1 --create     # create the 13 test users
#   .\scripts\seed_test_users_dev.ps1 --list        # list current e2etest_ users
#   .\scripts\seed_test_users_dev.ps1 --cleanup     # delete all e2etest_ users
#   $env:DEV_SRK = $null
#   $env:DEV_TEST_PASSWORD = $null
#
# Expected --create output tail: RESULT: created=13 errors=0

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$base   = 'https://hpkpndjqtzycnytymdkk.supabase.co'   # dev project (hpkpndjqtzycnytymdkk)
$domain = '@ecs.osaka-u.ac.jp'
$prefixPattern = 'e2etest_'

# ------------------------------------------------------------------
# Arg / env validation
# ------------------------------------------------------------------
$mode = if ($args.Count -ge 1) { [string]$args[0] } else { '' }

function Show-Help {
  Write-Host ''
  Write-Host 'seed_test_users_dev.ps1 - dev Supabase test user seeder'
  Write-Host ''
  Write-Host '  --create    Create the 13 e2etest_ users (idempotent: re-runs re-apply profile fields)'
  Write-Host '  --list      List current e2etest_ users (id / email / name / status / gender)'
  Write-Host '  --cleanup   Delete all e2etest_ users (storage + auth.users; profiles/profile_images cascade)'
  Write-Host ''
  Write-Host 'Required env: DEV_SRK (dev service_role key)'
  Write-Host 'Optional env: DEV_TEST_PASSWORD (defaults to TestUser_2026!)'
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
  $password = 'TestUser_2026!'
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
# PowerShell 5.1 mangles non-ASCII string bodies on the wire, so JSON
# is always sent as an explicit UTF-8 byte array (test users carry
# Japanese names / bio / clubs / faculty / hometown).
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
  $uri = "$base/rest/v1/profiles?select=id,email,name,status,gender&email=like.${prefixPattern}*&order=email.asc"
  $res = Invoke-RestMethod -Method Get -Uri $uri -Headers $srkHeaders
  return @($res | Where-Object { $_.email -like "${prefixPattern}*$domain" })
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

# ------------------------------------------------------------------
# Test user roster (13 users). photos = ordered list of palette color
# names; the first entry becomes the main photo (profile_image_path).
# ------------------------------------------------------------------
$users = @(
  [ordered]@{ prefix='e2etest_owner_01';      name='TestOwner';        gender='male';   interest_in='female'; year=3; faculty='工学部';     status='approved';       identity_verified=$true;  onboarding_completed=$true;  bio='テスト用のオーナーアカウント'; status_message=$null;          clubs=@('テニス');         hometown='大阪府';   photos=@('blue') }
  [ordered]@{ prefix='e2etest_target_01';     name='TestTargetA';      gender='female'; interest_in='male';   year=1; faculty='文学部';     status='approved';       identity_verified=$true;  onboarding_completed=$true;  bio='1年です。よろしく。';          status_message='今日のBGM、悪くない。'; clubs=@('軽音');           hometown='東京都';   photos=@('pink') }
  [ordered]@{ prefix='e2etest_target_02';     name='TestTargetB';      gender='female'; interest_in='male';   year=2; faculty='法学部';     status='approved';       identity_verified=$true;  onboarding_completed=$true;  bio=$null;                          status_message='課題が終わらない。';     clubs=@('テニス');         hometown='大阪府';   photos=@('purple') }
  [ordered]@{ prefix='e2etest_target_03';     name='TestTargetC';      gender='female'; interest_in='male';   year=3; faculty='理学部';     status='approved';       identity_verified=$true;  onboarding_completed=$true;  bio='理系です。';                   status_message=$null;          clubs=@('軽音');           hometown='兵庫県';   photos=@() }
  [ordered]@{ prefix='e2etest_target_04';     name='TestTargetD';      gender='female'; interest_in='male';   year=4; faculty='医学部';     status='approved';       identity_verified=$true;  onboarding_completed=$true;  bio='4年。卒研頑張ってます。';      status_message='あと一歩で平和。';       clubs=@();                 hometown='京都府';   photos=@('mint') }
  [ordered]@{ prefix='e2etest_target_05';     name='TestTargetE';      gender='female'; interest_in='male';   year=4; faculty='外国語学部'; status='approved';       identity_verified=$true;  onboarding_completed=$true;  bio='言語が好き。';                 status_message='なんとなく春。';         clubs=@('テニス','写真');  hometown='神奈川県'; photos=@('orange','yellow','blue') }
  [ordered]@{ prefix='e2etest_target_06';     name='TestTargetF';      gender='female'; interest_in='male';   year=2; faculty='基礎工学部'; status='approved';       identity_verified=$true;  onboarding_completed=$true;  bio='理系女子。';                   status_message='意外と忙しい。';         clubs=@('プログラミング'); hometown='大阪府';   photos=@('orange') }
  [ordered]@{ prefix='e2etest_same_01';       name='TestSameGenderA';  gender='male';   interest_in='male';   year=3; faculty='工学部';     status='approved';       identity_verified=$true;  onboarding_completed=$true;  bio='テスト用同性ペア①';           status_message=$null;          clubs=@();                 hometown='大阪府';   photos=@('yellow') }
  [ordered]@{ prefix='e2etest_same_02';       name='TestSameGenderB';  gender='female'; interest_in='female'; year=2; faculty='文学部';     status='approved';       identity_verified=$true;  onboarding_completed=$true;  bio='テスト用同性ペア②';           status_message=$null;          clubs=@();                 hometown='大阪府';   photos=@('mint') }
  [ordered]@{ prefix='e2etest_banned';        name='TestBanned';       gender='female'; interest_in='male';   year=2; faculty='経済学部';   status='banned';         identity_verified=$true;  onboarding_completed=$true;  bio='BAN テスト用';                 status_message=$null;          clubs=@();                 hometown='大阪府';   photos=@('pink') }
  [ordered]@{ prefix='e2etest_pending';       name='TestPending';      gender='female'; interest_in='male';   year=2; faculty='人間科学部'; status='pending_review'; identity_verified=$false; onboarding_completed=$false; bio=$null;                          status_message=$null;          clubs=@();                 hometown='大阪府';   photos=@() }
  [ordered]@{ prefix='e2etest_deleted';       name='TestDeleted';      gender='female'; interest_in='male';   year=2; faculty='法学部';     status='deleted';        identity_verified=$true;  onboarding_completed=$true;  bio=$null;                          status_message=$null;          clubs=@();                 hometown='大阪府';   photos=@() }
  [ordered]@{ prefix='e2etest_blocktarget';   name='TestBlockTarget';  gender='female'; interest_in='male';   year=3; faculty='理学部';     status='approved';       identity_verified=$true;  onboarding_completed=$true;  bio='ブロック動作確認用';           status_message=$null;          clubs=@();                 hometown='大阪府';   photos=@('purple') }
)

# ==================================================================
# --create
# ==================================================================
function Invoke-Create {
  $crcTable = Build-Crc32Table
  $created = 0
  $errors  = 0

  foreach ($u in $users) {
    $email = $u.prefix + $domain
    try {
      # 1) Admin create (email_confirm so the user is usable without email step).
      $id = $null
      try {
        $res = Invoke-AdminCreate -Email $email -Password $password
        $id = $res.id
        Write-Host "[OK] $($u.prefix) created (id=$id)"
      } catch {
        # Likely already exists from a prior run; re-apply profile fields.
        $id = Get-ProfileIdByEmail -Email $email
        if ($id) {
          Write-Host "[SKIP] $($u.prefix) already exists (id=$id) - re-applying profile"
        } else {
          throw
        }
      }

      # 2) Promote the auto-created profile row to the target state.
      $fields = [ordered]@{
        name                   = $u.name
        gender                 = $u.gender
        interest_in            = $u.interest_in
        year                   = $u.year
        faculty                = $u.faculty
        bio                    = $u.bio
        status_message         = $u.status_message
        hometown               = $u.hometown
        status                 = $u.status
        identity_verified      = $u.identity_verified
        onboarding_completed   = $u.onboarding_completed
      }

      switch ($u.status) {
        'approved' {
          $fields['profile_setup_completed'] = $true
          $fields['student_id_submitted']    = $true
          $fields['profile_completed']       = $true
        }
        'banned' {
          $fields['profile_setup_completed'] = $true
          $fields['student_id_submitted']    = $true
          $fields['profile_completed']       = $true
          $fields['banned_at']               = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
          $fields['ban_reason']              = 'E2E test fixture'
        }
        'pending_review' {
          $fields['profile_setup_completed'] = $true
          $fields['student_id_submitted']    = $true
          $fields['profile_completed']       = $false
        }
        'deleted' {
          # Simulate post-withdrawal (PII clear is omitted by design for the fixture).
          $fields['deleted_at'] = (Get-Date).ToUniversalTime().AddDays(-7).ToString('yyyy-MM-ddTHH:mm:ssZ')
        }
      }

      $jsonBody = Build-ProfileJson -Fields ([hashtable]$fields) -Clubs $u.clubs
      Update-Profile -Id $id -JsonBody $jsonBody

      # 3) Dummy photos (solid color PNGs) for users that should have one.
      $photoColors = @($u.photos)
      if ($photoColors.Count -gt 0) {
        $ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        $mainPath = $null
        for ($p = 0; $p -lt $photoColors.Count; $p++) {
          $rgb = $palette[$photoColors[$p]]
          $png = New-SolidPng -R $rgb[0] -G $rgb[1] -B $rgb[2] -Size 64 -CrcTable $crcTable
          $rand = [guid]::NewGuid().ToString('N').Substring(0, 4)
          $path = "$id/photo_${ts}_$rand.png"
          Upload-StorageObject -Bucket 'profile-images' -Path $path -Bytes $png
          Add-ProfileImage -UserId $id -Path $path -Order $p -Status 'approved'
          if ($p -eq 0) { $mainPath = $path }
        }
        # Main photo first: profile_image_path points at display_order 0.
        Update-Profile -Id $id -JsonBody (@{ profile_image_path = $mainPath } | ConvertTo-Json -Compress)
        Write-Host "       +$($photoColors.Count) photo(s)"
      }

      $created++
    } catch {
      $errors++
      Write-Host "[ERR] $($u.prefix): $($_.Exception.Message)"
    }
  }

  Write-Host ''
  Write-Host "RESULT: created=$created errors=$errors"
}

# ==================================================================
# --cleanup
# ==================================================================
function Invoke-Cleanup {
  $profiles = Get-TestProfiles
  if ($profiles.Count -eq 0) {
    Write-Host 'No e2etest_ users found.'
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
      Remove-AuthUser -Id $id   # cascades profiles + profile_images
      Write-Host "[OK] deleted $($p.email) (id=$id)"
      $deleted++
    } catch {
      $errors++
      Write-Host "[ERR] $($p.email): $($_.Exception.Message)"
    }
  }

  Write-Host ''
  Write-Host "RESULT: deleted=$deleted errors=$errors"
}

# ==================================================================
# --list
# ==================================================================
function Invoke-List {
  $profiles = Get-TestProfiles
  if ($profiles.Count -eq 0) {
    Write-Host 'No e2etest_ users found.'
    return
  }
  Write-Host ("{0,-28} {1,-16} {2,-15} {3,-8} {4}" -f 'email', 'name', 'status', 'gender', 'id')
  Write-Host ('-' * 100)
  foreach ($p in $profiles) {
    Write-Host ("{0,-28} {1,-16} {2,-15} {3,-8} {4}" -f $p.email, $p.name, $p.status, $p.gender, $p.id)
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
