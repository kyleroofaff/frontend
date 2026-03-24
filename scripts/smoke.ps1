$ErrorActionPreference = "Stop"

function Assert-Status {
  param (
    [string]$Url,
    [int]$ExpectedStatus
  )
  try {
    $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing
    if ($resp.StatusCode -ne $ExpectedStatus) {
      throw "Expected $ExpectedStatus for $Url but got $($resp.StatusCode)"
    }
    Write-Output "PASS $Url status=$($resp.StatusCode)"
    return $resp
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      if ($status -eq $ExpectedStatus) {
        Write-Output "PASS $Url status=$status"
        return $null
      }
      throw "Expected $ExpectedStatus for $Url but got $status"
    }
    throw
  }
}

Write-Output "Running smoke checks..."

# --- Static source guard checks (catch missing null guards before they reach production) ---

$sitePrimFile = Join-Path $PSScriptRoot "..\src\components\site\SitePrimitives.jsx"
$sitePrimContent = Get-Content $sitePrimFile -Raw
if ($sitePrimContent -notmatch 'if \(!seller\) return null') {
  throw "FAIL SellerQrCard missing null guard for undefined seller prop (seller.id crash risk)"
}
Write-Output "PASS SellerQrCard null guard present"

$dashFile = Join-Path $PSScriptRoot "..\src\pages\DashboardPages.jsx"
$dashContent = Get-Content $dashFile -Raw
if ($dashContent -notmatch 'sellerMap\[currentSellerId\] \?') {
  throw "FAIL SellerDashboardPage missing conditional guard around SellerQrCard render"
}
Write-Output "PASS SellerDashboardPage SellerQrCard render is guarded"

# --- Frontend SPA shell checks ---

$frontendRoutes = @("/", "/admin", "/account", "/seller-dashboard")
foreach ($route in $frontendRoutes) {
  $resp = Assert-Status -Url ("http://localhost:5173" + $route) -ExpectedStatus 200
  if ($null -ne $resp -and $resp.Content -notmatch 'id=\"root\"') {
    throw "Frontend shell missing root div for route $route"
  }
}

Assert-Status -Url "http://localhost:4000/api/health" -ExpectedStatus 200 | Out-Null
Assert-Status -Url "http://localhost:4000/api/health/ready" -ExpectedStatus 200 | Out-Null
Assert-Status -Url "http://localhost:4000/api/bootstrap" -ExpectedStatus 200 | Out-Null

$loginBody = @{ email = "admin@example.com"; password = "change_me_admin" } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
if ([string]::IsNullOrWhiteSpace([string]$loginResp.token)) {
  throw "Admin login did not return auth token"
}
Write-Output "PASS /api/auth/login admin token=true"

Write-Output "Smoke checks complete."
