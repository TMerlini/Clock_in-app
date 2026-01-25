# Push Clock In App changes to master
# Run from project root: .\push-to-master.ps1

Set-Location $PSScriptRoot
$git = "C:\Program Files\Git\cmd\git.exe"

& $git add .
& $git status
& $git commit -m "Add Enterprise AI Assistant, member data access, alias display"
& $git push origin master
