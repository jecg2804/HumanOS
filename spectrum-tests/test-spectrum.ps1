# test-spectrum-all.ps1
# Prueba los 21 servicios Get del Authorization ID API, captura WSDLs y responses

$baseUrl     = "https://iconsanet.dexterchaney.com:8482/ws"
$wsdlBaseUrl = "https://iconsanet.dexterchaney.com:8482/wsdls"
$authId      = "API"
$companyCode = "ICN"
$user        = "${companyCode}:${authId}"
$outputDir   = "$env:USERPROFILE\spectrum-tests"

New-Item -Path $outputDir -ItemType Directory -Force | Out-Null

# Lista oficial de los 21 servicios (nombres exactos de Spectrum)
$services = @(
    "GetEmployeeTraining",
    "GetProjectLogTransID",
    "GetVendors",
    "GetCustomers",
    "GetDedAddon",
    "GetDiscipline",
    "GetEmployee",
    "GetEmployeeUDF",
    "GetEqCostCategory",
    "GetEquipment",
    "GetInventoryItems",
    "GetJob",
    "GetJobContact",
    "GetJobDates",
    "GetJobTitles",
    "GetJobUDF",
    "GetPayType",
    "GetPhase",
    "GetPhaseEnhanced",
    "GetPJJob",
    "GetWageCode"
)

$results = @()

foreach ($svcName in $services) {
    Write-Host ""
    Write-Host "=== $svcName ===" -ForegroundColor Cyan

    # 1. Descargar WSDL del servicio
    $wsdlPath = "$outputDir\$svcName.wsdl.xml"
    curl.exe -s "$wsdlBaseUrl/$svcName.jws" -u $user -o $wsdlPath 2>$null

    if (-not (Test-Path $wsdlPath) -or (Get-Item $wsdlPath).Length -lt 100) {
        Write-Host "  WSDL no disponible o vacio" -ForegroundColor Yellow
        $results += [PSCustomObject]@{
            Service = $svcName; WSDL = "NOT_FOUND"; Status = "SKIPPED"
            Records = 0; Size = 0; Duration = 0
        }
        continue
    }

    # 2. Extraer parametros del WSDL con regex
    $wsdlContent = Get-Content $wsdlPath -Raw
    $svcElement  = [regex]::Match($wsdlContent, "name='$svcName'>.*?</sequence>", 'Singleline')

    if (-not $svcElement.Success) {
        Write-Host "  No se pudo parsear WSDL, uso parametros minimos" -ForegroundColor Yellow
        $params = @("pCompany_Code")
    } else {
        $params = [regex]::Matches($svcElement.Value, "name='([^']+)'") |
                  ForEach-Object { $_.Groups[1].Value } |
                  Where-Object { $_ -ne $svcName -and $_ -ne 'Authorization_ID' -and $_ -ne 'GUID' }
    }

    Write-Host "  Parametros: $($params -join ', ')"

    # 3. Construir SOAP envelope con todos los parametros (Company_Code lleno, resto vacios)
    $fields = ""
    foreach ($p in $params) {
        if ($p -eq "pCompany_Code") {
            $fields += "      <$p>$companyCode</$p>`n"
        } else {
            $fields += "      <$p></$p>`n"
        }
    }

    $body = @"
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <$svcName xmlns="http://www.northgate-is.com/proiv/webservices/types">
      <Authorization_ID>$authId</Authorization_ID>
      <GUID>$([guid]::NewGuid().ToString())</GUID>
$fields    </$svcName>
  </soap:Body>
</soap:Envelope>
"@

    $bodyPath = "$outputDir\$svcName.request.xml"
    $body | Out-File -FilePath $bodyPath -Encoding ascii

    # 4. Llamar al servicio
    $responsePath = "$outputDir\$svcName.response.xml"
    $endpoint     = "$baseUrl/$svcName"

    $startTime = Get-Date
    curl.exe -s -X POST $endpoint -u $user `
        -H "Content-Type: text/xml; charset=utf-8" `
        -H "SOAPAction: $endpoint" `
        --data-binary "@$bodyPath" `
        -o $responsePath 2>$null
    $duration = ((Get-Date) - $startTime).TotalSeconds

    # 5. Analizar respuesta
    if (Test-Path $responsePath) {
        $size    = (Get-Item $responsePath).Length
        $content = Get-Content $responsePath -Raw

        if ($content -match "<SOAP-ENV:Fault>") {
            $faultMatch = [regex]::Match($content, "<faultstring>([^<]+)</faultstring>")
            $faultMsg   = if ($faultMatch.Success) { $faultMatch.Groups[1].Value.Substring(0, [Math]::Min(80, $faultMatch.Groups[1].Value.Length)) } else { "Unknown fault" }
            $status     = "FAULT: $faultMsg"
            $records    = 0
        } elseif ($content -match "<response>") {
            $status  = "OK"
            $records = ([regex]::Matches($content, "<response>")).Count
        } else {
            $status  = "EMPTY"
            $records = 0
        }
    } else {
        $status  = "NO_RESPONSE"
        $size    = 0
        $records = 0
    }

    $color = if ($status -eq "OK") { "Green" } elseif ($status -eq "EMPTY") { "Yellow" } else { "Red" }
    Write-Host "  Status: $status | Size: $size | Records: $records | Time: $([math]::Round($duration, 2))s" -ForegroundColor $color

    $results += [PSCustomObject]@{
        Service  = $svcName
        WSDL     = "OK"
        Status   = $status
        Records  = $records
        Size     = $size
        Duration = [math]::Round($duration, 2)
    }
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Yellow
$results | Format-Table -AutoSize

$results | Export-Csv -Path "$outputDir\resumen.csv" -NoTypeInformation
Write-Host ""
Write-Host "Archivos en: $outputDir" -ForegroundColor Green
Write-Host "  *.wsdl.xml      - Contrato del servicio"      -ForegroundColor Gray
Write-Host "  *.request.xml   - Envelope SOAP enviado"      -ForegroundColor Gray
Write-Host "  *.response.xml  - Respuesta cruda"            -ForegroundColor Gray
Write-Host "  resumen.csv     - Estado de todos"            -ForegroundColor Gray