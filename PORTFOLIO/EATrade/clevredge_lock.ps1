# ============================================================
#  ClevrEdge Lock Manager — Windows Forms GUI
#  Reads account status from API, writes lock file locally
# ============================================================

# --- CONFIG: edit these ---
$apiUrl = "https://clevrgold.vercel.app/api/lock-manager"
$apiKey = "clvr_ea_lock_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c"
# --------------------------

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$lockDir  = "$env:APPDATA\MetaQuotes\Terminal\Common\Files"
$lockFile = "$lockDir\clevredge_locked.txt"
if (!(Test-Path $lockDir))  { New-Item -ItemType Directory -Path $lockDir -Force | Out-Null }
if (!(Test-Path $lockFile)) { New-Item -ItemType File -Path $lockFile -Force | Out-Null }

# --- State ---
$script:allAccounts = @()
$script:currentFilter = "All"

# --- Colors ---
$bgDark   = [System.Drawing.Color]::FromArgb(25, 25, 35)
$bgPanel  = [System.Drawing.Color]::FromArgb(35, 35, 48)
$bgRow    = [System.Drawing.Color]::FromArgb(30, 30, 42)
$bgRowAlt = [System.Drawing.Color]::FromArgb(38, 38, 52)
$fgNormal = [System.Drawing.Color]::FromArgb(200, 200, 220)
$fgDim    = [System.Drawing.Color]::FromArgb(120, 120, 140)
$fgGreen  = [System.Drawing.Color]::FromArgb(80, 220, 80)
$fgRed    = [System.Drawing.Color]::FromArgb(255, 80, 80)
$fgOrange = [System.Drawing.Color]::FromArgb(255, 180, 60)
$fgBlue   = [System.Drawing.Color]::FromArgb(80, 180, 255)
$btnBg    = [System.Drawing.Color]::FromArgb(50, 50, 65)
$btnLock  = [System.Drawing.Color]::FromArgb(180, 60, 60)
$btnUnlock = [System.Drawing.Color]::FromArgb(40, 40, 55)

# --- Helpers ---
function Get-LockedAccounts {
    if (Test-Path $lockFile) {
        return @(Get-Content $lockFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })
    }
    return @()
}

function Save-LockedAccounts($list) {
    ($list | Sort-Object -Unique) | Out-File -FilePath $lockFile -Encoding utf8
}

function Set-DBLock($accountNumber, $locked) {
    # Sync lock to DB so web dashboard sees it too
    try {
        $body = @{ manual_lock = $locked } | ConvertTo-Json
        $dashUrl = $apiUrl -replace '/lock-manager$', "/account/$accountNumber/lock"
        Invoke-RestMethod -Uri $dashUrl -Method Patch -Body $body -ContentType "application/json" -TimeoutSec 5 | Out-Null
    } catch {
        # Silent fail - local file is primary, DB is secondary
    }
}

function Fetch-AccountStatus {
    try {
        $resp = Invoke-RestMethod -Uri "$apiUrl`?key=$apiKey" -Method Get -TimeoutSec 10
        return $resp
    } catch {
        [System.Windows.Forms.MessageBox]::Show(
            "Cannot connect to API.`n$($_.Exception.Message)",
            "Connection Error", "OK", "Warning")
        return $null
    }
}

# === BUILD FORM ===
$form = New-Object System.Windows.Forms.Form
$form.Text = "ClevrEdge Lock Manager"
$form.Size = New-Object System.Drawing.Size(720, 570)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox = $false
$form.BackColor = $bgDark
$form.Font = New-Object System.Drawing.Font("Consolas", 9)

# --- Title Bar ---
$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = "ClevrEdge Lock Manager"
$lblTitle.Font = New-Object System.Drawing.Font("Consolas", 13, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = $fgNormal
$lblTitle.Location = New-Object System.Drawing.Point(15, 10)
$lblTitle.AutoSize = $true
$form.Controls.Add($lblTitle)

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = ""
$lblStatus.ForeColor = $fgDim
$lblStatus.Font = New-Object System.Drawing.Font("Consolas", 8)
$lblStatus.Location = New-Object System.Drawing.Point(15, 35)
$lblStatus.AutoSize = $true
$form.Controls.Add($lblStatus)

$btnRefresh = New-Object System.Windows.Forms.Button
$btnRefresh.Text = "Refresh"
$btnRefresh.Location = New-Object System.Drawing.Point(620, 10)
$btnRefresh.Size = New-Object System.Drawing.Size(75, 30)
$btnRefresh.FlatStyle = "Flat"
$btnRefresh.BackColor = $btnBg
$btnRefresh.ForeColor = $fgBlue
$btnRefresh.FlatAppearance.BorderColor = $fgBlue
$btnRefresh.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnRefresh)

