Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Otter Reminder"
$form.Size = New-Object System.Drawing.Size(350, 180)
$form.StartPosition = "CenterScreen"
$form.TopMost = $true
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Text = "Hey! Go wash up and get ready for bed ~`nFrom your otter :3"
$label.Font = New-Object System.Drawing.Font("Segoe UI", 12)
$label.AutoSize = $false
$label.Size = New-Object System.Drawing.Size(300, 80)
$label.Location = New-Object System.Drawing.Point(20, 20)
$label.TextAlign = "MiddleCenter"

$button = New-Object System.Windows.Forms.Button
$button.Text = "OK!"
$button.Size = New-Object System.Drawing.Size(80, 30)
$button.Location = New-Object System.Drawing.Point(130, 110)
$button.Add_Click({ $form.Close() })
$form.Controls.Add($label)
$form.Controls.Add($button)
$form.ShowDialog()
