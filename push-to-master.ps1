# Push Clock In App changes to master
# Run from project root: .\push-to-master.ps1

Set-Location $PSScriptRoot
$git = "C:\Program Files\Git\cmd\git.exe"

& $git add .
& $git status
& $git commit -m "Add global dark-themed scrollbar styling to match app theme"
& $git push origin master