# --- Filter Buttons ---
$filterY = 55
$filterNames = @("All", "AW", "Losing", "Idle", "Locked")
$filterButtons = @()
$fx = 15

foreach ($fn in $filterNames) {
    $fb = New-Object System.Windows.Forms.Button
    $fb.Text = $fn
    $fb.Tag = $fn
    $fb.Location = New-Object System.Drawing.Point($fx, $filterY)
    $fb.Size = New-Object System.Drawing.Size(70, 28)
    $fb.FlatStyle = "Flat"
    $fb.FlatAppearance.BorderSize = 1
    $fb.Font = New-Object System.Drawing.Font("Consolas", 9)
    $fb.Cursor = [System.Windows.Forms.Cursors]::Hand
    $fb.Add_Click({
        $script:currentFilter = $this.Tag
        Update-Display
    })
    $form.Controls.Add($fb)
    $filterButtons += $fb
    $fx += 78
}

# --- Main Panel (scrollable) ---
$mainPanel = New-Object System.Windows.Forms.Panel
$mainPanel.Location = New-Object System.Drawing.Point(0, 90)
$mainPanel.Size = New-Object System.Drawing.Size(720, 370)
$mainPanel.AutoScroll = $true
$mainPanel.BackColor = $bgDark
$form.Controls.Add($mainPanel)

# --- Header Row ---
$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.Location = New-Object System.Drawing.Point(0, 0)
$headerPanel.Size = New-Object System.Drawing.Size(700, 24)
$headerPanel.BackColor = [System.Drawing.Color]::FromArgb(45, 45, 60)
$mainPanel.Controls.Add($headerPanel)

$headerCols = @(
    @{Text=""; X=8; W=25},
    @{Text="Label"; X=35; W=70},
    @{Text="Account"; X=110; W=95},
    @{Text="Balance"; X=210; W=70},
    @{Text="Float"; X=285; W=70},
    @{Text="Ord"; X=360; W=35},
    @{Text="AW"; X=400; W=30},
    @{Text="Status"; X=440; W=60},
    @{Text=""; X=510; W=80}
)

foreach ($col in $headerCols) {
    $hl = New-Object System.Windows.Forms.Label
    $hl.Text = $col.Text
    $hl.ForeColor = $fgDim
    $hl.Font = New-Object System.Drawing.Font("Consolas", 8)
    $hl.Location = New-Object System.Drawing.Point($col.X, 4)
    $hl.Size = New-Object System.Drawing.Size($col.W, 18)
    $headerPanel.Controls.Add($hl)
}

# --- Account Rows Storage ---
$script:rowPanels = @()
$script:rowChecks = @()
$script:rowData = @()
$script:groupHeaders = @{}

