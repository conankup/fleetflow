<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FleetFlow - ระบบจัดตารางรถยนต์และคนขับ</title>
    
    <!-- Google Fonts & FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
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
                </form>
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
    <script src="app.js"></script>
</body>
</html>
