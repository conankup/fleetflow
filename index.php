<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FleetFlow - ระบบจัดตารางรถยนต์และคนขับ</title>
    
    <!-- Google Fonts & FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="styles.css?v=<?= filemtime('styles.css') ?>">
</head>
<body>

    <div id="app">
        <!-- 1. LOGIN SCREEN CONTAINER -->
        <div id="login-screen" class="login-container" style="display: none;">
            <div class="login-card glass-panel">
                <div class="login-logo">
                    <i class="fa-solid fa-car-side"></i>
                </div>
                <h1 class="login-title">FleetFlow</h1>
                <p class="login-subtitle">ระบบจัดตารางงานและการใช้ยานพาหนะอัจฉริยะ</p>
                
                <!-- Notification Banner -->
                <div id="login-alert" class="alert alert-danger" style="display: none;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span id="login-alert-text">เกิดข้อผิดพลาด</span>
                </div>
                
                <form id="login-form" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label" for="username">ชื่อผู้ใช้งาน</label>
                        <div class="input-container">
                            <input type="text" id="username" class="form-control" placeholder="ระบุ username" required autocomplete="username">
                            <i class="fa-solid fa-user input-icon"></i>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="password">รหัสผ่าน</label>
                        <div class="input-container">
                            <input type="password" id="password" class="form-control" placeholder="ระบุรหัสผ่าน" required autocomplete="current-password">
                            <i class="fa-solid fa-lock input-icon"></i>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block">
                        เข้าสู่ระบบ
                        <i class="fa-solid fa-right-to-bracket"></i>
                    </button>

                    <div style="text-align: center; margin-top: 20px;">
                        <a href="#" onclick="showRegisterForm(event)" class="text-link" style="color: var(--primary); font-size: 13.5px; font-weight: 600; text-decoration: none;">ยังไม่มีบัญชี? สมัครเข้าใช้งาน</a>
                    </div>
                </form>

                <!-- Registration Form Container -->
                <div id="register-form-container" style="display: none;">
                    <h2 class="login-title" style="font-size: 20px; margin-top: 10px; margin-bottom: 20px; text-align: center;">สมัครเข้าใช้งานระบบ</h2>
                    <form id="register-form" onsubmit="handleRegister(event)">
                        <div class="form-group">
                            <label class="form-label" for="reg-username">ชื่อผู้ใช้งาน (Username) *</label>
                            <div class="input-container">
                                <input type="text" id="reg-username" class="form-control" placeholder="พิมพ์ชื่อผู้ใช้สำหรับเข้าระบบ" required autocomplete="username">
                                <i class="fa-solid fa-user input-icon"></i>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="reg-fullname">ชื่อ-นามสกุล *</label>
                            <div class="input-container">
                                <input type="text" id="reg-fullname" class="form-control" placeholder="พิมพ์ชื่อจริงและนามสกุล" required>
                                <i class="fa-solid fa-id-card input-icon"></i>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="reg-password">รหัสผ่าน *</label>
                            <div class="input-container">
                                <input type="password" id="reg-password" class="form-control" placeholder="รหัสผ่านเข้าใช้งาน" required autocomplete="new-password">
                                <i class="fa-solid fa-lock input-icon"></i>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="reg-title">ตำแหน่งงาน</label>
                            <div class="input-container">
                                <input type="text" id="reg-title" class="form-control" placeholder="เช่น เจ้าหน้าที่บริหารงานทั่วไป">
                                <i class="fa-solid fa-briefcase input-icon"></i>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="reg-department">ฝ่าย/แผนกหลัก</label>
                            <select id="reg-department" class="form-control" style="padding-left: 14px;" onchange="handleRegDeptChange()">
                                <option value="">เลือกฝ่าย/แผนก</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="reg-division">กอง/กลุ่มงาน</label>
                            <select id="reg-division" class="form-control" style="padding-left: 14px;">
                                <option value="">เลือกกอง/กลุ่มงาน</option>
                            </select>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block">
                            ส่งข้อมูลสมัครใช้งาน
                            <i class="fa-solid fa-user-plus"></i>
                        </button>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            <a href="#" onclick="showLoginForm(event)" class="text-link" style="color: var(--text-secondary); font-size: 13.5px; font-weight: 600; text-decoration: none;">ย้อนกลับหน้าเข้าสู่ระบบ</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- 2. MAIN DASHBOARD LAYOUT CONTAINER -->
        <div id="dashboard-screen" class="dashboard-layout" style="display: none;">
            <!-- Sidebar -->
            <aside class="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-logo">
                        <i class="fa-solid fa-car-side"></i>
                    </div>
                    <span class="sidebar-brand">FleetFlow</span>
                </div>
                
                <nav class="sidebar-nav">
                    <div class="nav-item active" onclick="switchView('dashboard', this)" id="nav-dashboard">
                        <i class="fa-solid fa-chart-pie"></i>
                        <span>แดชบอร์ดหลัก</span>
                    </div>
                    <div class="nav-item" onclick="switchView('calendar', this)" id="nav-calendar">
                        <i class="fa-solid fa-calendar-days"></i>
                        <span>ปฏิทิน & ค้นหาตาราง</span>
                    </div>
                    <div class="nav-item" onclick="switchView('bookings', this)" id="nav-bookings">
                        <i class="fa-solid fa-clipboard-list"></i>
                        <span>รายการขอใช้รถ</span>
                    </div>
                    <div class="nav-item" onclick="switchView('routine', this)" id="nav-routine">
                        <i class="fa-solid fa-repeat"></i>
                        <span>ตั้งค่าตารางงานประจำ</span>
                    </div>
                    <div class="nav-item" onclick="switchView('vehicles', this)" id="nav-vehicles">
                        <i class="fa-solid fa-car"></i>
                        <span>จัดการยานพาหนะ</span>
                    </div>
                    <div class="nav-item" onclick="switchView('drivers', this)" id="nav-drivers">
                        <i class="fa-solid fa-user-tie"></i>
                        <span>จัดการคนขับรถ</span>
                    </div>
                    <div class="nav-item" onclick="switchView('org', this)" id="nav-org">
                        <i class="fa-solid fa-sitemap"></i>
                        <span>ผังองค์กร & สิทธิ์ผู้ใช้</span>
                    </div>
                    <div class="nav-item" onclick="switchView('guide', this)" id="nav-guide">
                        <i class="fa-solid fa-circle-question"></i>
                        <span>คู่มือ & Workflow</span>
                    </div>
                </nav>
                
                <div class="sidebar-footer">
                    <div class="user-profile">
                        <div class="user-avatar" id="profile-avatar">A</div>
                        <div class="user-info">
                            <div class="user-name" id="profile-name">กำลังโหลด...</div>
                            <div class="user-role" id="profile-dept">ฝ่ายงานของท่าน</div>
                        </div>
                    </div>
                    <div id="profile-sys-list" class="active-systems">
                        <!-- Loaded dynamically -->
                    </div>
                    <button class="btn btn-secondary btn-block btn-sm" onclick="handleLogout()" style="margin-top: 16px;">
                        ออกจากระบบ
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </aside>

            <!-- Main Workspace -->
            <div class="main-wrapper">
                <!-- Topbar Header -->
                <header class="topbar">
                    <h2 class="page-title" id="current-page-title">แดชบอร์ดสรุปผล</h2>
                    <div class="topbar-actions">
                        <span class="system-badge">
                            <i class="fa-solid fa-circle-check"></i>
                            กำลังใช้งาน: FleetFlow
                        </span>
                        <!-- Theme toggle button -->
                        <button id="theme-toggle" class="btn btn-secondary btn-sm" title="สลับโหมดธีม" onclick="toggleTheme()">
                            <i class="fa-solid fa-moon"></i>
                        </button>
                    </div>
                </header>

                <!-- Dynamic View Panel -->
                <main class="content-body" id="main-content">
                    <!-- Dashboard widgets and other pages loaded here -->
                </main>
            </div>
        </div>
    </div>

    <!-- Global Modal Overlay -->
    <div id="global-modal" class="modal-overlay">
        <div class="modal-content glass-panel">
            <div class="modal-header">
                <h3 class="modal-title" id="modal-title">หัวข้อหน้าต่าง</h3>
                <button class="modal-close" onclick="closeGlobalModal()">&times;</button>
            </div>
            <div class="modal-body" id="modal-body">
                <!-- เนื้อหาฟอร์มจะถูกแทรกแบบไดนามิกด้วย JS -->
            </div>
        </div>
    </div>

    <!-- Application Script -->
    <script src="app.js?v=<?= filemtime('app.js') ?>"></script>
</body>
</html>
