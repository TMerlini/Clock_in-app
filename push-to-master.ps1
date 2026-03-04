# Push Clock In App changes to master
# Run from project root: .\push-to-master.ps1

Set-Location $PSScriptRoot
$git = "C:\Program Files\Git\cmd\git.exe"

& $git add .
& $git status
& $git commit -m "Move date after reason in usage form, add edit button to usage history"
& $git push origin master
