try {
    $excel = New-Object -ComObject Excel.Application
    Write-Host "EXCEL_COM_SUCCESS: Version $($excel.Version)"
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
} catch {
    Write-Host "EXCEL_COM_ERROR: $($_.Exception.Message)"
}