function Create-AccountRow($index, $yPos) {
    $rowBg = if ($index % 2 -eq 0) { $bgRow } else { $bgRowAlt }

    $panel = New-Object System.Windows.Forms.Panel
    $panel.Location = New-Object System.Drawing.Point(0, $yPos)
    $panel.Size = New-Object System.Drawing.Size(700, 38)
    $panel.BackColor = $rowBg

    # Checkbox
    $chk = New-Object System.Windows.Forms.CheckBox
    $chk.Location = New-Object System.Drawing.Point(10, 10)
    $chk.Size = New-Object System.Drawing.Size(18, 18)
    $chk.BackColor = $rowBg
    $panel.Controls.Add($chk)

    # Label (avatar_text)
    $lblName = New-Object System.Windows.Forms.Label
    $lblName.Name = "lbl_name"
    $lblName.Location = New-Object System.Drawing.Point(35, 10)
    $lblName.Size = New-Object System.Drawing.Size(35, 20)
    $lblName.ForeColor = $fgOrange
    $lblName.Font = New-Object System.Drawing.Font("Consolas", 9, [System.Drawing.FontStyle]::Bold)
    $panel.Controls.Add($lblName)

    # Strategy badge (BUY/SELL)
    $lblStrat = New-Object System.Windows.Forms.Label
    $lblStrat.Name = "lbl_strat"
    $lblStrat.Location = New-Object System.Drawing.Point(70, 10)
    $lblStrat.Size = New-Object System.Drawing.Size(35, 20)
    $lblStrat.Font = New-Object System.Drawing.Font("Consolas", 7, [System.Drawing.FontStyle]::Bold)
    $panel.Controls.Add($lblStrat)

    # Account
    $lblAcct = New-Object System.Windows.Forms.Label
    $lblAcct.Name = "lbl_acct"
    $lblAcct.Location = New-Object System.Drawing.Point(110, 10)
    $lblAcct.Size = New-Object System.Drawing.Size(95, 20)
    $lblAcct.ForeColor = $fgDim
    $panel.Controls.Add($lblAcct)

    # Balance
    $lblBal = New-Object System.Windows.Forms.Label
    $lblBal.Name = "lbl_bal"
    $lblBal.Location = New-Object System.Drawing.Point(210, 10)
    $lblBal.Size = New-Object System.Drawing.Size(70, 20)
    $lblBal.ForeColor = $fgNormal
    $panel.Controls.Add($lblBal)

    # Float PnL
    $lblPnl = New-Object System.Windows.Forms.Label
    $lblPnl.Name = "lbl_pnl"
    $lblPnl.Location = New-Object System.Drawing.Point(285, 10)
    $lblPnl.Size = New-Object System.Drawing.Size(70, 20)
    $panel.Controls.Add($lblPnl)

    # Orders
    $lblOrd = New-Object System.Windows.Forms.Label
    $lblOrd.Name = "lbl_ord"
    $lblOrd.Location = New-Object System.Drawing.Point(360, 10)
    $lblOrd.Size = New-Object System.Drawing.Size(35, 20)
    $lblOrd.ForeColor = $fgNormal
    $panel.Controls.Add($lblOrd)

    # AW
    $lblAW = New-Object System.Windows.Forms.Label
    $lblAW.Name = "lbl_aw"
    $lblAW.Location = New-Object System.Drawing.Point(400, 10)
    $lblAW.Size = New-Object System.Drawing.Size(30, 20)
    $panel.Controls.Add($lblAW)

    # Lock Status
    $lblLock = New-Object System.Windows.Forms.Label
    $lblLock.Name = "lbl_lock"
    $lblLock.Location = New-Object System.Drawing.Point(440, 10)
    $lblLock.Size = New-Object System.Drawing.Size(60, 20)
    $lblLock.Font = New-Object System.Drawing.Font("Consolas", 8, [System.Drawing.FontStyle]::Bold)
    $panel.Controls.Add($lblLock)

    # Toggle Button
    $btn = New-Object System.Windows.Forms.Button
    $btn.Name = "btn_toggle"
    $btn.Location = New-Object System.Drawing.Point(510, 4)
    $btn.Size = New-Object System.Drawing.Size(75, 28)
    $btn.FlatStyle = "Flat"
    $btn.FlatAppearance.BorderSize = 1
    $btn.Font = New-Object System.Drawing.Font("Consolas", 8, [System.Drawing.FontStyle]::Bold)
    $btn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $btn.Add_Click({
        $acct = $this.Tag
        $locked = @(Get-LockedAccounts)
        if ($locked -contains $acct) {
            $locked = @($locked | Where-Object { $_ -ne $acct })
            Set-DBLock $acct $false
        } else {
            $locked += $acct
            Set-DBLock $acct $true
        }
        Save-LockedAccounts $locked
        Update-Display
    })
    $panel.Controls.Add($btn)

    return @{ Panel = $panel; Check = $chk; Button = $btn }
}

# --- Bottom Buttons ---
$bottomY = 465

$btnLockSel = New-Object System.Windows.Forms.Button
$btnLockSel.Text = "Lock Selected"
$btnLockSel.Location = New-Object System.Drawing.Point(15, $bottomY)
$btnLockSel.Size = New-Object System.Drawing.Size(130, 35)
$btnLockSel.FlatStyle = "Flat"
$btnLockSel.BackColor = $btnLock
$btnLockSel.ForeColor = [System.Drawing.Color]::White
$btnLockSel.FlatAppearance.BorderColor = $fgRed
$btnLockSel.Font = New-Object System.Drawing.Font("Consolas", 9, [System.Drawing.FontStyle]::Bold)
$btnLockSel.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnLockSel.Add_Click({
    $locked = @(Get-LockedAccounts)
    for ($i = 0; $i -lt $script:rowChecks.Count; $i++) {
        if ($script:rowChecks[$i].Checked -and $script:rowPanels[$i].Visible) {
            $acct = $script:rowData[$i].account_number.ToString()
            if ($locked -notcontains $acct) {
                $locked += $acct
                Set-DBLock $acct $true
            }
            $script:rowChecks[$i].Checked = $false
        }
    }
    Save-LockedAccounts $locked
    Update-Display
})
$form.Controls.Add($btnLockSel)

