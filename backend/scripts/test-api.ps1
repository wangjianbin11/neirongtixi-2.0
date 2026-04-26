# Test Login API
$body = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Login Success!"
    Write-Host "Token: $($response.data.token)"
    Write-Host "User: $($response.data.user.username)"
} catch {
    Write-Host "Login Failed: $($_.Exception.Message)"
}
