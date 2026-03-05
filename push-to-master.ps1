# Push Clock In App changes to master
# Run from project root: .\push-to-master.ps1

Set-Location $PSScriptRoot
$git = "C:\Program Files\Git\cmd\git.exe"

& $git add .
& $git status
& $git commit -m "Add collapsible Google Calendar events section to Enterprise page"
& $git push origin master