$btnLockAll = New-Object System.Windows.Forms.Button
$btnLockAll.Text = "Lock All Filtered"
$btnLockAll.Location = New-Object System.Drawing.Point(155, $bottomY)
$btnLockAll.Size = New-Object System.Drawing.Size(150, 35)
$btnLockAll.FlatStyle = "Flat"
$btnLockAll.BackColor = $btnLock
$btnLockAll.ForeColor = [System.Drawing.Color]::White
$btnLockAll.FlatAppearance.BorderColor = $fgOrange
$btnLockAll.Font = New-Object System.Drawing.Font("Consolas", 9, [System.Drawing.FontStyle]::Bold)
$btnLockAll.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnLockAll.Add_Click({
    $locked = @(Get-LockedAccounts)
    for ($i = 0; $i -lt $script:rowData.Count; $i++) {
        if ($script:rowPanels[$i].Visible) {
            $acct = $script:rowData[$i].account_number.ToString()
            if ($locked -notcontains $acct) {
                $locked += $acct
                Set-DBLock $acct $true
            }
        }
    }
    Save-LockedAccounts $locked
    Update-Display
})
$form.Controls.Add($btnLockAll)

$btnUnlockAll = New-Object System.Windows.Forms.Button
$btnUnlockAll.Text = "Unlock ALL"
$btnUnlockAll.Location = New-Object System.Drawing.Point(560, $bottomY)
$btnUnlockAll.Size = New-Object System.Drawing.Size(130, 35)
$btnUnlockAll.FlatStyle = "Flat"
$btnUnlockAll.BackColor = $btnBg
$btnUnlockAll.ForeColor = $fgGreen
$btnUnlockAll.FlatAppearance.BorderColor = $fgGreen
$btnUnlockAll.Font = New-Object System.Drawing.Font("Consolas", 9, [System.Drawing.FontStyle]::Bold)
$btnUnlockAll.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnUnlockAll.Add_Click({
    # Unlock all in DB
    foreach ($acc in $script:allAccounts) {
        Set-DBLock $acc.account_number.ToString() $false
    }
    Save-LockedAccounts @()
    Update-Display
})
$form.Controls.Add($btnUnlockAll)

