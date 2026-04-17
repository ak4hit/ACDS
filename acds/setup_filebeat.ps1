$ConfigPath = "C:\Program Files\Elastic\Beats\9.3.3\filebeat\filebeat.yml"
$ConfigContent = @"
filebeat.inputs:
- type: filestream
  id: acds-backend-logs
  enabled: true
  paths:
    - C:\Users\Akshith\OneDrive\Documents\Desktop\Final winner project\winners-project\acds\backend\fake_logs\*.log

output.http:
  hosts: ["http://localhost:8000"]
  path: "/ingest"
  method: "POST"
  headers:
    Content-Type: "application/json"
  codec.json:
    pretty: false
"@

# Write the configuration file
Set-Content -Path $ConfigPath -Value $ConfigContent

# Navigate to the Filebeat directory
Set-Location "C:\Program Files\Elastic\Beats\9.3.3\filebeat"

# Install the service
.\install-service-filebeat.ps1

# Start the service
Start-Service filebeat

Write-Host "Filebeat successfully configured, installed, and started! You can close this window now."
Start-Sleep -Seconds 5
