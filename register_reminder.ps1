$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File d:\BLINK\drawer\otter_reminder.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 23:00
Register-ScheduledTask -TaskName "OtterSleepReminder" -Action $action -Trigger $trigger -Description "Daily otter sleep reminder" -Force