# === UPDATE DISPLAY ===
function Update-Display {
    $locked = @(Get-LockedAccounts)

    # Update filter button colors
    foreach ($fb in $filterButtons) {
        if ($fb.Tag -eq $script:currentFilter) {
            $fb.BackColor = $fgBlue
            $fb.ForeColor = $bgDark
            $fb.FlatAppearance.BorderColor = $fgBlue
        } else {
            $fb.BackColor = $btnBg
            $fb.ForeColor = $fgNormal
            $fb.FlatAppearance.BorderColor = $fgDim
        }
    }

    # Hide all group headers first
    foreach ($gh in $script:groupHeaders.Values) { $gh.Visible = $false }

    $yPos = 28
    $lastGroup = ""
    for ($i = 0; $i -lt $script:allAccounts.Count; $i++) {
        $acc = $script:allAccounts[$i]
        $acctStr = $acc.account_number.ToString()
        $isLocked = $locked -contains $acctStr
        $pnl = [double]$acc.floating_pnl
        $aw = [int]$acc.aw_orders

        # Filter
        $show = $true
        switch ($script:currentFilter) {
            "AW"     { $show = ($aw -gt 0) }
            "Losing" { $show = ($pnl -lt 0) }
            "Idle"   { $show = ([int]$acc.open_orders -eq 0) }
            "Locked" { $show = $isLocked }
        }

        if ($i -lt $script:rowPanels.Count) {
            $panel = $script:rowPanels[$i]
            $chk = $script:rowChecks[$i]

            # Group header
            $grp = $acc.pair_group
            if ($show -and $grp -ne $lastGroup) {
                if ($script:groupHeaders.ContainsKey($grp)) {
                    $gh = $script:groupHeaders[$grp]
                    $gh.Location = New-Object System.Drawing.Point(0, $yPos)
                    $gh.Visible = $true
                    $yPos += 22
                }
                $lastGroup = $grp
            }

            # Update labels — use avatar_text (A3, A2) or fallback
            $avatar = $acc.avatar_text
            if ([string]::IsNullOrEmpty($avatar)) { $avatar = $acctStr.Substring($acctStr.Length - 2) }
            $panel.Controls["lbl_name"].Text = $avatar
            $strat = $acc.ea_strategy.ToUpper()
            $panel.Controls["lbl_strat"].Text = $strat
            $panel.Controls["lbl_strat"].ForeColor = $(if ($strat -eq "BUY") { $fgGreen } else { $fgRed })
            $panel.Controls["lbl_acct"].Text = $acctStr
            $panel.Controls["lbl_bal"].Text = "$" + [math]::Round([double]$acc.balance, 0)
            $panel.Controls["lbl_pnl"].Text = $(if ($pnl -ge 0) { "+$" } else { "-$" }) + [math]::Abs([math]::Round($pnl, 1))
            $panel.Controls["lbl_pnl"].ForeColor = $(if ($pnl -ge 0) { $fgGreen } else { $fgRed })
            $panel.Controls["lbl_ord"].Text = $acc.open_orders.ToString()
            $panel.Controls["lbl_aw"].Text = $(if ($aw -gt 0) { "AW$aw" } else { "-" })
            $panel.Controls["lbl_aw"].ForeColor = $(if ($aw -gt 0) { $fgRed } else { $fgDim })

            # Lock status
            if ($isLocked) {
                $panel.Controls["lbl_lock"].Text = "LOCKED"
                $panel.Controls["lbl_lock"].ForeColor = $fgRed
                $panel.Controls["btn_toggle"].Text = "UNLOCK"
                $panel.Controls["btn_toggle"].BackColor = $btnLock
                $panel.Controls["btn_toggle"].ForeColor = [System.Drawing.Color]::White
                $panel.Controls["btn_toggle"].FlatAppearance.BorderColor = $fgRed
            } else {
                $panel.Controls["lbl_lock"].Text = "-"
                $panel.Controls["lbl_lock"].ForeColor = $fgGreen
                $panel.Controls["btn_toggle"].Text = "LOCK"
                $panel.Controls["btn_toggle"].BackColor = $btnUnlock
                $panel.Controls["btn_toggle"].ForeColor = $fgGreen
                $panel.Controls["btn_toggle"].FlatAppearance.BorderColor = $fgGreen
            }
            $panel.Controls["btn_toggle"].Tag = $acctStr

            $panel.Visible = $show
            if ($show) {
                $panel.Location = New-Object System.Drawing.Point(0, $yPos)
                $yPos += 40
            }
        }
    }

    # Status bar
    $lockedCount = ($locked | Where-Object { $_ -ne "" }).Count
    $lblStatus.Text = "Accounts: $($script:allAccounts.Count)  |  Locked: $lockedCount  |  Filter: $($script:currentFilter)"
}

# === LOAD DATA ===
function Load-Data {
    $lblStatus.Text = "Loading..."
    $form.Refresh()

    $data = Fetch-AccountStatus
    if ($null -eq $data) { return }

    # Handle single object (not array)
    if ($data -isnot [array]) { $data = @($data) }
    $script:allAccounts = $data
    $script:rowData = $data

    # Clear old rows and group headers
    foreach ($rp in $script:rowPanels) { $mainPanel.Controls.Remove($rp) }
    foreach ($gh in $script:groupHeaders.Values) { $mainPanel.Controls.Remove($gh) }
    $script:rowPanels = @()
    $script:rowChecks = @()
    $script:groupHeaders = @{}

    # Create group headers
    $groups = @($data | ForEach-Object { $_.pair_group } | Select-Object -Unique)
    foreach ($grp in $groups) {
        $gh = New-Object System.Windows.Forms.Label
        $gh.Text = "  $($grp.ToUpper())"
        $gh.Size = New-Object System.Drawing.Size(700, 20)
        $gh.ForeColor = $fgOrange
        $gh.Font = New-Object System.Drawing.Font("Consolas", 8, [System.Drawing.FontStyle]::Bold)
        $gh.BackColor = [System.Drawing.Color]::FromArgb(40, 40, 55)
        $mainPanel.Controls.Add($gh)
        $script:groupHeaders[$grp] = $gh
    }

    # Create rows
    $yPos = 28
    for ($i = 0; $i -lt $data.Count; $i++) {
        $row = Create-AccountRow $i $yPos
        $mainPanel.Controls.Add($row.Panel)
        $script:rowPanels += $row.Panel
        $script:rowChecks += $row.Check
        $yPos += 40
    }

    Update-Display
}

# --- Events ---
$btnRefresh.Add_Click({ Load-Data })
$form.Add_Shown({ Load-Data })

$form.ShowDialog() | Out-Null
