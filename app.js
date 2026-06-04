// app.js - Frontend application controller for FleetFlow

// Global Application State
let currentUser = null;
let currentView = 'dashboard';
let calendarDate = new Date();
let calendarVehicles = [];
let calendarDrivers = [];
let calendarBookings = [];
let calendarSelectedDateStr = '';

function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const current = document.body.getAttribute('data-theme') || 'dark';
    btn.innerHTML = `<i class="fa-solid ${current === 'dark' ? 'fa-moon' : 'fa-sun'}"></i>`;
}

// Call updateThemeIcon on load and after toggle
function applySavedTheme() {
    const saved = localStorage.getItem('theme');
    const theme = saved === 'dark' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', theme);
    updateThemeIcon();
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    checkSession();
});

// Toggle theme between dark and light and update icon
function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
}

// Helper: Make API request using Fetch
async function apiFetch(action, method = 'POST', body = null) {
    const url = `api.php?action=${action}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("API Fetch Error:", error);
        return { status: 'error', message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้: ' + error.message };
    }
}

// Session Check
async function checkSession() {
    const res = await apiFetch('check_session', 'GET');
    if (res.status === 'success' && res.logged_in) {
        currentUser = res.user;
        setupUserProfile();
        showDashboardScreen();
    } else {
        showLoginScreen();
    }
}

// Handle Login form submit
async function handleLogin(event) {
    event.preventDefault();
    const alertBanner = document.getElementById('login-alert');
    const alertText = document.getElementById('login-alert-text');
    alertBanner.style.display = 'none';
    
    const usernameVal = document.getElementById('username').value.trim();
    const passwordVal = document.getElementById('password').value;
    
    const res = await apiFetch('login', 'POST', {
        username: usernameVal,
        password: passwordVal
    });
    
    if (res.status === 'success') {
        currentUser = res.user;
        setupUserProfile();
        showDashboardScreen();
    } else {
        alertText.textContent = res.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        alertBanner.style.display = 'flex';
    }
}

// Global Org Data variable for registration filtering
let registrationOrgData = { departments: [], divisions: [] };

// Show registration form
async function showRegisterForm(event) {
    if (event) event.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form-container').style.display = 'block';
    
    // Clear registration fields
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-fullname').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-title').value = '';
    document.getElementById('reg-department').value = '';
    document.getElementById('reg-division').value = '';
    
    // Load departments & divisions
    const res = await apiFetch('get_public_org_data', 'GET');
    if (res.status === 'success') {
        registrationOrgData = res;
        populateRegDepartments();
    } else {
        console.error("Failed to load organization data for registration:", res.message);
    }
}

// Show login form
function showLoginForm(event) {
    if (event) event.preventDefault();
    document.getElementById('register-form-container').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('login-alert').style.display = 'none';
}

// Populate departments dropdown in registration
function populateRegDepartments() {
    const deptSelect = document.getElementById('reg-department');
    deptSelect.innerHTML = '<option value="">เลือกฝ่าย/แผนก</option>';
    
    registrationOrgData.departments.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept.id;
        opt.textContent = dept.name;
        deptSelect.appendChild(opt);
    });
    
    // Reset divisions dropdown
    const divSelect = document.getElementById('reg-division');
    divSelect.innerHTML = '<option value="">เลือกกอง/กลุ่มงาน</option>';
}

// Populate divisions dropdown based on selected department
function handleRegDeptChange() {
    const deptId = parseInt(document.getElementById('reg-department').value);
    const divSelect = document.getElementById('reg-division');
    divSelect.innerHTML = '<option value="">เลือกกอง/กลุ่มงาน</option>';
    
    if (isNaN(deptId)) return;
    
    const filteredDivs = registrationOrgData.divisions.filter(d => parseInt(d.department_id) === deptId);
    filteredDivs.forEach(div => {
        const opt = document.createElement('option');
        opt.value = div.id;
        opt.textContent = div.name;
        divSelect.appendChild(opt);
    });
}

// Handle registration form submit
async function handleRegister(event) {
    event.preventDefault();
    const alertBanner = document.getElementById('login-alert');
    const alertText = document.getElementById('login-alert-text');
    alertBanner.style.display = 'none';
    
    const username = document.getElementById('reg-username').value.trim();
    const fullname = document.getElementById('reg-fullname').value.trim();
    const password = document.getElementById('reg-password').value;
    const title = document.getElementById('reg-title').value.trim();
    const department_id = document.getElementById('reg-department').value;
    const division_id = document.getElementById('reg-division').value;
    
    const res = await apiFetch('register', 'POST', {
        username,
        fullname,
        password,
        title,
        department_id,
        division_id
    });
    
    if (res.status === 'success') {
        alert(res.message);
        showLoginForm();
    } else {
        alertText.textContent = res.message || 'การสมัครสมาชิกผิดพลาด';
        alertBanner.style.display = 'flex';
        // Scroll to top of login screen to see the alert banner
        document.getElementById('login-screen').scrollTop = 0;
    }
}

// Handle Logout
async function handleLogout() {
    const res = await apiFetch('logout', 'GET');
    if (res.status === 'success') {
        currentUser = null;
        showLoginScreen();
    } else {
        alert("ออกจากระบบไม่สำเร็จ");
    }
}

// UI State Switcher: Show Login Screen
function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-alert').style.display = 'none';
}

// UI State Switcher: Show Dashboard Screen
function showDashboardScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'flex';
    
    // Default to load dashboard view
    const defaultNav = document.getElementById('nav-dashboard');
    switchView('dashboard', defaultNav);
}

// Setup User Profile details in Sidebar
function setupUserProfile() {
    if (!currentUser) return;
    
    // Set Profile Text
    document.getElementById('profile-name').textContent = currentUser.fullname;
    
    const deptParts = [];
    if (currentUser.title) deptParts.push(currentUser.title);
    if (currentUser.division) {
        deptParts.push(currentUser.division);
    } else if (currentUser.department) {
        deptParts.push(currentUser.department);
    }
    document.getElementById('profile-dept').textContent = deptParts.join(' / ') || 'ผู้ใช้งานทั่วไป';
    
    // Avatar Letter
    const firstLetter = currentUser.fullname ? currentUser.fullname.trim().charAt(0) : 'U';
    document.getElementById('profile-avatar').textContent = firstLetter;
    
    // Render system access tags
    const sysContainer = document.getElementById('profile-sys-list');
    sysContainer.innerHTML = '';
    if (currentUser.systems && currentUser.systems.length > 0) {
        currentUser.systems.forEach(sys => {
            const tag = document.createElement('span');
            tag.className = `sys-tag ${sys === 'fleetflow' ? 'active' : ''}`;
            tag.innerHTML = `<i class="fa-solid fa-square-check" style="margin-right: 4px;"></i>${sys}`;
            sysContainer.appendChild(tag);
        });
    }
}

// Switch Sidebar menu views
function switchView(viewName, element) {
    currentView = viewName;
    
    // Update sidebar navigation active states
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    if (element) {
        element.classList.add('active');
    }
    
    // Update Page Header Title
    const pageTitle = document.getElementById('current-page-title');
    const mainContent = document.getElementById('main-content');
    
    switch (viewName) {
        case 'dashboard':
            pageTitle.textContent = 'แดชบอร์ดสรุปผล';
            loadDashboardView(mainContent);
            break;
        case 'calendar':
            pageTitle.textContent = 'ปฏิทินและตารางจัดคิวงาน';
            loadCalendarView(mainContent);
            break;
        case 'bookings':
            pageTitle.textContent = 'รายการจองและการอนุมัติรถ';
            loadBookingsView(mainContent);
            break;
        case 'routine':
            pageTitle.textContent = 'ตั้งค่าตารางงานประจำล่วงหน้า';
            loadRoutineTemplatesView(mainContent);
            break;
        case 'vehicles':
            pageTitle.textContent = 'จัดการข้อมูลยานพาหนะหลัก';
            loadVehiclesView(mainContent);
            break;
        case 'drivers':
            pageTitle.textContent = 'จัดการข้อมูลพนักงานขับรถหลัก';
            loadDriversView(mainContent);
            break;
        case 'org':
            pageTitle.textContent = 'ผังโครงสร้างองค์กรและสิทธิ์เข้าใช้ระบบ';
            loadOrgView(mainContent);
            break;
        case 'guide':
            pageTitle.textContent = 'คู่มือการใช้งานและ Flow การทำงาน';
            loadGuideView(mainContent);
            break;
        default:
            pageTitle.textContent = 'หน้ากระดาษว่างเปล่า';
            mainContent.innerHTML = '<p class="text-secondary">กำลังปรับปรุงหน้านี้</p>';
    }
}

// Function to load the Interactive Guide View
function loadGuideView(container) {
    container.innerHTML = `
        <style>
            .guide-wrapper {
                animation: fadeIn var(--transition-normal);
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
            .guide-tabs {
                display: flex;
                gap: 8px;
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 12px;
                flex-wrap: wrap;
            }
            .guide-tab-btn {
                background: transparent;
                border: none;
                color: var(--text-secondary);
                padding: 10px 18px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                border-radius: 8px;
                transition: var(--transition-fast);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .guide-tab-btn:hover {
                background: var(--nav-hover-bg);
                color: var(--text-primary);
            }
            .guide-tab-btn.active {
                background: var(--primary-glow);
                color: var(--primary);
            }
            .guide-pane {
                display: none;
                animation: fadeIn var(--transition-normal);
            }
            .guide-pane.active {
                display: block;
            }
            
            /* Flowchart Styles */
            .flow-container {
                display: flex;
                flex-direction: column;
                gap: 16px;
                position: relative;
                max-width: 900px;
                margin: 0 auto;
                padding: 10px 0;
            }
            .flow-step {
                display: grid;
                grid-template-columns: 80px 1fr;
                gap: 24px;
                position: relative;
            }
            .flow-step::before {
                content: '';
                position: absolute;
                top: 50px;
                left: 40px;
                width: 2px;
                height: calc(100% + 16px);
                background: var(--border-color);
                z-index: 1;
            }
            .flow-step:last-child::before {
                display: none;
            }
            .flow-node {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                z-index: 2;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border: 2px solid;
                background: var(--bg-card);
                transition: var(--transition-normal);
            }
            .flow-step:hover .flow-node {
                transform: scale(1.08);
            }
            .node-request { color: #3b82f6; border-color: #3b82f6; box-shadow: 0 0 15px rgba(59,130,246,0.15); }
            .node-approve { color: #8b5cf6; border-color: #8b5cf6; box-shadow: 0 0 15px rgba(139,92,246,0.15); }
            .node-travel { color: #10b981; border-color: #10b981; box-shadow: 0 0 15px rgba(16,185,129,0.15); }
            .node-complete { color: #06b6d4; border-color: #06b6d4; box-shadow: 0 0 15px rgba(6,182,212,0.15); }
            
            .flow-card {
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
                transition: var(--transition-normal);
            }
            .flow-step:hover .flow-card {
                border-color: var(--primary);
                box-shadow: 0 10px 20px rgba(0,0,0,0.05);
            }
            .flow-title {
                font-size: 16px;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .flow-actor {
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 4px;
                font-weight: 700;
                text-transform: uppercase;
            }
            .actor-staff { background: rgba(59,130,246,0.1); color: #3b82f6; }
            .actor-admin { background: rgba(139,92,246,0.1); color: #8b5cf6; }
            .actor-driver { background: rgba(16,185,129,0.1); color: #10b981; }
            
            /* Role Cards Grid */
            .role-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 24px;
            }
            .role-card {
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 16px;
                padding: 24px;
                border-top: 5px solid;
                transition: var(--transition-normal);
            }
            .role-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 24px rgba(0,0,0,0.05);
            }
            .role-staff { border-top-color: #3b82f6; }
            .role-driver { border-top-color: #10b981; }
            .role-admin { border-top-color: #8b5cf6; }
            
            .role-header {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
                color: var(--text-primary);
            }
            .role-list {
                list-style: none;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .role-list li {
                font-size: 13px;
                color: var(--text-secondary);
                display: flex;
                align-items: flex-start;
                gap: 8px;
                line-height: 1.5;
            }
            .role-list li i {
                margin-top: 4px;
                font-size: 12px;
            }
            .role-staff i { color: #3b82f6; }
            .role-driver i { color: #10b981; }
            .role-admin i { color: #8b5cf6; }

            /* Manual Details */
            .manual-section {
                margin-bottom: 32px;
            }
            .manual-title {
                font-size: 18px;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .manual-steps {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .manual-step-item {
                background: rgba(255,255,255,0.01);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 16px;
                display: flex;
                gap: 16px;
            }
            .step-number {
                width: 32px;
                height: 32px;
                background: var(--nav-hover-bg);
                color: var(--text-primary);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 14px;
                flex-shrink: 0;
            }
            .step-details h5 {
                font-size: 14px;
                font-weight: 700;
                margin-bottom: 4px;
                color: var(--text-primary);
            }
            .step-details p {
                font-size: 13px;
                color: var(--text-secondary);
                line-height: 1.5;
                margin: 0;
            }
        </style>

        <div class="guide-wrapper">
            <div class="guide-tabs">
                <button class="guide-tab-btn active" onclick="switchGuideTab('flow', this)">
                    <i class="fa-solid fa-sitemap"></i> แผนภาพ Workflow การทำงาน
                </button>
                <button class="guide-tab-btn" onclick="switchGuideTab('roles', this)">
                    <i class="fa-solid fa-users"></i> คำแนะนำตามบทบาท (Roles)
                </button>
                <button class="guide-tab-btn" onclick="switchGuideTab('manual', this)">
                    <i class="fa-solid fa-book-open"></i> คู่มือขั้นตอนการใช้งาน
                </button>
            </div>

            <!-- Tab 1: Flowchart -->
            <div id="pane-flow" class="guide-pane active">
                <div class="glass-panel" style="padding: 24px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h3 style="margin-bottom: 8px;">วงจรชีวิตของรายการขอใช้รถ (Booking Lifecycle)</h3>
                        <p class="text-secondary" style="font-size: 14px;">แผนภาพกระบวนการจองรถ จัดสรรคนขับ และอนุมัติเดินทางภายในระบบ FleetFlow</p>
                    </div>

                    <div class="flow-container">
                        <!-- Step 1 -->
                        <div class="flow-step">
                            <div class="flow-node node-request">
                                <i class="fa-solid fa-file-signature"></i>
                            </div>
                            <div class="flow-card">
                                <div class="flow-title">
                                    <span>ขั้นตอนที่ 1: สร้างรายการขอใช้ยานพาหนะ (Booking Request)</span>
                                    <span class="flow-actor actor-staff">Staff / User</span>
                                </div>
                                <p class="text-secondary" style="font-size: 13px; line-height: 1.5; margin: 0;">
                                    ผู้ใช้งานกรอกแบบฟอร์มขอใช้รถ ระบุผู้เดินทาง, วันเวลา, ปลายทาง และวัตถุประสงค์ในการขอใช้รถยนต์ โดยคำขอดังกล่าวจะมีสถานะเริ่มต้นเป็น <strong>"รออนุมัติ" (pending_admin)</strong> และยังไม่ระบุตัวรถยนต์หรือพนักงานขับรถ
                                </p>
                            </div>
                        </div>

                        <!-- Step 2 -->
                        <div class="flow-step">
                            <div class="flow-node node-approve">
                                <i class="fa-solid fa-user-check"></i>
                            </div>
                            <div class="flow-card">
                                <div class="flow-title">
                                    <span>ขั้นตอนที่ 2: อนุมัติและจัดสรรทรัพยากร (Approve & Allocate)</span>
                                    <span class="flow-actor actor-admin">Admin</span>
                                </div>
                                <p class="text-secondary" style="font-size: 13px; line-height: 1.5; margin: 0;">
                                    ผู้ควบคุมระบบตรวจสอบคำขอใช้รถและเช็คตารางว่างผ่านปฏิทินคิวงาน ทำการอนุมัติใบคำขอและเลือกจัดสรรยานพาหนะ (Vehicle) และพนักงานขับรถ (Driver) ที่ว่างตรงกับวันเวลานั้นๆ รายการจองจะเปลี่ยนเป็นสถานะ <strong>"อนุมัติแล้ว" (approved)</strong> ผู้ใช้งานสามารถดาวน์โหลดหรือสั่งพิมพ์เอกสารขอใช้รถอย่างเป็นทางการ (TH-Sarabun) ได้ทันที
                                </p>
                            </div>
                        </div>

                        <!-- Step 3 -->
                        <div class="flow-step">
                            <div class="flow-node node-travel">
                                <i class="fa-solid fa-road"></i>
                            </div>
                            <div class="flow-card">
                                <div class="flow-title">
                                    <span>ขั้นตอนที่ 3: เริ่มออกเดินทางและบันทึกทริป (Execute Trip)</span>
                                    <span class="flow-actor actor-driver">Driver / Staff</span>
                                </div>
                                <p class="text-secondary" style="font-size: 13px; line-height: 1.5; margin: 0;">
                                    เมื่อถึงเวลากำหนดเดินทาง พนักงานขับรถหรือผู้ขอใช้รถจะกดเปลี่ยนสถานะเดินทางเป็น <strong>"กำลังเดินทาง" (driving)</strong> และบันทึก <strong>"เลขไมล์เริ่มต้น" (Start Mileage)</strong> ของรถยนต์คันนั้นเข้าสู่ระบบเพื่อเริ่มตรวจสอบการใช้งานน้ำมันและยานพาหนะ
                                </p>
                            </div>
                        </div>

                        <!-- Step 4 -->
                        <div class="flow-step">
                            <div class="flow-node node-complete">
                                <i class="fa-solid fa-flag-checkered"></i>
                            </div>
                            <div class="flow-card">
                                <div class="flow-title">
                                    <span>ขั้นตอนที่ 4: เสร็จสิ้นการเดินทางและปิดทริป (Complete Trip)</span>
                                    <span class="flow-actor actor-driver">Driver / Staff</span>
                                </div>
                                <p class="text-secondary" style="font-size: 13px; line-height: 1.5; margin: 0;">
                                    เมื่อสิ้นสุดภารกิจเดินทางกลับถึงจุดหมาย พนักงานขับรถจะดำเนินการปิดงานโดยกรอก <strong>"เลขไมล์สิ้นสุด" (End Mileage)</strong> ของยานพาหนะเข้าสู่ระบบ เพื่อตรวจสอบระยะทางรวมที่ใช้งาน ระบบจะทำการเปลี่ยนสถานะรายการจองเป็น <strong>"ทริปเสร็จสิ้น" (completed)</strong> เพื่อเคลียร์สถานะรถยนต์และคนขับให้ว่างสำหรับคิวงานถัดไป
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab 2: User Roles -->
            <div id="pane-roles" class="guide-pane">
                <div class="role-grid">
                    <!-- Staff -->
                    <div class="role-card role-staff">
                        <div class="role-header">
                            <i class="fa-solid fa-user-gear"></i>
                            <span>ผู้ใช้งานทั่วไป (Staff)</span>
                        </div>
                        <ul class="role-list">
                            <li><i class="fa-solid fa-square-check"></i> <div><strong>ยื่นจองรถใหม่:</strong> สามารถส่งแบบฟอร์มขอใช้รถ (Ad-hoc) ระบุผู้ใช้, ปลายทาง, และจุดประสงค์</div></li>
                            <li><i class="fa-solid fa-square-check"></i> <div><strong>พิมพ์ใบยานพาหนะ:</strong> สั่งพิมพ์แบบฟอร์มขอใช้รถในรูปแบบฟอนต์ TH-Sarabun เมื่อได้รับการอนุมัติ</div></li>
                            <li><i class="fa-solid fa-square-check"></i> <div><strong>ตรวจสอบคิวงาน:</strong> ดูปฏิทินงานรวมประจำวัน/เดือน เพื่อตรวจสอบวันเวลาใช้รถที่ว่างอยู่</div></li>
                        </ul>
                    </div>

                    <!-- Driver -->
                    <div class="role-card role-driver">
                        <div class="role-header">
                            <i class="fa-solid fa-user-tie"></i>
                            <span>คนขับรถ (Driver)</span>
                        </div>
                        <ul class="role-list">
                            <li><i class="fa-solid fa-square-check"></i> <div><strong>ตรวจสอบภารกิจ:</strong> ดูตารางคิวงานเดินทางประจำวันของตนเองเพื่อเตรียมความพร้อม</div></li>
                            <li><i class="fa-solid fa-square-check"></i> <div><strong>บันทึกประวัติการเดินรถ:</strong> บันทึกเลขไมล์เริ่มต้นและสิ้นสุดของทริปที่ได้รับมอบหมาย</div></li>
                            <li><i class="fa-solid fa-square-check"></i> <div><strong>ปรับปรุงสถานะทริป:</strong> อัปเดตสถานะการเดินรถ (Driving -> Arrived -> Completed) ในระบบ</div></li>
                        </ul>
                    </div>

                    <!-- Admin -->
                    <div class="role-card role-admin">
                        <div class="role-header">
                            <i class="fa-solid fa-user-shield"></i>
                            <span>ผู้ควบคุมระบบ (Admin)</span>
                        </div>
                        <ul class="role-list">
                            <li><i class="fa-solid fa-square-check"></i> <div><strong>อนุมัติ & จัดสรรงาน:</strong> ตรวจสอบรายการขอใช้รถ, เลือกจับคู่รถยนต์และคนขับที่ว่างในตาราง</div></li>
                            <li><i class="fa-solid fa-square-check"></i> <div><strong>สร้างตารางงานประจำ:</strong> ตั้งค่าแม่แบบงานประจำสัปดาห์ (Routine Templates) และสั่งสร้างตารางล่วงหน้าอัตโนมัติ</div></li>
                            <li><i class="fa-solid fa-square-check"></i> <div><strong>จัดการข้อมูลกลาง:</strong> จัดการฐานข้อมูลยานพาหนะ, พนักงานขับรถ, โครงสร้างองค์กร และสิทธิ์ผู้ใช้งาน</div></li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Tab 3: Detailed Manual -->
            <div id="pane-manual" class="guide-pane">
                <div class="glass-panel" style="padding: 24px;">
                    
                    <!-- Section 1 -->
                    <div class="manual-section">
                        <div class="manual-title">
                            <i class="fa-solid fa-circle-play" style="color: #3b82f6;"></i>
                            <span>วิธีการจองยานพาหนะเฉพาะกิจ (Ad-hoc Booking)</span>
                        </div>
                        <div class="manual-steps">
                            <div class="manual-step-item">
                                <div class="step-number">1</div>
                                <div class="step-details">
                                    <h5>เปิดหน้ารายการขอใช้รถ</h5>
                                    <p>เข้าสู่ระบบและกดปุ่มเมนู <strong>"รายการขอใช้รถ"</strong> ในแถบด้านซ้าย เพื่อดูคิวงานเดิมหรือสร้างรายการใหม่</p>
                                </div>
                            </div>
                            <div class="manual-step-item">
                                <div class="step-number">2</div>
                                <div class="step-details">
                                    <h5>คลิก "เพิ่มรายการจองใหม่"</h5>
                                    <p>กดปุ่ม <strong>"ยื่นคำขอจองใช้รถ"</strong> ระบบจะแสดงฟอร์มจองแบบ Pop-up ให้กรอกข้อมูลการเดินทาง</p>
                                </div>
                            </div>
                            <div class="manual-step-item">
                                <div class="step-number">3</div>
                                <div class="step-details">
                                    <h5>กรอกรายละเอียดการเดินทาง</h5>
                                    <p>ระบุชื่อผู้ประสานงาน/แผนก, จุดหมายปลายทาง, จำนวนผู้โดยสาร, และความประสงค์ใช้น้ำมันหรือคนขับ จากนั้นกด <strong>"บันทึกคำขอ"</strong></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 2 -->
                    <div class="manual-section">
                        <div class="manual-title">
                            <i class="fa-solid fa-calendar-check" style="color: #8b5cf6;"></i>
                            <span>การจัดสรรคิวงานและอนุมัติ (สำหรับ Admin เท่านั้น)</span>
                        </div>
                        <div class="manual-steps">
                            <div class="manual-step-item">
                                <div class="step-number">1</div>
                                <div class="step-details">
                                    <h5>เปิดหน้าการขอใช้รถและเลือกรายการ</h5>
                                    <p>เข้าไปที่เมนู <strong>"รายการขอใช้รถ"</strong> และค้นหารายการที่สถานะเป็น <strong>"รออนุมัติ"</strong> จากนั้นคลิกปุ่ม <strong>"อนุมัติ/จัดคิว"</strong></p>
                                </div>
                            </div>
                            <div class="manual-step-item">
                                <div class="step-number">2</div>
                                <div class="step-details">
                                    <h5>จัดรถยนต์และคนขับที่มีสถานะ "ว่าง"</h5>
                                    <p>ระบบจะดึงยานพาหนะและคนขับรถที่ว่างในช่วงวันเวลานั้นมาให้เลือก จับคู่ทรัพยากรลงในแบบฟอร์มคำขอ</p>
                                </div>
                            </div>
                            <div class="manual-step-item">
                                <div class="step-number">3</div>
                                <div class="step-details">
                                    <h5>กดอนุมัติการจองและสั่งพิมพ์</h5>
                                    <p>บันทึกข้อมูลเพื่อทำการอนุมัติ (สถานะจะเปลี่ยนเป็น <strong>"อนุมัติแล้ว"</strong>) และพนักงานสามารถคลิก <strong>"พิมพ์ใบยานพาหนะ"</strong> เพื่อออกเอกสารเป็นทางการ</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 3 -->
                    <div class="manual-section" style="margin-bottom: 0;">
                        <div class="manual-title">
                            <i class="fa-solid fa-repeat" style="color: #10b981;"></i>
                            <span>การใช้งานตารางงานประจำล่วงหน้า (Routine Schedules)</span>
                        </div>
                        <div class="manual-steps">
                            <div class="manual-step-item">
                                <div class="step-number">1</div>
                                <div class="step-details">
                                    <h5>ตั้งค่าแม่แบบตารางงานประจำ (Routine Templates)</h5>
                                    <p>ไปที่เมนู <strong>"ตั้งค่าตารางงานประจำ"</strong> บันทึกงานที่ทำซ้ำๆ ทุกวันหรือสัปดาห์ (เช่น ทริปรับส่งเอกสารด่วนทุกวันจันทร์) ระบุประเภทรถที่ต้องการ</p>
                                </div>
                            </div>
                            <div class="manual-step-item">
                                <div class="step-number">2</div>
                                <div class="step-details">
                                    <h5>ใช้ระบบสร้างคิวล่วงหน้ารายสัปดาห์ (Weekly Schedule Generator)</h5>
                                    <p>ที่ด้านขวาของหน้าจอเลือกปีและสัปดาห์ที่ต้องการจัดสรรคิวงานล่วงหน้า จากนั้นกดปุ่ม <strong>"เริ่มสร้างตารางงานประจำสัปดาห์นี้"</strong></p>
                                </div>
                            </div>
                            <div class="manual-step-item">
                                <div class="step-number">3</div>
                                <div class="step-details">
                                    <h5>ตรวจเช็คคิวงานประจำบนปฏิทิน</h5>
                                    <p>ระบบจะนำแม่แบบทั้งหมดมาคำนวณและสร้างเป็นใบจองรถอัตโนมัติ พร้อมตรวจเช็ครถ/คนขับที่เหมาะสมและลงบันทึกในตารางทันที</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;
}

// Handler to switch tabs inside the interactive Guide view
window.switchGuideTab = function(tabId, btn) {
    const panes = document.querySelectorAll('.guide-pane');
    panes.forEach(pane => pane.classList.remove('active'));
    
    const btns = document.querySelectorAll('.guide-tab-btn');
    btns.forEach(b => b.classList.remove('active'));
    
    document.getElementById(`pane-${tabId}`).classList.add('active');
    btn.classList.add('active');
}


// --- DUMMY PLACEHOLDERS FOR DYNAMIC VIEWS ---
// We will replace these functions as we code each feature.
function loadDashboardView(container) {
    const userName = currentUser ? currentUser.fullname : 'ผู้ใช้งาน';
    const userRole = currentUser ? currentUser.role : 'staff';
    const thaiMonthsShort = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const now = new Date();
    const thaiNow = `${now.getDate()} ${thaiMonthsShort[now.getMonth()]} ${now.getFullYear()+543}`;

    container.innerHTML = `
    <style>
        .dash-grid { display: grid; gap: 16px; }
        .kpi-row { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
        .chart-row-2 { grid-template-columns: 2fr 1fr; }
        .chart-row-3 { grid-template-columns: 1fr 1fr 1fr; }
        @media(max-width:1100px){ .chart-row-2,.chart-row-3{ grid-template-columns:1fr; } }

        .dash-banner {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            border-radius: 16px; padding: 22px 26px;
            color: #fff; display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 20px; position: relative; overflow: hidden;
        }
        .dash-banner::after {
            content: '🚗'; position: absolute; right: 24px; top: 50%;
            transform: translateY(-50%); font-size: 64px; opacity: 0.12; pointer-events: none;
        }
        .dash-banner-title { font-size: 20px; font-weight: 800; font-family: var(--font-heading); margin-bottom: 3px; }
        .dash-banner-sub { font-size: 13px; opacity: 0.85; }
        .dash-banner-date { font-size: 12px; opacity: 0.7; margin-top: 5px; }
        .dash-banner-actions { display: flex; gap: 10px; z-index:1; }
        .banner-pill {
            padding: 8px 18px; border-radius: 10px; font-size: 13px; font-weight: 700;
            cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;
            transition: var(--transition-fast);
        }
        .banner-pill-white { background: #fff; color: var(--primary); border: none; }
        .banner-pill-white:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
        .banner-pill-outline { background: rgba(255,255,255,0.15); color: #fff; border: 1.5px solid rgba(255,255,255,0.4); }
        .banner-pill-outline:hover { background: rgba(255,255,255,0.28); }

        .kpi-card-d {
            background: var(--bg-card); border: 1px solid var(--border-color);
            border-radius: 14px; padding: 18px 16px; position: relative; overflow: hidden;
            transition: var(--transition-normal); cursor: default;
        }
        .kpi-card-d::before {
            content: ''; position: absolute; top:0; left:0; right:0; height:3px; border-radius: 14px 14px 0 0;
        }
        .kpi-card-d:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
        .kpi-card-d.c-primary::before { background: linear-gradient(90deg, var(--primary), var(--primary-light)); }
        .kpi-card-d.c-success::before { background: linear-gradient(90deg, var(--success), #4ade80); }
        .kpi-card-d.c-warning::before { background: linear-gradient(90deg, var(--warning), #fbbf24); }
        .kpi-card-d.c-danger::before  { background: linear-gradient(90deg, var(--danger), #f87171); }
        .kpi-card-d.c-info::before    { background: linear-gradient(90deg, var(--info), #38bdf8); }
        .kpi-card-d.c-teal::before    { background: linear-gradient(90deg, #14b8a6, #5eead4); }
        .kpi-card-d.c-purple::before  { background: linear-gradient(90deg, #8b5cf6, #c084fc); }
        .kpi-card-d.c-orange::before  { background: linear-gradient(90deg, #f97316, #fb923c); }
        .kpi-icon-d {
            width: 38px; height: 38px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; margin-bottom: 10px;
        }
        .kpi-card-d.c-primary .kpi-icon-d { background: rgba(120,80,240,0.12); }
        .kpi-card-d.c-success .kpi-icon-d { background: rgba(40,180,120,0.12); }
        .kpi-card-d.c-warning .kpi-icon-d { background: rgba(230,170,40,0.12); }
        .kpi-card-d.c-danger  .kpi-icon-d { background: rgba(220,60,80,0.12); }
        .kpi-card-d.c-info    .kpi-icon-d { background: rgba(40,160,220,0.12); }
        .kpi-card-d.c-teal    .kpi-icon-d { background: rgba(20,184,166,0.12); }
        .kpi-card-d.c-purple  .kpi-icon-d { background: rgba(139,92,246,0.12); }
        .kpi-card-d.c-orange  .kpi-icon-d { background: rgba(249,115,22,0.12); }
        .kpi-val-d { font-size: 28px; font-weight: 800; font-family: var(--font-heading); line-height:1; margin-bottom: 3px; }
        .kpi-card-d.c-primary .kpi-val-d { color: var(--primary); }
        .kpi-card-d.c-success .kpi-val-d { color: var(--success); }
        .kpi-card-d.c-warning .kpi-val-d { color: var(--warning); }
        .kpi-card-d.c-danger  .kpi-val-d { color: var(--danger); }
        .kpi-card-d.c-info    .kpi-val-d { color: var(--info); }
        .kpi-card-d.c-teal    .kpi-val-d { color: #14b8a6; }
        .kpi-card-d.c-purple  .kpi-val-d { color: #8b5cf6; }
        .kpi-card-d.c-orange  .kpi-val-d { color: #f97316; }
        .kpi-lbl-d { font-size: 12.5px; color: var(--text-secondary); font-weight: 500; }
        .kpi-sub-d { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

        .chart-card-d {
            background: var(--bg-card); border: 1px solid var(--border-color);
            border-radius: 14px; padding: 20px 20px 16px;
        }
        .chart-card-d h4 {
            font-size: 13.5px; font-weight: 700; margin-bottom: 14px;
            color: var(--text-primary); display: flex; align-items: center; gap: 7px;
            font-family: var(--font-heading);
        }

        .dash-table-wrap {
            background: var(--bg-card); border: 1px solid var(--border-color);
            border-radius: 14px; overflow: hidden;
        }
        .dash-table-head {
            padding: 16px 20px; border-bottom: 1px solid var(--border-color);
            display: flex; align-items: center; justify-content: space-between;
        }
        .dash-table-head h4 { font-size: 13.5px; font-weight:700; font-family:var(--font-heading); }
        .dash-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .dash-tbl th {
            background: var(--bg-input); padding: 9px 14px;
            font-size: 11.5px; font-weight: 600; color: var(--text-muted);
            text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap;
        }
        .dash-tbl td { padding: 11px 14px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
        .dash-tbl tr:last-child td { border-bottom: none; }
        .dash-tbl tr:hover td { background: var(--bg-card-hover); }

        .badge-d {
            display: inline-flex; align-items: center; gap: 3px;
            padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap;
        }
        .bd-ok  { background: rgba(40,180,120,0.12); color: #16a34a; }
        .bd-ap  { background: rgba(40,160,220,0.12); color: #0284c7; }
        .bd-wt  { background: rgba(230,170,40,0.12);  color: #d97706; }
        .bd-cx  { background: rgba(220,60,80,0.12);   color: #dc2626; }
        .bd-dy  { background: rgba(20,184,166,0.10);  color: #0f766e; }
        .bd-pv  { background: rgba(249,115,22,0.10);  color: #c2410c; }

        .section-sep { display: flex; align-items: center; gap: 10px; margin: 20px 0 14px; }
        .section-sep-icon { width: 28px; height: 28px; background: linear-gradient(135deg,var(--primary),var(--secondary)); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; }
        .section-sep h3 { font-family: var(--font-heading); font-size: 14.5px; font-weight: 700; }
        .section-sep-line { flex: 1; height: 1px; background: linear-gradient(to right, var(--border-color), transparent); }

        .util-bar-row { padding: 8px 0; border-bottom: 1px solid var(--border-color); }
        .util-bar-row:last-child { border-bottom: none; }
        .util-bar-top { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12.5px; }
        .util-bar-bg { background: var(--bg-input); border-radius: 20px; height: 7px; overflow: hidden; }
        .util-bar-fill { height: 100%; border-radius: 20px; background: linear-gradient(90deg, var(--primary), var(--secondary)); }
        .util-bar-sub { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

        .dest-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-color); }
        .dest-row:last-child { border-bottom: none; }
        .dest-rank { width: 22px; height: 22px; border-radius: 50%; background: var(--bg-input); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--text-muted); flex-shrink: 0; }
        .dest-rank.r1 { background: rgba(234,179,8,0.15); color: #a16207; }
        .dest-rank.r2 { background: rgba(148,163,184,0.15); color: #475569; }
        .dest-rank.r3 { background: rgba(180,120,60,0.15); color: #92400e; }
        .dest-name { font-size: 12.5px; flex:1; }
        .dest-cnt { font-family: var(--font-heading); font-weight: 700; font-size: 14px; color: var(--primary); }

        .dept-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-color); }
        .dept-row:last-child { border-bottom: none; }
        .dept-name { font-size: 12.5px; flex:1; font-weight: 500; }
        .dept-cnt { font-family: var(--font-heading); font-weight: 700; font-size: 14px; color: var(--primary); min-width: 28px; text-align: right; }
        .dept-bar-bg { flex:2; background: var(--bg-input); border-radius: 20px; height: 6px; overflow: hidden; }
        .dept-bar-fill { height: 100%; border-radius: 20px; }

        .legend-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
        .legend-item-d { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-secondary); }
        .legend-dot-d { width: 9px; height: 9px; border-radius: 50%; }

        .dash-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 48px; color: var(--text-muted); font-size: 14px; }
        .spin { animation: spin 1s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>

    <div id="dash-root">
        <!-- Greeting Banner -->
        <div class="dash-banner">
            <div>
                <div class="dash-banner-title">สวัสดี, ${escapeHtml(userName)} 👋</div>
                <div class="dash-banner-sub">ยินดีต้อนรับสู่ภาพรวมระบบบริหารจัดการยานพาหนะ</div>
                <div class="dash-banner-date">📅 ${thaiNow} · กำลังโหลดข้อมูล...</div>
            </div>
            <div class="dash-banner-actions">
                <button class="banner-pill banner-pill-white" onclick="switchView('bookings', document.getElementById('nav-bookings'))">
                    📋 จองรถยนต์
                </button>
                ${userRole === 'admin' ? '<button class="banner-pill banner-pill-outline" onclick="switchView(\'org\', document.getElementById(\'nav-org\'))">⚙️ จัดการระบบ</button>' : ''}
            </div>
        </div>

        <!-- KPI Row -->
        <div class="section-sep">
            <div class="section-sep-icon">📊</div>
            <h3>สถิติภาพรวม</h3>
            <div class="section-sep-line"></div>
        </div>
        <div class="dash-grid kpi-row" id="dash-kpi-row">
            <div class="dash-loading"><span class="spin">⟳</span> กำลังโหลดข้อมูล...</div>
        </div>

        <!-- Trend + Status -->
        <div class="section-sep" style="margin-top:24px;">
            <div class="section-sep-icon">📈</div>
            <h3>แนวโน้มการใช้รถ</h3>
            <div class="section-sep-line"></div>
        </div>
        <div class="dash-grid chart-row-2">
            <div class="chart-card-d">
                <h4>📊 แนวโน้มการจองรายเดือน (6 เดือนล่าสุด)</h4>
                <div style="position:relative;height:240px"><canvas id="d-trend-chart"></canvas></div>
            </div>
            <div class="chart-card-d">
                <h4>🥧 สัดส่วนสถานะการจอง</h4>
                <div style="position:relative;height:200px"><canvas id="d-status-donut"></canvas></div>
                <div class="legend-row" id="d-status-legend"></div>
            </div>
        </div>

        <!-- Trip Type + Dept + Destinations -->
        <div class="section-sep" style="margin-top:4px;">
            <div class="section-sep-icon">🗺️</div>
            <h3>การวิเคราะห์เชิงลึก</h3>
            <div class="section-sep-line"></div>
        </div>
        <div class="dash-grid chart-row-3">
            <div class="chart-card-d">
                <h4>🗺️ ประเภทการเดินทาง</h4>
                <div style="position:relative;height:180px"><canvas id="d-trip-donut"></canvas></div>
                <div class="legend-row" id="d-trip-legend"></div>
            </div>
            <div class="chart-card-d">
                <h4>🏢 การใช้รถแยกตามส่วนงาน</h4>
                <div id="d-dept-list" style="margin-top:6px;"><div class="dash-loading"><span class="spin">⟳</span></div></div>
            </div>
            <div class="chart-card-d">
                <h4>📍 ปลายทางยอดนิยม</h4>
                <div id="d-dest-list" style="margin-top:6px;"><div class="dash-loading"><span class="spin">⟳</span></div></div>
            </div>
        </div>

        <!-- Vehicle utilization -->
        <div class="section-sep" style="margin-top:4px;">
            <div class="section-sep-icon">🚙</div>
            <h3>การใช้งานยานพาหนะ</h3>
            <div class="section-sep-line"></div>
        </div>
        <div class="dash-grid chart-row-2">
            <div class="chart-card-d">
                <h4>📊 จำนวนเที่ยวต่อคัน</h4>
                <div style="position:relative;height:220px"><canvas id="d-veh-bar"></canvas></div>
            </div>
            <div class="chart-card-d">
                <h4>🛣️ ระยะทางสะสมแต่ละคัน</h4>
                <div id="d-veh-util-list" style="margin-top:6px;"><div class="dash-loading"><span class="spin">⟳</span></div></div>
            </div>
        </div>

        <!-- Recent bookings table -->
        <div class="section-sep" style="margin-top:4px;">
            <div class="section-sep-icon">🕐</div>
            <h3>รายการจองล่าสุด</h3>
            <div class="section-sep-line"></div>
        </div>
        <div class="dash-table-wrap">
            <div class="dash-table-head">
                <h4>📋 รายการล่าสุด 8 รายการ</h4>
                <button class="btn btn-secondary btn-sm" onclick="switchView('bookings', document.getElementById('nav-bookings'))">ดูทั้งหมด →</button>
            </div>
            <div style="overflow-x:auto">
                <table class="dash-tbl" id="d-recent-table">
                    <thead><tr>
                        <th>#</th><th>ผู้ขอ/ผู้จอง</th><th>ปลายทาง</th>
                        <th>ประเภท</th><th>วันที่เดินทาง</th>
                        <th>ยานพาหนะ</th><th>พนักงานขับรถ</th><th>สถานะ</th>
                        <th></th>
                    </tr></thead>
                    <tbody id="d-recent-tbody">
                        <tr><td colspan="9" class="dash-loading"><span class="spin">⟳</span> กำลังโหลด...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;

    // Load Chart.js dynamically then render everything
    _dashLoadChartJs().then(() => _dashLoadAllData());
}

function _dashLoadChartJs() {
    if (window.Chart) return Promise.resolve();
    return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';
        s.onload = resolve;
        document.head.appendChild(s);
    });
}

async function _dashLoadAllData() {
    const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

    // Fetch from existing API endpoints in parallel
    const [resBookings, resVehicles, resDrivers] = await Promise.all([
        apiFetch('get_bookings', 'GET'),
        apiFetch('get_vehicles', 'GET'),
        apiFetch('get_drivers',  'GET'),
    ]);

    const bookings = (resBookings.status === 'success' ? resBookings.bookings : []) || [];
    const vehicles = (resVehicles.status === 'success' ? resVehicles.vehicles : []) || [];
    const drivers  = (resDrivers.status  === 'success' ? resDrivers.drivers  : []) || [];

    // ── 1. Compute KPIs ──────────────────────────────────────
    const total     = bookings.length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const approved  = bookings.filter(b => b.status === 'approved').length;
    const pending   = bookings.filter(b => b.status === 'pending_admin').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const dailyT    = bookings.filter(b => b.trip_type === 'daily').length;
    const provinceT = bookings.filter(b => b.trip_type === 'province').length;

    const availVeh   = vehicles.filter(v => v.status === 'available').length;
    const activeDrivers = drivers.filter(d => d.status === 'active').length;

    let kmTotal = 0;
    bookings.forEach(b => {
        if (b.start_mileage && b.end_mileage) kmTotal += (parseInt(b.end_mileage) - parseInt(b.start_mileage));
    });

    // KPI cards render
    const kpiEl = document.getElementById('dash-kpi-row');
    if (kpiEl) {
        const cards = [
            { cls:'c-primary', icon:'📋', val: total,    lbl:'รายการทั้งหมด', sub:'รวมทุกสถานะ' },
            { cls:'c-success', icon:'✅', val: completed, lbl:'เสร็จสิ้น',     sub: total > 0 ? Math.round(completed/total*100)+'% ของทั้งหมด' : '-' },
            { cls:'c-info',    icon:'✔️', val: approved,  lbl:'อนุมัติแล้ว',   sub:'กำลังดำเนินการ' },
            { cls:'c-warning', icon:'⏳', val: pending,   lbl:'รออนุมัติ',     sub:'รอการพิจารณา' },
            { cls:'c-danger',  icon:'❌', val: cancelled, lbl:'ยกเลิก',        sub:'ไม่ดำเนินการ' },
            { cls:'c-teal',    icon:'🚗', val: availVeh,  lbl:'รถว่าง',        sub:`จาก ${vehicles.length} คัน` },
            { cls:'c-purple',  icon:'👨‍✈️', val: activeDrivers, lbl:'พนักงานขับรถ', sub:'พร้อมปฏิบัติงาน' },
            { cls:'c-orange',  icon:'🛣️', val: kmTotal.toLocaleString(), lbl:'ระยะทางรวม (กม.)', sub:'สะสมทั้งหมด' },
        ];
        kpiEl.innerHTML = cards.map(c => `
            <div class="kpi-card-d ${c.cls}">
                <div class="kpi-icon-d">${c.icon}</div>
                <div class="kpi-val-d">${c.val}</div>
                <div class="kpi-lbl-d">${c.lbl}</div>
                <div class="kpi-sub-d">${c.sub}</div>
            </div>`).join('');
    }

    // ── 2. Monthly Trend (last 6 months) ────────────────────
    const monthMap = {};
    const now6 = new Date(); now6.setMonth(now6.getMonth() - 5); now6.setDate(1); now6.setHours(0,0,0,0);
    bookings.forEach(b => {
        const d = new Date(b.created_at || b.start_datetime);
        if (d < now6) return;
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (!monthMap[key]) monthMap[key] = { label: thaiMonths[d.getMonth()] + ' ' + (d.getFullYear()+543), total:0, done:0, cancel:0 };
        monthMap[key].total++;
        if (b.status === 'completed') monthMap[key].done++;
        if (b.status === 'cancelled') monthMap[key].cancel++;
    });
    const sortedMonths = Object.keys(monthMap).sort();
    const trendLabels = sortedMonths.map(k => monthMap[k].label);
    const trendTotal  = sortedMonths.map(k => monthMap[k].total);
    const trendDone   = sortedMonths.map(k => monthMap[k].done);
    const trendCancel = sortedMonths.map(k => monthMap[k].cancel);

    const trendCanvas = document.getElementById('d-trend-chart');
    if (trendCanvas && window.Chart) {
        new Chart(trendCanvas, {
            data: {
                labels: trendLabels,
                datasets: [
                    { type:'bar', label:'ทั้งหมด', data: trendTotal, backgroundColor:'rgba(120,80,240,0.18)', borderColor:'rgba(120,80,240,0.8)', borderWidth:2, borderRadius:7, yAxisID:'y' },
                    { type:'line', label:'เสร็จสิ้น', data: trendDone, borderColor:'#16a34a', backgroundColor:'rgba(40,180,120,0.08)', borderWidth:2.5, tension:0.4, pointBackgroundColor:'#16a34a', pointRadius:5, fill:false, yAxisID:'y' },
                    { type:'line', label:'ยกเลิก', data: trendCancel, borderColor:'#dc2626', backgroundColor:'transparent', borderWidth:2, tension:0.4, pointBackgroundColor:'#dc2626', pointRadius:4, fill:false, yAxisID:'y' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position:'top', labels:{ boxWidth:11, padding:14, font:{size:12,family:'Sarabun'} } } },
                scales: {
                    y:  { beginAtZero:true, ticks:{stepSize:1}, grid:{color:'rgba(130,120,200,0.08)'} },
                    x:  { grid:{display:false} }
                }
            }
        });
    }

    // ── 3. Status Donut ──────────────────────────────────────
    const donutData   = [completed, approved, pending, cancelled];
    const donutLabels = ['เสร็จสิ้น','อนุมัติแล้ว','รออนุมัติ','ยกเลิก'];
    const donutColors = ['#16a34a','#0284c7','#d97706','#dc2626'];
    const statusCanvas = document.getElementById('d-status-donut');
    if (statusCanvas && window.Chart) {
        new Chart(statusCanvas, {
            type: 'doughnut',
            data: { labels: donutLabels, datasets: [{ data: donutData, backgroundColor: donutColors.map(c=>c+'22'), borderColor: donutColors, borderWidth:2.5, hoverOffset:10 }] },
            options: { responsive:true, maintainAspectRatio:false, cutout:'72%', plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.raw} รายการ`}} } }
        });
        const legEl = document.getElementById('d-status-legend');
        if (legEl) legEl.innerHTML = donutLabels.map((l,i) => `<div class="legend-item-d"><div class="legend-dot-d" style="background:${donutColors[i]}"></div>${l} (${donutData[i]})</div>`).join('');
    }

    // ── 4. Trip Type Donut ───────────────────────────────────
    const tripCanvas = document.getElementById('d-trip-donut');
    if (tripCanvas && window.Chart) {
        new Chart(tripCanvas, {
            type: 'doughnut',
            data: { labels:['ประจำวัน','ต่างจังหวัด'], datasets:[{ data:[dailyT, provinceT], backgroundColor:['rgba(20,184,166,0.2)','rgba(249,115,22,0.2)'], borderColor:['#14b8a6','#f97316'], borderWidth:2.5, hoverOffset:10 }] },
            options: { responsive:true, maintainAspectRatio:false, cutout:'68%', plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.raw} รายการ`}} } }
        });
        const tlegEl = document.getElementById('d-trip-legend');
        if (tlegEl) tlegEl.innerHTML = `<div class="legend-item-d"><div class="legend-dot-d" style="background:#14b8a6"></div>ประจำวัน (${dailyT})</div><div class="legend-item-d"><div class="legend-dot-d" style="background:#f97316"></div>ต่างจังหวัด (${provinceT})</div>`;
    }

    // ── 5. Department usage ──────────────────────────────────
    const deptMap = {};
    bookings.forEach(b => {
        const dept = b.creator_dept_name || b.requester_name || 'ไม่ระบุ';
        deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const deptList = Object.entries(deptMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const deptColors = ['#7c3aed','#0284c7','#16a34a','#d97706','#dc2626','#14b8a6'];
    const deptMax = deptList[0] ? deptList[0][1] : 1;
    const deptEl = document.getElementById('d-dept-list');
    if (deptEl) deptEl.innerHTML = deptList.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">ไม่มีข้อมูล</p>' :
        deptList.map(([name,cnt],i) => `
            <div class="dept-row">
                <span class="dept-name">${escapeHtml(name)}</span>
                <div class="dept-bar-bg"><div class="dept-bar-fill" style="width:${Math.round(cnt/deptMax*100)}%;background:${deptColors[i%deptColors.length]}"></div></div>
                <span class="dept-cnt">${cnt}</span>
            </div>`).join('');

    // ── 6. Top Destinations ──────────────────────────────────
    const destMap = {};
    bookings.forEach(b => { if(b.destination) destMap[b.destination] = (destMap[b.destination]||0) + 1; });
    const destList = Object.entries(destMap).sort((a,b)=>b[1]-a[1]).slice(0,7);
    const rankClass = ['r1','r2','r3'];
    const rankEmoji = ['🥇','🥈','🥉'];
    const destEl = document.getElementById('d-dest-list');
    if (destEl) destEl.innerHTML = destList.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">ไม่มีข้อมูล</p>' :
        destList.map(([name,cnt],i) => `
            <div class="dest-row">
                <div class="dest-rank ${rankClass[i]||''}">${i < 3 ? rankEmoji[i] : i+1}</div>
                <span class="dest-name">${escapeHtml(name)}</span>
                <span class="dest-cnt">${cnt}</span>
            </div>`).join('');

    // ── 7. Vehicle utilization ───────────────────────────────
    const vehStats = vehicles.map(v => {
        const vb = bookings.filter(b => b.vehicle_id == v.id);
        const km = vb.reduce((s,b) => s + (b.start_mileage && b.end_mileage ? parseInt(b.end_mileage)-parseInt(b.start_mileage) : 0), 0);
        return { label: v.license_plate, brand: v.brand_model, trips: vb.length, km };
    }).sort((a,b) => b.trips - a.trips);

    const vehBarCanvas = document.getElementById('d-veh-bar');
    if (vehBarCanvas && window.Chart) {
        new Chart(vehBarCanvas, {
            type: 'bar',
            data: {
                labels: vehStats.map(v => v.label),
                datasets: [
                    { label:'จำนวนเที่ยว', data: vehStats.map(v=>v.trips), backgroundColor:'rgba(120,80,240,0.75)', borderRadius:7, yAxisID:'y' },
                    { label:'ระยะทาง (กม.)', data: vehStats.map(v=>v.km), backgroundColor:'rgba(40,160,220,0.65)', borderRadius:7, yAxisID:'y1' }
                ]
            },
            options: {
                responsive:true, maintainAspectRatio:false,
                plugins:{ legend:{position:'top', labels:{boxWidth:11,padding:12,font:{size:12,family:'Sarabun'}}} },
                scales: {
                    y:  { beginAtZero:true, ticks:{stepSize:1}, position:'left', grid:{color:'rgba(130,120,200,0.08)'}, title:{display:true,text:'เที่ยว',font:{size:11}} },
                    y1: { beginAtZero:true, position:'right', grid:{display:false}, title:{display:true,text:'กม.',font:{size:11}} },
                    x:  { grid:{display:false} }
                }
            }
        });
    }
    const vehMax = vehStats[0] ? vehStats[0].trips : 1;
    const vehUtilEl = document.getElementById('d-veh-util-list');
    if (vehUtilEl) vehUtilEl.innerHTML = vehStats.map(v => `
        <div class="util-bar-row">
            <div class="util-bar-top">
                <span style="font-weight:600;font-size:12.5px">${escapeHtml(v.brand)}</span>
                <span style="font-size:11px;background:var(--bg-input);padding:2px 7px;border-radius:6px;color:var(--text-muted)">${escapeHtml(v.label)}</span>
            </div>
            <div class="util-bar-bg"><div class="util-bar-fill" style="width:${vehMax > 0 ? Math.round(v.trips/vehMax*100) : 0}%"></div></div>
            <div class="util-bar-sub">${v.trips} เที่ยว · ${v.km.toLocaleString()} กม.</div>
        </div>`).join('');

    // ── 8. Recent bookings table ─────────────────────────────
    const thMonth = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    function fmtDate(dt) {
        if (!dt) return '-';
        const d = new Date(dt);
        return `${d.getDate()} ${thMonth[d.getMonth()]} ${d.getFullYear()+543}`;
    }
    function fmtTime(dt) {
        if (!dt) return '';
        const d = new Date(dt);
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} น.`;
    }
    function statusBadge(s) {
        if (s==='completed')    return '<span class="badge-d bd-ok">✅ เสร็จสิ้น</span>';
        if (s==='approved')     return '<span class="badge-d bd-ap">✔️ อนุมัติ</span>';
        if (s==='pending_admin')return '<span class="badge-d bd-wt">⏳ รออนุมัติ</span>';
        if (s==='cancelled')    return '<span class="badge-d bd-cx">❌ ยกเลิก</span>';
        return `<span class="badge-d">${escapeHtml(s)}</span>`;
    }
    function tripBadge(t) {
        return t === 'province'
            ? '<span class="badge-d bd-pv">✈️ ต่างจังหวัด</span>'
            : '<span class="badge-d bd-dy">📍 ประจำวัน</span>';
    }

    const recent = [...bookings].sort((a,b) => new Date(b.created_at || b.start_datetime) - new Date(a.created_at || a.start_datetime)).slice(0,8);
    const tbody = document.getElementById('d-recent-tbody');
    if (tbody) tbody.innerHTML = recent.length === 0
        ? '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px">ยังไม่มีรายการจอง</td></tr>'
        : recent.map(b => `
            <tr>
                <td style="color:var(--text-muted);font-weight:600;font-size:12px">FF-${String(b.id).padStart(4,'0')}</td>
                <td>
                    <div style="font-weight:600;font-size:13px">${escapeHtml(b.requester_name||'')}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(b.creator_fullname||'')}</div>
                </td>
                <td style="max-width:200px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px">${escapeHtml(b.destination||'')}</div></td>
                <td>${tripBadge(b.trip_type)}</td>
                <td>
                    <div style="font-size:12px">${fmtDate(b.start_datetime)}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${fmtTime(b.start_datetime)}</div>
                </td>
                <td>
                    ${b.license_plate
                        ? `<div style="font-weight:600;font-size:12px">${escapeHtml(b.license_plate)}</div><div style="font-size:11px;color:var(--text-muted)">${escapeHtml(b.brand_model||'')}</div>`
                        : '<span style="color:var(--text-muted);font-size:12px">—</span>'}
                </td>
                <td style="font-size:12px">${escapeHtml(b.driver_name||'—')}</td>
                <td>${statusBadge(b.status)}</td>
                <td><a href="print_booking.php?id=${b.id}" target="_blank" style="color:var(--primary);font-size:13px" title="พิมพ์ใบขออนุญาต">🖨️</a></td>
            </tr>`).join('');

    // Update banner date
    const bannerDate = document.querySelector('.dash-banner-date');
    if (bannerDate) bannerDate.textContent = `📅 ${thaiNow} · รวมทั้งหมด ${total} รายการใช้รถ`;
}


function loadCalendarView(container) {
    container.innerHTML = `
        <div class="calendar-wrapper">
            <!-- Left Panel: Filters & Daily details -->
            <div class="calendar-sidebar">
                <!-- Filters Panel -->
                <div class="glass-panel" style="padding: 20px;">
                    <h4 style="margin-bottom: 16px;"><i class="fa-solid fa-filter" style="color:var(--primary); margin-right:6px;"></i>ตัวกรองคิวงาน</h4>
                    
                    <div class="form-group" style="margin-bottom: 14px;">
                        <label class="form-label" for="cal-filter-vehicle">เลือกแสดงเฉพาะรถยนต์</label>
                        <select id="cal-filter-vehicle" class="form-control" style="padding-left:14px;" onchange="updateCalendarFilters()">
                            <option value="all">กำลังโหลด...</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 14px;">
                        <label class="form-label" for="cal-filter-driver">เลือกแสดงเฉพาะคนขับ</label>
                        <select id="cal-filter-driver" class="form-control" style="padding-left:14px;" onchange="updateCalendarFilters()">
                            <option value="all">กำลังโหลด...</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="cal-filter-search">ค้นหาคำสำคัญ (สถานที่/วัตถุประสงค์)</label>
                        <div class="input-container">
                            <input type="text" id="cal-filter-search" class="form-control" placeholder="พิมพ์คำค้นหา..." oninput="updateCalendarFilters()">
                            <i class="fa-solid fa-magnifying-glass input-icon"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Daily Details Panel -->
                <div class="glass-panel" style="display: flex; flex-direction: column; min-height: 320px; flex: 1;">
                    <div class="panel-header" style="padding: 16px 20px;">
                        <h4 style="margin: 0;"><i class="fa-solid fa-list-check" style="color:var(--secondary); margin-right:6px;"></i>ตารางงานประจำวัน</h4>
                    </div>
                    <div id="cal-daily-header" style="padding: 10px 20px; font-size: 13px; font-weight:600; border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.01);">
                        วัน...
                    </div>
                    <div id="cal-daily-schedule" class="daily-schedule-card">
                        <p class="text-secondary text-center" style="margin-top: 20px;">กรุณาคลิกเลือกวันในปฏิทิน</p>
                    </div>
                </div>
            </div>
            
            <!-- Right Panel: Month Calendar grid -->
            <div class="glass-panel calendar-main-panel">
                <div class="calendar-nav-bar">
                    <button class="btn btn-secondary btn-sm" onclick="navigateCalendarMonth(-1)" style="padding: 8px 14px;">
                        <i class="fa-solid fa-chevron-left"></i> เดือนก่อนหน้า
                    </button>
                    <span class="calendar-month-title" id="cal-month-title">กำลังโหลด...</span>
                    <button class="btn btn-secondary btn-sm" onclick="navigateCalendarMonth(1)" style="padding: 8px 14px;">
                        เดือนถัดไป <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="calendar-grid-header">
                    <div style="color: var(--danger);">อา.</div>
                    <div>จ.</div>
                    <div>อ.</div>
                    <div>พ.</div>
                    <div>พฤ.</div>
                    <div>ศ.</div>
                    <div style="color: var(--secondary);">ส.</div>
                </div>
                
                <div class="calendar-grid-days" id="cal-days-grid">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        </div>
    `;
    
    initializeCalendarData();
}

async function initializeCalendarData() {
    // Set default selected date to today if not set
    if (!calendarSelectedDateStr) {
        const today = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        calendarSelectedDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    }
    
    // Fetch all datasets in parallel
    const [resVehicles, resDrivers, resBookings] = await Promise.all([
        apiFetch('get_vehicles', 'GET'),
        apiFetch('get_drivers', 'GET'),
        apiFetch('get_bookings', 'GET')
    ]);
    
    if (resVehicles.status !== 'success' || resDrivers.status !== 'success' || resBookings.status !== 'success') {
        const grid = document.getElementById('cal-days-grid');
        if (grid) grid.innerHTML = '<p class="text-danger" style="grid-column: span 7; text-align: center; padding: 20px;">ไม่สามารถดึงข้อมูลสำหรับปฏิทินได้</p>';
        return;
    }
    
    calendarVehicles = resVehicles.vehicles;
    calendarDrivers = resDrivers.drivers;
    calendarBookings = resBookings.bookings;
    
    // Populate vehicle filters
    const vehicleSelect = document.getElementById('cal-filter-vehicle');
    if (vehicleSelect) {
        let vOpts = '<option value="all">-- แสดงรถยนต์ทุกคัน --</option>';
        calendarVehicles.forEach(v => {
            vOpts += `<option value="${v.id}">${escapeHtml(v.brand_model)} (${escapeHtml(v.license_plate)} ${escapeHtml(v.province)})</option>`;
        });
        vehicleSelect.innerHTML = vOpts;
    }
    
    // Populate driver filters
    const driverSelect = document.getElementById('cal-filter-driver');
    if (driverSelect) {
        let dOpts = '<option value="all">-- แสดงคนขับทุกคน --</option>';
        calendarDrivers.forEach(d => {
            dOpts += `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
        });
        driverSelect.innerHTML = dOpts;
    }
    
    renderCalendarGrid();
    renderDailySchedule();
}

function updateCalendarFilters() {
    renderCalendarGrid();
    renderDailySchedule();
}

function navigateCalendarMonth(direction) {
    calendarDate.setMonth(calendarDate.getMonth() + direction);
    renderCalendarGrid();
}

function renderCalendarGrid() {
    const monthTitle = document.getElementById('cal-month-title');
    const daysGrid = document.getElementById('cal-days-grid');
    if (!monthTitle || !daysGrid) return;
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    monthTitle.textContent = `${thaiMonths[month]} ${year + 543}`;
    
    // Calculate calendar days
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 for Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();
    
    // Current date values for highlighting Today
    const today = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    
    // Fetch active filters
    const vehicleFilter = document.getElementById('cal-filter-vehicle').value;
    const driverFilter = document.getElementById('cal-filter-driver').value;
    const searchFilter = document.getElementById('cal-filter-search').value.toLowerCase().trim();
    
    daysGrid.innerHTML = '';
    
    // Helper to generate day cell html and bind click events
    const makeDayCell = (dayNum, isOtherMonth, cellDateStr) => {
        const cell = document.createElement('div');
        
        let dayClass = 'calendar-day-cell';
        if (isOtherMonth) dayClass += ' other-month';
        if (cellDateStr === todayStr) dayClass += ' today';
        if (cellDateStr === calendarSelectedDateStr) dayClass += ' selected';
        
        cell.className = dayClass;
        cell.dataset.date = cellDateStr;
        
        // Filter bookings overlapping with this date
        const dayBookings = calendarBookings.filter(b => {
            const start = b.start_datetime.split(' ')[0];
            const end = b.end_datetime.split(' ')[0];
            const isOnDate = (cellDateStr >= start && cellDateStr <= end);
            if (!isOnDate) return false;
            
            // apply filter criteria
            if (vehicleFilter !== 'all' && b.vehicle_id != vehicleFilter) return false;
            if (driverFilter !== 'all' && b.driver_id != driverFilter) return false;
            if (searchFilter !== '') {
                const dest = b.destination.toLowerCase();
                const purp = b.purpose.toLowerCase();
                const req = b.requester_name.toLowerCase();
                if (!dest.includes(searchFilter) && !purp.includes(searchFilter) && !req.includes(searchFilter)) return false;
            }
            return true;
        });
        
        // Render day number
        let numHtml = `<span class="calendar-day-number">${dayNum}</span>`;
        cell.innerHTML = numHtml;
        
        // Render booking strips (max 3 strips)
        const stripsContainer = document.createElement('div');
        stripsContainer.className = 'calendar-strips-container';
        
        const maxStrips = 3;
        dayBookings.slice(0, maxStrips).forEach(b => {
            const strip = document.createElement('div');
            let stripType = 'pending';
            if (b.status === 'approved') stripType = 'approved';
            else if (b.status === 'completed') stripType = 'completed';
            else if (b.status === 'cancelled') stripType = 'cancelled';
            
            strip.className = `bk-strip bk-strip-${stripType}`;
            
            const vehicleLabel = b.license_plate ? b.license_plate : 'ไม่ระบุรถ';
            strip.textContent = `[${vehicleLabel}] ${b.requester_name}`;
            strip.title = `ผู้ขอ: ${b.requester_name}\nปลายทาง: ${b.destination}\nวัตถุประสงค์: ${b.purpose}`;
            
            // Clicking strip opens booking details and stops propagation
            strip.onclick = (e) => {
                e.stopPropagation();
                openBookingDetailsModal(b);
            };
            
            stripsContainer.appendChild(strip);
        });
        
        if (dayBookings.length > maxStrips) {
            const moreLabel = document.createElement('div');
            moreLabel.className = 'calendar-more-lbl';
            moreLabel.textContent = `+${dayBookings.length - maxStrips} รายการ...`;
            stripsContainer.appendChild(moreLabel);
        }
        
        cell.appendChild(stripsContainer);
        
        // Cell click selects the date
        cell.onclick = () => {
            calendarSelectedDateStr = cellDateStr;
            document.querySelectorAll('.calendar-day-cell').forEach(el => el.classList.remove('selected'));
            cell.classList.add('selected');
            renderDailySchedule();
        };
        
        daysGrid.appendChild(cell);
    };
    
    // 1. Render Previous Month Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dNum = prevTotalDays - i;
        const prevMonthDate = new Date(year, month - 1, dNum);
        const cellDateStr = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}-${pad(prevMonthDate.getDate())}`;
        makeDayCell(dNum, true, cellDateStr);
    }
    
    // 2. Render Current Month Days
    for (let i = 1; i <= totalDays; i++) {
        const cellDateStr = `${year}-${pad(month + 1)}-${pad(i)}`;
        makeDayCell(i, false, cellDateStr);
    }
    
    // 3. Render Next Month Days (to make a full grid of 42 slots)
    const remainingSlots = 42 - (firstDayIndex + totalDays);
    for (let i = 1; i <= remainingSlots; i++) {
        const nextMonthDate = new Date(year, month + 1, i);
        const cellDateStr = `${nextMonthDate.getFullYear()}-${pad(nextMonthDate.getMonth() + 1)}-${pad(nextMonthDate.getDate())}`;
        makeDayCell(i, true, cellDateStr);
    }
}

function renderDailySchedule() {
    const dailyHeader = document.getElementById('cal-daily-header');
    const scheduleCard = document.getElementById('cal-daily-schedule');
    if (!dailyHeader || !scheduleCard) return;
    
    // Format selected date header (e.g. 4 มิถุนายน 2569)
    const parts = calendarSelectedDateStr.split('-');
    const selYear = parseInt(parts[0]);
    const selMonth = parseInt(parts[1]) - 1;
    const selDay = parseInt(parts[2]);
    
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const thaiMonthsShort = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    
    dailyHeader.textContent = `ตารางงานวันที่ ${selDay} ${thaiMonths[selMonth]} ${selYear + 543}`;
    
    // Fetch active filters
    const vehicleFilter = document.getElementById('cal-filter-vehicle').value;
    const driverFilter = document.getElementById('cal-filter-driver').value;
    const searchFilter = document.getElementById('cal-filter-search').value.toLowerCase().trim();
    
    // Filter bookings on selected date
    const dayBookings = calendarBookings.filter(b => {
        const start = b.start_datetime.split(' ')[0];
        const end = b.end_datetime.split(' ')[0];
        const isOnDate = (calendarSelectedDateStr >= start && calendarSelectedDateStr <= end);
        if (!isOnDate) return false;
        
        // apply filter criteria
        if (vehicleFilter !== 'all' && b.vehicle_id != vehicleFilter) return false;
        if (driverFilter !== 'all' && b.driver_id != driverFilter) return false;
        if (searchFilter !== '') {
            const dest = b.destination.toLowerCase();
            const purp = b.purpose.toLowerCase();
            const req = b.requester_name.toLowerCase();
            if (!dest.includes(searchFilter) && !purp.includes(searchFilter) && !req.includes(searchFilter)) return false;
        }
        return true;
    });
    
    if (dayBookings.length === 0) {
        scheduleCard.innerHTML = `
            <p class="text-secondary text-center" style="margin-top: 20px; font-size:13px;">
                ไม่มีงานเดินรถของรถยนต์และคนขับในวันนี้
            </p>
        `;
        return;
    }
    
    let html = '';
    dayBookings.forEach(b => {
        let statusClass = 'pending';
        let statusLabel = 'รออนุมัติ';
        if (b.status === 'approved') {
            statusClass = 'approved';
            statusLabel = 'อนุมัติแล้ว';
        } else if (b.status === 'completed') {
            statusClass = 'completed';
            statusLabel = 'เสร็จสิ้น';
        } else if (b.status === 'cancelled') {
            statusClass = 'cancelled';
            statusLabel = 'ยกเลิก';
        }
        
        // Format time display
        const getHourMin = (dtStr) => {
            const parts = dtStr.split(' ');
            if (parts.length < 2) return '';
            return parts[1].substring(0, 5) + ' น.';
        };
        
        const timeStr = `${getHourMin(b.start_datetime)} - ${getHourMin(b.end_datetime)}`;
        
        const driverName = b.driver_name ? escapeHtml(b.driver_name) : 'รอจัดสรร';
        const plateInfo = b.license_plate ? `รถ: ${escapeHtml(b.brand_model)} (${escapeHtml(b.license_plate)})` : 'รถ: รอจัดสรร';
        
        html += `
            <div class="daily-schedule-item ${statusClass}" style="cursor:pointer;" onclick="openBookingDetailsModal(${JSON.stringify(b).replace(/"/g, '&quot;')})">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                    <strong style="color:var(--primary-light);"><i class="fa-regular fa-clock" style="margin-right:4px;"></i>${timeStr}</strong>
                    <span class="badge badge-${statusClass === 'cancelled' ? 'danger' : (statusClass === 'approved' ? 'success' : (statusClass === 'completed' ? 'info' : 'warning'))} btn-sm" style="font-size:10px; padding:2px 6px;">${statusLabel}</span>
                </div>
                <div style="font-weight:600; margin-bottom:4px;">ผู้ขอ: ${escapeHtml(b.requester_name)}</div>
                <div style="font-size:12px; color: var(--text-secondary); margin-bottom:2px;"><i class="fa-solid fa-location-dot" style="margin-right:4px;"></i>ไป: ${escapeHtml(b.destination)}</div>
                <div style="font-size:12px; color: var(--text-secondary); margin-bottom:6px;"><i class="fa-solid fa-info" style="margin-right:6px; width:12px; text-align:center;"></i>เพื่อ: ${escapeHtml(b.purpose)}</div>
                <div style="border-top:1px dashed var(--border-color); padding-top:6px; font-size:11px; display:flex; flex-direction:column; gap:2px;">
                    <span><i class="fa-solid fa-user-tie" style="margin-right:4px;"></i>คนขับ: ${driverName}</span>
                    <span><i class="fa-solid fa-car" style="margin-right:4px;"></i>${plateInfo}</span>
                </div>
            </div>
        `;
    });
    
    scheduleCard.innerHTML = html;
}

window.openBookingDetailsModal = function(b) {
    const isApproved = b.status === 'approved';
    const isCompleted = b.status === 'completed';
    const isPending = b.status === 'pending_admin';
    const isCancelled = b.status === 'cancelled';
    const isAdmin = currentUser.role === 'admin';
    
    let statusLabel = '';
    let statusColor = '';
    if (isPending) { statusLabel = '⏳ รออนุมัติจัดสรร'; statusColor = 'var(--warning)'; }
    else if (isApproved) { statusLabel = '✓ อนุมัติการใช้รถแล้ว'; statusColor = 'var(--success)'; }
    else if (isCompleted) { statusLabel = '✓ สิ้นสุดการเดินทาง (ปิดทริป)'; statusColor = 'var(--info)'; }
    else if (isCancelled) { statusLabel = '✗ ยกเลิกคำขอ'; statusColor = 'var(--danger)'; }
    
    let travelStatusLabel = 'ยังไม่เดินทาง';
    if (b.travel_status === 'driving') travelStatusLabel = 'กำลังเดินทาง';
    else if (b.travel_status === 'completed' || b.travel_status === 'arrived') travelStatusLabel = 'เดินทางสำเร็จ';
    
    let allocSection = '';
    if (isPending) {
        allocSection = `
            <div class="text-center" style="padding:16px; border:1px dashed var(--border-color); border-radius:8px; color:var(--text-muted); font-size:13px;">
                อยู่ระหว่างรอผู้ดูแลระบบคัดเลือกคนขับรถและรถยนต์ส่วนกลาง
            </div>
        `;
    } else {
        allocSection = `
            <table class="table-custom" style="font-size:13px;">
                <tr>
                    <td style="padding:8px; width:35%;"><strong>พนักงานขับรถ:</strong></td>
                    <td style="padding:8px;">${escapeHtml(b.driver_name || 'ไม่ใช้คนขับ')} ${b.driver_phone ? `(${escapeHtml(b.driver_phone)})` : ''}</td>
                </tr>
                <tr>
                    <td style="padding:8px;"><strong>รถยนต์ที่ใช้:</strong></td>
                    <td style="padding:8px;">${escapeHtml(b.brand_model || '-')} (${escapeHtml(b.license_plate)} ${escapeHtml(b.province)})</td>
                </tr>
                <tr>
                    <td style="padding:8px;"><strong>ประเภทรถยนต์:</strong></td>
                    <td style="padding:8px;">${b.vehicle_type === 'sedan' ? 'รถเก๋ง' : (b.vehicle_type === 'van' ? 'รถตู้' : 'รถกระบะ')}</td>
                </tr>
                <tr>
                    <td style="padding:8px;"><strong>เลขไมล์เริ่มต้น:</strong></td>
                    <td style="padding:8px;">${b.start_mileage !== null ? b.start_mileage.toLocaleString() + ' กม.' : 'ยังไม่บันทึก'}</td>
                </tr>
                <tr>
                    <td style="padding:8px;"><strong>เลขไมล์สิ้นสุด:</strong></td>
                    <td style="padding:8px;">${b.end_mileage !== null ? b.end_mileage.toLocaleString() + ' กม.' : 'ยังไม่สิ้นสุดการเดินทาง'}</td>
                </tr>
            </table>
        `;
    }
    
    // Setup Action Shortcuts inside Modal
    let actionsHtml = '';
    if (isApproved || isCompleted) {
        actionsHtml += `
            <button class="btn btn-secondary" onclick="printBooking(${b.id})">
                <i class="fa-solid fa-print"></i> พิมพ์เอกสารใบขอใช้รถ
            </button>
        `;
    }
    
    if (isAdmin) {
        if (isPending) {
            actionsHtml += `
                <button class="btn btn-success" onclick="closeGlobalModal(); approveBookingModal(${JSON.stringify(b).replace(/"/g, '&quot;')})">
                    <i class="fa-solid fa-circle-check"></i> จัดสรรและอนุมัติคิว
                </button>
            `;
        } else if (isApproved) {
            actionsHtml += `
                <button class="btn btn-secondary" onclick="closeGlobalModal(); approveBookingModal(${JSON.stringify(b).replace(/"/g, '&quot;')})">
                    <i class="fa-solid fa-shuffle"></i> จัดสรรใหม่
                </button>
            `;
            if (b.travel_status === 'not_started') {
                actionsHtml += `
                    <button class="btn btn-primary" onclick="closeGlobalModal(); startTripModal(${b.id}, ${b.vehicle_current_mileage || 0})">
                        <i class="fa-solid fa-play"></i> เริ่มเดินทาง
                    </button>
                `;
            } else if (b.travel_status === 'driving') {
                actionsHtml += `
                    <button class="btn btn-success" onclick="closeGlobalModal(); completeTripModal(${b.id}, ${b.start_mileage})">
                        <i class="fa-solid fa-flag-checkered"></i> ปิดทริป (จบงาน)
                    </button>
                `;
            }
        }
    }
    
    const detailsHtml = `
        <div style="display:flex; flex-direction:column; gap:16px;">
            <!-- Header Status -->
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
                <div>
                    <span style="font-size:12px; color:var(--text-muted);">สถานะคำขอ</span><br>
                    <strong style="color:${statusColor}; font-size:16px;">${statusLabel}</strong>
                </div>
                ${isApproved || isCompleted ? `
                    <div style="text-align:right;">
                        <span style="font-size:12px; color:var(--text-muted);">สถานะทริป</span><br>
                        <strong>${travelStatusLabel}</strong>
                    </div>
                ` : ''}
            </div>
            
            <!-- Details Grid -->
            <div style="display:grid; grid-template-columns:1fr; gap:12px; font-size:14px; line-height:1.6;">
                <div><strong>ผู้ขอจอง / ส่วนงาน:</strong> ${escapeHtml(b.requester_name)}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div><strong>วันเดินทางไป:</strong><br>${formatDateTimeJS(b.start_datetime)}</div>
                    <div><strong>วันเดินทางกลับ:</strong><br>${formatDateTimeJS(b.end_datetime)}</div>
                </div>
                <div><strong>สถานที่ปลายทาง:</strong><br><i class="fa-solid fa-location-dot" style="margin-right:6px; color:var(--primary);"></i>${escapeHtml(b.destination)}</div>
                <div><strong>วัตถุประสงค์ในการขอใช้รถ:</strong><br>${escapeHtml(b.purpose)}</div>
                <div><strong>จำนวนผู้เดินทางร่วมทริป:</strong> ${b.passenger_count} คน</div>
            </div>
            
            <!-- Allocation Details -->
            <div style="margin-top:10px;">
                <h5 style="margin-bottom:8px; border-bottom:1px solid var(--border-color); padding-bottom:4px;"><i class="fa-solid fa-circle-nodes" style="margin-right:6px;"></i>การพิจารณาจัดสรรยานพาหนะ</h5>
                ${allocSection}
            </div>
            
            <!-- Action Shortcuts -->
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px; flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ปิดหน้าต่าง</button>
                ${actionsHtml}
            </div>
        </div>
    `;
    
    openGlobalModal(`รายละเอียดการขอใช้รถยนต์ (คิวงานที่ #${b.id})`, detailsHtml);
};


// --- BOOKINGS WORKSPACE VIEW ---
function formatDateTimeJS(dtStr) {
    if (!dtStr) return '-';
    // dtStr can be YYYY-MM-DD HH:MM:SS
    const dt = new Date(dtStr.replace(' ', 'T'));
    if (isNaN(dt.getTime())) return dtStr;
    const pad = (n) => n.toString().padStart(2, '0');
    const d = pad(dt.getDate());
    const m = pad(dt.getMonth() + 1);
    const y = dt.getFullYear() + 543; // Thai year
    const h = pad(dt.getHours());
    const min = pad(dt.getMinutes());
    return `${d}/${m}/${y} ${h}:${min} น.`;
}

async function loadBookingsView(container) {
    container.innerHTML = '<p class="text-secondary">กำลังโหลดข้อมูลการขอใช้รถ...</p>';
    const res = await apiFetch('get_bookings', 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<p class="text-danger">ไม่สามารถดึงข้อมูลการจองรถได้: ' + res.message + '</p>';
        return;
    }
    
    const isAdmin = currentUser.role === 'admin';
    let rowsHtml = '';
    
    res.bookings.forEach(b => {
        // Render Request Status Badge
        let statusBadge = '';
        if (b.status === 'pending_admin') {
            statusBadge = '<span class="badge badge-warning"><span class="badge-dot"></span>รออนุมัติ</span>';
        } else if (b.status === 'approved') {
            statusBadge = '<span class="badge badge-success"><span class="badge-dot"></span>อนุมัติแล้ว</span>';
        } else if (b.status === 'completed') {
            statusBadge = '<span class="badge badge-info"><span class="badge-dot"></span>ทริปเสร็จสิ้น</span>';
        } else if (b.status === 'cancelled') {
            statusBadge = '<span class="badge badge-danger"><span class="badge-dot"></span>ยกเลิก</span>';
        }
        
        // Render Travel Status Badge
        let travelBadge = '';
        if (b.travel_status === 'not_started') {
            travelBadge = '<span class="badge badge-secondary" style="background: rgba(120,120,120,0.15); color: var(--text-secondary);"><span class="badge-dot" style="background-color: var(--text-secondary);"></span>ยังไม่เริ่มเดินทาง</span>';
        } else if (b.travel_status === 'driving') {
            travelBadge = '<span class="badge badge-warning" style="background: var(--warning-glow); color: var(--warning);"><span class="badge-dot" style="background-color: var(--warning);"></span>กำลังเดินทาง</span>';
        } else if (b.travel_status === 'arrived' || b.travel_status === 'completed') {
            travelBadge = '<span class="badge badge-success"><span class="badge-dot"></span>เดินทางสำเร็จ</span>';
        }
        
        let driverVehicleCell = '';
        if (b.status === 'pending_admin') {
            driverVehicleCell = '<span class="text-muted" style="font-size:12px;">รอจัดสรรคนขับ/รถยนต์</span>';
        } else {
            const plateLabel = b.license_plate ? `<br><small class="text-muted">ทะเบียน: ${escapeHtml(b.license_plate)} ${escapeHtml(b.province)}</small>` : '';
            driverVehicleCell = `
                <strong>${escapeHtml(b.driver_name || 'ไม่ใช้คนขับ')}</strong>
                ${b.brand_model ? `<br><span style="font-size:12px; color: var(--text-secondary);">${escapeHtml(b.brand_model)}</span>` : ''}
                ${plateLabel}
            `;
        }
        
        let mileageCell = '-';
        if (b.status !== 'pending_admin') {
            const startM = b.start_mileage !== null ? `${b.start_mileage.toLocaleString()} กม.` : 'ยังไม่บันทึก';
            const endM = b.end_mileage !== null ? `${b.end_mileage.toLocaleString()} กม.` : 'ยังไม่สิ้นสุด';
            mileageCell = `<span style="font-size:12px;">เริ่ม: ${startM}<br>กลับ: ${endM}</span>`;
        }
        
        // Action Buttons logic
        let actions = '';
        
        // Print option (Available after approval or completion)
        if (b.status === 'approved' || b.status === 'completed') {
            actions += `
                <button class="btn btn-secondary btn-sm" onclick="printBooking(${b.id})" title="พิมพ์ใบคำขอใช้รถยนต์">
                    <i class="fa-solid fa-print"></i> พิมพ์
                </button>
            `;
        }
        
        // Edit / Cancel (For creator when pending)
        if (b.status === 'pending_admin' && (isAdmin || b.created_by === currentUser.id)) {
            actions += `
                <button class="btn btn-secondary btn-sm" onclick="openSaveBookingModal(${JSON.stringify(b).replace(/"/g, '&quot;')})">
                    <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                </button>
                <button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.id})">
                    <i class="fa-solid fa-rectangle-xmark"></i> ยกเลิก
                </button>
            `;
        }
        
        // Admin-only operations
        if (isAdmin) {
            if (b.status === 'pending_admin') {
                actions += `
                    <button class="btn btn-success btn-sm" onclick="approveBookingModal(${JSON.stringify(b).replace(/"/g, '&quot;')})">
                        <i class="fa-solid fa-circle-check"></i> จัดสรร/อนุมัติ
                    </button>
                `;
            } else if (b.status === 'approved') {
                actions += `
                    <button class="btn btn-secondary btn-sm" onclick="approveBookingModal(${JSON.stringify(b).replace(/"/g, '&quot;')})" title="ปรับปรุงคิวจัดสรรรถและคนขับ">
                        <i class="fa-solid fa-shuffle"></i> จัดสรรใหม่
                    </button>
                `;
                
                if (b.travel_status === 'not_started') {
                    actions += `
                        <button class="btn btn-primary btn-sm" onclick="startTripModal(${b.id}, ${b.vehicle_current_mileage || 0})">
                            <i class="fa-solid fa-play"></i> เริ่มเดินทาง
                        </button>
                    `;
                } else if (b.travel_status === 'driving') {
                    actions += `
                        <button class="btn btn-success btn-sm" onclick="completeTripModal(${b.id}, ${b.start_mileage})">
                            <i class="fa-solid fa-flag-checkered"></i> ปิดทริป (จบงาน)
                        </button>
                    `;
                }
            }
        }
        
        rowsHtml += `
            <tr>
                <td>
                    <strong>${escapeHtml(b.requester_name)}</strong>
                    <br><span class="text-muted" style="font-size:11px;">ผู้บันทึก: ${escapeHtml(b.creator_fullname || 'ระบบ')}</span>
                </td>
                <td style="font-size: 13px; line-height: 1.4;">
                    <span>ไป: ${formatDateTimeJS(b.start_datetime)}</span><br>
                    <span>กลับ: ${formatDateTimeJS(b.end_datetime)}</span>
                </td>
                <td>
                    <strong>${escapeHtml(b.destination)}</strong>
                    <br><span class="text-muted" style="font-size:12px; display:inline-block; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(b.purpose)}">${escapeHtml(b.purpose)}</span>
                </td>
                <td>${b.passenger_count} คน</td>
                <td>${driverVehicleCell}</td>
                <td>${mileageCell}</td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
                        ${statusBadge}
                        ${b.status === 'approved' || b.status === 'completed' ? travelBadge : ''}
                    </div>
                </td>
                <td>
                    <div style="display:flex; gap:6px; flex-wrap:wrap; max-width:180px;">
                        ${actions || '<span class="text-muted" style="font-size:12px;">ไม่มีรายการดำเนินการ</span>'}
                    </div>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = `
        <div class="glass-panel" style="padding: 24px; animation: fadeIn var(--transition-fast);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                <h3>รายการจองรถและอนุมัติ (Booking Workspace)</h3>
                <button class="btn btn-primary" onclick="openSaveBookingModal()">
                    <i class="fa-solid fa-square-plus"></i> ขอจองรถยนต์ใหม่
                </button>
            </div>
            <div class="table-responsive">
                <table class="table-custom">
                    <thead>
                        <tr>
                            <th>ผู้ขอจอง / ผู้บันทึก</th>
                            <th>วันเวลาเดินทาง</th>
                            <th>สถานที่ปลายทาง / วัตถุประสงค์</th>
                            <th>ผู้เดินทาง</th>
                            <th>คนขับ / ยานพาหนะ</th>
                            <th>เลขไมล์ (กม.)</th>
                            <th>สถานะการจอง</th>
                            <th>จัดการคำขอ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="8" class="text-center text-secondary">ไม่พบประวัติการขอใช้รถยนต์ในระบบ</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Modal Form for requesting booking
// Modal Form for requesting booking
window.openSaveBookingModal = async function(b = null) {
    const isEdit = b !== null;
    
    // Fetch users for controller and passenger selectors
    const usersRes = await apiFetch('get_users', 'GET');
    const allUsers = usersRes.status === 'success' ? usersRes.users : [];
    
    // Prepare values
    const requester = b ? escapeHtml(b.requester_name) : escapeHtml(currentUser.fullname);
    const destination = b ? escapeHtml(b.destination) : '';
    const purpose = b ? escapeHtml(b.purpose) : '';
    const subject = b ? escapeHtml(b.subject) : '';
    const trip_type = b ? b.trip_type : 'daily';
    const controller_id = b ? b.controller_id : currentUser.id;
    const backup_controller_id = b ? b.backup_controller_id : currentUser.id;
    
    let selectedPassengerIds = [];
    if (b && b.passenger_ids) {
        try {
            selectedPassengerIds = JSON.parse(b.passenger_ids).map(id => parseInt(id));
        } catch(e) {
            selectedPassengerIds = [];
        }
    }
    
    const startDT = b ? b.start_datetime.replace(' ', 'T').substring(0, 16) : '';
    const endDT = b ? b.end_datetime.replace(' ', 'T').substring(0, 16) : '';
    
    // Build user options for dropdowns
    let controllerOpts = '';
    let backupOpts = '';
    allUsers.forEach(u => {
        const isCtrlSel = u.id == controller_id ? 'selected' : '';
        const isBakSel = u.id == backup_controller_id ? 'selected' : '';
        controllerOpts += `<option value="${u.id}" ${isCtrlSel}>${escapeHtml(u.fullname)} (${escapeHtml(u.title || 'ไม่มีตำแหน่ง')})</option>`;
        backupOpts += `<option value="${u.id}" ${isBakSel}>${escapeHtml(u.fullname)} (${escapeHtml(u.title || 'ไม่มีตำแหน่ง')})</option>`;
    });
    
    // Build passenger checkboxes
    let passengerCheckboxes = '';
    allUsers.forEach(u => {
        const isChecked = selectedPassengerIds.includes(u.id);
        passengerCheckboxes += `
            <label class="checkbox-container" style="display:flex; margin-bottom:8px; font-size:13.5px; padding-left:24px; cursor:pointer;">
                ${escapeHtml(u.fullname)} <span class="text-secondary" style="font-size:11px; margin-left:6px;">(${escapeHtml(u.title || 'ไม่มีตำแหน่ง')})</span>
                <input type="checkbox" name="bk-passengers-check" value="${u.id}" ${isChecked ? 'checked' : ''}>
                <span class="checkmark" style="border-radius:4px; top:50%; transform:translateY(-50%);"></span>
            </label>
        `;
    });
    
    const formHtml = `
        <form id="booking-request-form" onsubmit="handleSaveBooking(event, ${isEdit ? b.id : 0}, '${isEdit ? escapeHtml(b.requester_name) : escapeHtml(currentUser.fullname)}')">
            <!-- Read-only Profile Info Section -->
            <div class="profile-info-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom: 20px; padding: 14px; background: var(--nav-hover-bg); border-radius: 8px; border: 1px dashed var(--border-color);">
                <div style="font-size:13.5px;"><strong>ผู้ขออนุญาต:</strong> ${escapeHtml(currentUser.fullname)}</div>
                <div style="font-size:13.5px;"><strong>ตำแหน่ง:</strong> ${escapeHtml(currentUser.title || '-')}</div>
                <div style="font-size:13.5px;"><strong>ส่วนงาน:</strong> ${escapeHtml(currentUser.department || '-')}</div>
                <div style="font-size:13.5px;"><strong>งาน:</strong> ${escapeHtml(currentUser.division || '-')}</div>
                <div style="font-size:13.5px; grid-column: span 2;"><strong>วันที่ทำรายการ:</strong> ${new Date().toLocaleDateString('th-TH', {year: 'numeric', month: 'long', day: 'numeric'})}</div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="bk-subject">เรื่อง *</label>
                <input type="text" id="bk-subject" class="form-control" required value="${subject}" placeholder="เช่น ขอใช้รถยนต์ส่วนกลางไปติดต่อราชการ, รับ-ส่ง หนังสือราชการ">
            </div>

            <div class="form-group">
                <label class="form-label" for="bk-dest">ขออนุญาตใช้รถยนต์ไปติดต่อราชการที่... *</label>
                <input type="text" id="bk-dest" class="form-control" required value="${destination}" placeholder="ระบุสถานที่ปลายทางและจังหวัด เช่น สกร. จังหวัดปทุมธานี">
            </div>

            <div style="display:grid; grid-template-columns:2fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="bk-purpose">วัตถุประสงค์ในการขอใช้รถ *</label>
                    <input type="text" id="bk-purpose" class="form-control" required value="${purpose}" placeholder="ระบุวัตถุประสงค์สั้นๆ เช่น รับ-ส่งหนังสือ, สัมมนาโครงการ">
                </div>
                <div class="form-group">
                    <label class="form-label">ประเภทการเดินทาง *</label>
                    <div style="display:flex; gap:16px; margin-top:8px;">
                        <label class="checkbox-container" style="margin-bottom:0; padding-left:24px; font-size:13.5px;">
                            ประจำวัน
                            <input type="radio" name="trip_type" value="daily" ${trip_type === 'daily' ? 'checked' : ''}>
                            <span class="checkmark" style="border-radius:50%; top:50%; transform:translateY(-50%);"></span>
                        </label>
                        <label class="checkbox-container" style="margin-bottom:0; padding-left:24px; font-size:13.5px;">
                            ต่างจังหวัด
                            <input type="radio" name="trip_type" value="province" ${trip_type === 'province' ? 'checked' : ''}>
                            <span class="checkmark" style="border-radius:50%; top:50%; transform:translateY(-50%);"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="bk-start">วันและเวลาเดินทางไป *</label>
                    <input type="datetime-local" id="bk-start" class="form-control" required value="${startDT}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="bk-end">วันและเวลาเดินทางกลับ *</label>
                    <input type="datetime-local" id="bk-end" class="form-control" required value="${endDT}">
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:6px;">
                <div class="form-group">
                    <label class="form-label" for="bk-controller">ผู้ควบคุมรถ (หลัก) *</label>
                    <select id="bk-controller" class="form-control" style="padding-left:14px;" required>
                        <option value="" disabled>-- เลือกผู้ควบคุมรถ --</option>
                        ${controllerOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="bk-backup-controller">ผู้ควบคุมรถ (สำรองกรณีไม่มีผู้ควบคุมหลัก) *</label>
                    <select id="bk-backup-controller" class="form-control" style="padding-left:14px;" required>
                        <option value="" disabled>-- เลือกผู้ควบคุมรถสำรอง --</option>
                        ${backupOpts}
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">บุคคลร่วมคณะเดินทาง</label>
                <div class="passenger-select-box glass-panel" style="padding: 12px; max-height: 160px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input);">
                    ${passengerCheckboxes}
                </div>
                <small class="text-muted" style="margin-top:4px; display:block;">เลือกรายชื่อผู้ร่วมเดินทางในทริปนี้</small>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">ส่งคำขอจองรถ</button>
            </div>
        </form>
    `;
    
    openGlobalModal(isEdit ? 'แก้ไขรายละเอียดการขอใช้รถ' : 'ส่งแบบฟอร์มขอใช้รถยนต์ส่วนกลาง', formHtml);
};

window.handleSaveBooking = async function(event, id, requesterName) {
    event.preventDefault();
    
    const startVal = document.getElementById('bk-start').value;
    const endVal = document.getElementById('bk-end').value;
    
    if (new Date(startVal) >= new Date(endVal)) {
        alert("วันเวลาเดินทางกลับ ต้องอยู่หลังวันเวลาเดินทางไป");
        return;
    }
    
    const startDT = startVal.replace('T', ' ') + ':00';
    const endDT = endVal.replace('T', ' ') + ':00';
    
    // Get selected passenger IDs
    const checkedPass = document.querySelectorAll('input[name="bk-passengers-check"]:checked');
    const passengerIds = Array.from(checkedPass).map(cb => parseInt(cb.value));
    
    const tripTypeEl = document.querySelector('input[name="trip_type"]:checked');
    const trip_type = tripTypeEl ? tripTypeEl.value : 'daily';
    
    const body = {
        id: id,
        requester_name: requesterName,
        start_datetime: startDT,
        end_datetime: endDT,
        destination: document.getElementById('bk-dest').value.trim(),
        purpose: document.getElementById('bk-purpose').value.trim(),
        subject: document.getElementById('bk-subject').value.trim(),
        trip_type: trip_type,
        controller_id: parseInt(document.getElementById('bk-controller').value),
        backup_controller_id: parseInt(document.getElementById('bk-backup-controller').value),
        passenger_ids: JSON.stringify(passengerIds),
        passenger_count: passengerIds.length
    };
    
    const res = await apiFetch('save_booking', 'POST', body);
    if (res.status === 'success') {
        closeGlobalModal();
        alert(res.message);
        loadBookingsView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};

window.cancelBooking = async function(id) {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำขอจองรถยนต์รายการนี้?")) return;
    
    const res = await apiFetch('save_booking', 'POST', {
        id: id,
        requester_name: 'cancel',
        start_datetime: '1970-01-01 00:00:00',
        end_datetime: '1970-01-01 00:00:00',
        destination: 'cancel',
        purpose: 'cancel',
        status: 'cancelled'
    });
    
    if (res.status === 'success') {
        alert("ยกเลิกคำขอเรียบร้อยแล้ว");
        loadBookingsView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};

// Admin allocation and approval modal
window.approveBookingModal = async function(b) {
    openGlobalModal('กำลังตรวจสอบยานพาหนะและพนักงานขับรถ...', '<p class="text-secondary">ระบบกำลังประเมินคำแนะนำตามคิวความเท่าเทียม (Fairness Queue)...</p>');
    
    // Extract date from start_datetime (format: YYYY-MM-DD HH:MM:SS)
    const bookingDate = b.start_datetime.split(' ')[0];
    
    // Fetch available drivers (ordered by fairness recommendations) and available vehicles
    const [resDrivers, resVehicles] = await Promise.all([
        apiFetch(`get_driver_recommendations&date=${bookingDate}`, 'GET'),
        apiFetch(`get_available_vehicles&date=${bookingDate}`, 'GET')
    ]);
    
    if (resDrivers.status !== 'success' || resVehicles.status !== 'success') {
        openGlobalModal('เกิดข้อผิดพลาด', '<p class="text-danger">ไม่สามารถดึงข้อมูลคัดสรรคนขับและรถยนต์ว่างสำหรับวันที่ระบุได้</p>');
        return;
    }
    
    // Build driver recommendation options
    let driverOpts = '<option value="" disabled selected>-- เลือกพนักงานขับรถ --</option>';
    resDrivers.recommendations.forEach((d, idx) => {
        let suffix = '';
        if (!d.is_available) {
            suffix = ' [ไม่ว่าง/ติดทริปอื่น]';
        } else {
            suffix = ` [ออกต่างจังหวัดสะสม: ${d.out_of_town_count} ครั้ง]`;
            if (d.is_saturday_locked) {
                suffix += ' ⭐ แนะนำพิเศษ (เพิ่งทำวันเสาร์)';
            } else if (idx === 0) {
                suffix += ' 👍 แนะนำอันดับ 1 (คิวน้อยสุด)';
            }
        }
        driverOpts += `<option value="${d.id}" ${!d.is_available ? 'disabled style="color:var(--text-muted);"' : ''} ${b.driver_id == d.id ? 'selected' : ''}>${escapeHtml(d.name)}${suffix}</option>`;
    });
    
    // Build vehicle options
    let vehicleOpts = '<option value="" disabled selected>-- เลือกยานพาหนะ --</option>';
    resVehicles.vehicles.forEach(v => {
        let suffix = '';
        if (!v.is_available) {
            suffix = ' [ไม่ว่าง/ติดงานอื่น]';
        }
        let typeLabel = v.type === 'sedan' ? 'รถเก๋ง' : (v.type === 'van' ? 'รถตู้' : 'รถกระบะ');
        vehicleOpts += `<option value="${v.id}" ${!v.is_available ? 'disabled style="color:var(--text-muted);"' : ''} ${b.vehicle_id == v.id ? 'selected' : ''}>[${typeLabel}] ${escapeHtml(v.brand_model)} (${escapeHtml(v.license_plate)} ${escapeHtml(v.province)}) - ไมล์: ${v.current_mileage.toLocaleString()} กม. ${suffix}</option>`;
    });
    
    const formHtml = `
        <div class="glass-panel" style="padding: 16px; margin-bottom: 20px; border-color: var(--primary-glow); background: rgba(120,80,240,0.03);">
            <h5 style="margin-bottom:8px;"><i class="fa-solid fa-circle-info"></i> รายละเอียดคำขอใช้รถ</h5>
            <p style="font-size:13px; line-height:1.6;">
                <strong>ผู้ขอ:</strong> ${escapeHtml(b.requester_name)} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>ผู้โดยสาร:</strong> ${b.passenger_count} คน <br>
                <strong>ปลายทาง:</strong> ${escapeHtml(b.destination)} <br>
                <strong>วันเดินทาง:</strong> ${formatDateTimeJS(b.start_datetime)} - ${formatDateTimeJS(b.end_datetime)}
            </p>
        </div>
        
        <form id="approve-booking-form" onsubmit="handleApproveBooking(event, ${b.id})">
            <div class="form-group">
                <label class="form-label" for="appr-driver">จัดสรรพนักงานขับรถ (แนะนำคนขับต่างจังหวัดสะสมน้อยที่สุดเพื่อความเท่าเทียม)</label>
                <select id="appr-driver" class="form-control" style="padding-left:14px;" required>
                    ${driverOpts}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="appr-vehicle">จัดสรรรถยนต์ว่างในวันเวลาดังกล่าว</label>
                <select id="appr-vehicle" class="form-control" style="padding-left:14px;" required>
                    ${vehicleOpts}
                </select>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-success">
                    <i class="fa-solid fa-circle-check"></i> อนุมัติและบันทึกจัดสรรคิว
                </button>
            </div>
        </form>
    `;
    
    openGlobalModal(b.status === 'approved' ? 'ปรับปรุงข้อมูลจัดสรรคนขับและรถยนต์' : 'อนุมัติการขอใช้รถยนต์ส่วนกลาง', formHtml);
};

window.handleApproveBooking = async function(event, id) {
    event.preventDefault();
    
    const body = {
        id: id,
        driver_id: parseInt(document.getElementById('appr-driver').value),
        vehicle_id: parseInt(document.getElementById('appr-vehicle').value)
    };
    
    const res = await apiFetch('approve_booking', 'POST', body);
    if (res.status === 'success') {
        closeGlobalModal();
        alert(res.message);
        loadBookingsView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};

// Start Trip Modal
window.startTripModal = function(bookingId, currentMileage) {
    const formHtml = `
        <form id="start-trip-form" onsubmit="handleStartTrip(event, ${bookingId})">
            <div class="form-group">
                <label class="form-label" for="trip-start-mileage">เลขไมล์เริ่มต้นขณะออกรถ (กม.)</label>
                <input type="number" id="trip-start-mileage" class="form-control" required value="${currentMileage}" min="${currentMileage}" placeholder="ระบุเลขไมล์หน้าปัดรถยนต์">
                <small class="text-muted" style="margin-top:6px; display:block;">อ้างอิงเลขไมล์ล่าสุดของรถคันนี้คือ: <strong>${currentMileage.toLocaleString()} กม.</strong> (กรอกเลขไมล์เท่าเดิมหรือมากกว่า)</small>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary"><i class="fa-solid fa-circle-play"></i> บันทึกเปิดทริปการเดินทาง</button>
            </div>
        </form>
    `;
    openGlobalModal('เริ่มเดินทาง (Start Trip) - บันทึกเปิดทริป', formHtml);
};

window.handleStartTrip = async function(event, bookingId) {
    event.preventDefault();
    const mileage = parseInt(document.getElementById('trip-start-mileage').value);
    
    const res = await apiFetch('start_trip', 'POST', {
        id: bookingId,
        start_mileage: mileage
    });
    
    if (res.status === 'success') {
        closeGlobalModal();
        alert(res.message);
        loadBookingsView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};

// Complete Trip Modal
window.completeTripModal = function(bookingId, startMileage) {
    const formHtml = `
        <form id="complete-trip-form" onsubmit="handleCompleteTrip(event, bookingId)">
            <div class="form-group">
                <p style="margin-bottom: 12px; font-size: 14px;">เลขไมล์เมื่อเริ่มทริป: <strong>${startMileage.toLocaleString()} กม.</strong></p>
                <label class="form-label" for="trip-end-mileage">เลขไมล์สิ้นสุดเมื่อเดินทางถึง (กม.)</label>
                <input type="number" id="trip-end-mileage" class="form-control" required value="${startMileage + 10}" min="${startMileage}">
                <small class="text-muted" style="margin-top:6px; display:block;">เลขไมล์สิ้นสุดต้องมีค่ามากกว่าหรือเท่ากับเลขไมล์เมื่อเริ่มทริป</small>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-success"><i class="fa-solid fa-flag-checkered"></i> บันทึกปิดทริปการเดินทาง</button>
            </div>
        </form>
    `;
    // Pass bookingId to the local scope of window handler
    window.currentTripBookingId = bookingId;
    openGlobalModal('จบการเดินทาง (Complete Trip) - บันทึกปิดทริป', formHtml);
};

window.handleCompleteTrip = async function(event, dummyId) {
    event.preventDefault();
    const bookingId = window.currentTripBookingId;
    const mileage = parseInt(document.getElementById('trip-end-mileage').value);
    
    const res = await apiFetch('complete_trip', 'POST', {
        id: bookingId,
        end_mileage: mileage
    });
    
    if (res.status === 'success') {
        closeGlobalModal();
        alert(res.message);
        loadBookingsView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};

// Open print page in a new tab
window.printBooking = function(id) {
    window.open(`print_booking.php?id=${id}`, '_blank');
};


// Helper to format days of week string (e.g. "1,2,3,4,5") into Thai day names
function formatDaysOfWeek(daysStr) {
    if (!daysStr) return '-';
    const dayNames = {
        '1': 'จันทร์', '2': 'อังคาร', '3': 'พุธ', '4': 'พฤหัสบดี',
        '5': 'ศุกร์', '6': 'เสาร์', '7': 'อาทิตย์'
    };
    return daysStr.split(',').map(d => dayNames[d] || d).join(', ');
}

// Calculate next Monday date in YYYY-MM-DD format
function getNextMondayDateStr() {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = (day === 0 ? 1 : 8 - day); // days to next Monday
    const nextMonday = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${nextMonday.getFullYear()}-${pad(nextMonday.getMonth() + 1)}-${pad(nextMonday.getDate())}`;
}

async function loadRoutineTemplatesView(container) {
    container.innerHTML = '<p class="text-secondary">กำลังโหลดข้อมูลงานประจำล่วงหน้า...</p>';
    const res = await apiFetch('get_routine_templates', 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<p class="text-danger">ไม่สามารถดึงข้อมูลตารางงานประจำได้: ' + res.message + '</p>';
        return;
    }
    
    const isAdmin = currentUser.role === 'admin';
    let rowsHtml = '';
    
    res.templates.forEach(t => {
        let typeLabel = t.vehicle_type_required === 'sedan' ? 'รถเก๋ง' : (t.vehicle_type_required === 'van' ? 'รถตู้' : 'รถกระบะ');
        
        let actionButtons = isAdmin ? `
            <button class="btn btn-secondary btn-sm" onclick="openSaveRoutineTemplateModal(${JSON.stringify(t).replace(/"/g, '&quot;')})">
                <i class="fa-solid fa-pen-to-square"></i> แก้ไข
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteRoutineTemplate(${t.id})">
                <i class="fa-solid fa-trash-can"></i> ลบ
            </button>
        ` : `<span class="text-muted" style="font-size:12px;">ดูได้อย่างเดียว</span>`;
        
        rowsHtml += `
            <tr>
                <td><strong>${escapeHtml(t.job_name)}</strong></td>
                <td><span style="color:var(--primary-light); font-weight:600;"><i class="fa-solid fa-calendar-day" style="margin-right:6px;"></i>${formatDaysOfWeek(t.days_of_week)}</span></td>
                <td><strong>${escapeHtml(t.destination)}</strong></td>
                <td><span class="text-muted" style="font-size:13px;">${escapeHtml(t.purpose)}</span></td>
                <td><span class="badge badge-info">${typeLabel}</span></td>
                <td>
                    <div style="display:flex; gap:8px;">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    });
    
    // Generator HTML box for Admin
    let generatorBoxHtml = '';
    if (isAdmin) {
        const nextMonday = getNextMondayDateStr();
        generatorBoxHtml = `
            <div class="glass-panel" style="padding: 24px; margin-bottom: 24px; border-color: var(--secondary-glow); background: rgba(80,150,240,0.02);">
                <h4 style="margin-bottom: 12px;"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--secondary); margin-right:8px;"></i>ระบบสร้างตารางเดินรถรายสัปดาห์อัตโนมัติ</h4>
                <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                    ระบุวันจันทร์ของสัปดาห์ที่ต้องการ ระบบจะนำงานประจำด้านล่างมาประมวลหาพนักงานขับรถตามคิวความเท่าเทียม (Fairness Queue) และหารถว่างเพื่อจัดตารางอนุมัติล่วงหน้าอัตโนมัติ 7 วันทันที
                </p>
                
                <form id="gen-routine-form" onsubmit="handleGenerateRoutineSchedules(event)" style="display:flex; gap:16px; align-items:flex-end; flex-wrap:wrap;">
                    <div class="form-group" style="margin-bottom:0; min-width:240px;">
                        <label class="form-label" for="gen-week-start">วันจันทร์ที่เป็นวันเริ่มต้นสัปดาห์</label>
                        <input type="date" id="gen-week-start" class="form-control" style="padding-left:14px;" required value="${nextMonday}">
                    </div>
                    <button type="submit" class="btn btn-primary" style="height:44px;">
                        <i class="fa-solid fa-gear"></i> เริ่มประมวลผลตารางประจำสัปดาห์
                    </button>
                </form>
            </div>
        `;
    }
    
    container.innerHTML = `
        ${generatorBoxHtml}
        
        <div class="glass-panel" style="padding: 24px; animation: fadeIn var(--transition-fast);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                <h3>เทมเพลตและกำหนดตารางงานประจำ (Routine Templates)</h3>
                ${isAdmin ? `
                    <button class="btn btn-primary" onclick="openSaveRoutineTemplateModal()">
                        <i class="fa-solid fa-plus"></i> เพิ่มตารางงานประจำใหม่
                    </button>
                ` : ''}
            </div>
            <div class="table-responsive">
                <table class="table-custom">
                    <thead>
                        <tr>
                            <th>ชื่องานประจำ</th>
                            <th>วันที่ทำซ้ำประจำสัปดาห์</th>
                            <th>สถานที่ปลายทาง</th>
                            <th>วัตถุประสงค์รายละเอียด</th>
                            <th>ประเภทยานพาหนะ</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="6" class="text-center text-secondary">ไม่พบรายการเทมเพลตงานประจำล่วงหน้า</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.openSaveRoutineTemplateModal = function(t = null) {
    const isEdit = t !== null;
    
    // Prepare values
    const jobName = t ? escapeHtml(t.job_name) : '';
    const destination = t ? escapeHtml(t.destination) : '';
    const purpose = t ? escapeHtml(t.purpose) : '';
    const vehType = t ? t.vehicle_type_required : 'sedan';
    
    // Days of week parsing (1=Mon, 7=Sun)
    const activeDays = t ? t.days_of_week.split(',') : [];
    
    const checkboxesHtml = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:10px; margin-top:8px;">
            <label class="checkbox-container">วันจันทร์ <input type="checkbox" id="rt-day-1" value="1" ${activeDays.includes('1') ? 'checked' : ''}><span class="checkmark"></span></label>
            <label class="checkbox-container">วันอังคาร <input type="checkbox" id="rt-day-2" value="2" ${activeDays.includes('2') ? 'checked' : ''}><span class="checkmark"></span></label>
            <label class="checkbox-container">วันพุธ <input type="checkbox" id="rt-day-3" value="3" ${activeDays.includes('3') ? 'checked' : ''}><span class="checkmark"></span></label>
            <label class="checkbox-container">วันพฤหัสบดี <input type="checkbox" id="rt-day-4" value="4" ${activeDays.includes('4') ? 'checked' : ''}><span class="checkmark"></span></label>
            <label class="checkbox-container">วันศุกร์ <input type="checkbox" id="rt-day-5" value="5" ${activeDays.includes('5') ? 'checked' : ''}><span class="checkmark"></span></label>
            <label class="checkbox-container">วันเสาร์ <input type="checkbox" id="rt-day-6" value="6" ${activeDays.includes('6') ? 'checked' : ''}><span class="checkmark"></span></label>
            <label class="checkbox-container">วันอาทิตย์ <input type="checkbox" id="rt-day-7" value="7" ${activeDays.includes('7') ? 'checked' : ''}><span class="checkmark"></span></label>
        </div>
    `;
    
    const formHtml = `
        <form id="routine-template-form" onsubmit="handleSaveRoutineTemplate(event, ${isEdit ? t.id : 0})">
            <div class="form-group">
                <label class="form-label" for="rt-job-name">ชื่อคิวงานประจำ</label>
                <input type="text" id="rt-job-name" class="form-control" required value="${jobName}" placeholder="e.g. งานทำธุรกรรมธนาคารประจำวัน, วิ่งรับส่งหนังสือราชการ">
            </div>
            
            <div class="form-group">
                <label class="form-label">ทำซ้ำทุกวันจันทร์ - อาทิตย์ (เลือกได้หลายวัน)</label>
                ${checkboxesHtml}
            </div>
            
            <div class="form-group">
                <label class="form-label" for="rt-dest">สถานที่ปลายทาง</label>
                <input type="text" id="rt-dest" class="form-control" required value="${destination}" placeholder="ระบุปลายทาง">
            </div>
            
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="rt-purpose">วัตถุประสงค์โดยย่อ</label>
                    <input type="text" id="rt-purpose" class="form-control" required value="${purpose}" placeholder="ระบุวัตถุประสงค์ในการขอใช้รถ">
                </div>
                <div class="form-group">
                    <label class="form-label" for="rt-veh-type">ประเภทรถยนต์ที่กำหนดใช้</label>
                    <select id="rt-veh-type" class="form-control" style="padding-left:14px;">
                        <option value="sedan" ${vehType === 'sedan' ? 'selected' : ''}>รถเก๋ง (Sedan)</option>
                        <option value="van" ${vehType === 'van' ? 'selected' : ''}>รถตู้ (Van)</option>
                        <option value="pickup" ${vehType === 'pickup' ? 'selected' : ''}>รถกระบะ (Pickup)</option>
                    </select>
                </div>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">บันทึกเทมเพลต</button>
            </div>
        </form>
    `;
    
    openGlobalModal(isEdit ? 'แก้ไขข้อมูลเทมเพลตงานประจำ' : 'กำหนดเทมเพลตงานประจำล่วงหน้าใหม่', formHtml);
};

window.handleSaveRoutineTemplate = async function(event, id) {
    event.preventDefault();
    
    // Grab selected days of week
    const daysSelected = [];
    for (let i = 1; i <= 7; i++) {
        const checkbox = document.getElementById(`rt-day-${i}`);
        if (checkbox && checkbox.checked) {
            daysSelected.push(i);
        }
    }
    
    if (daysSelected.length === 0) {
        alert("กรุณาเลือกวันในการจัดส่งงานประจำอย่างน้อย 1 วัน");
        return;
    }
    
    const body = {
        id: id,
        job_name: document.getElementById('rt-job-name').value.trim(),
        days_of_week: daysSelected.join(','),
        destination: document.getElementById('rt-dest').value.trim(),
        purpose: document.getElementById('rt-purpose').value.trim(),
        vehicle_type_required: document.getElementById('rt-veh-type').value
    };
    
    const res = await apiFetch('save_routine_template', 'POST', body);
    if (res.status === 'success') {
        closeGlobalModal();
        alert(res.message);
        loadRoutineTemplatesView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};

window.deleteRoutineTemplate = async function(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเทมเพลตงานประจำรายการนี้?')) return;
    
    const res = await apiFetch('delete_routine_template', 'POST', { id: id });
    if (res.status === 'success') {
        alert(res.message);
        loadRoutineTemplatesView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};

window.handleGenerateRoutineSchedules = async function(event) {
    event.preventDefault();
    const weekStartVal = document.getElementById('gen-week-start').value;
    if (!weekStartVal) {
        alert("กรุณาระบุวันจันทร์ของสัปดาห์ที่ต้องการจัดตาราง");
        return;
    }
    
    // Check if the selected date is indeed a Monday (optional warning)
    const dateObj = new Date(weekStartVal);
    if (dateObj.getDay() !== 1) { // 1 is Monday
        if (!confirm("วันที่คุณเลือกไม่ตรงกับวันจันทร์ ระบบจะประมวลผลตั้งค่าคิวตารางงาน 7 วันเริ่มจากวันที่เลือกนี้ ยืนยันที่จะดำเนินการหรือไม่?")) {
            return;
        }
    }
    
    if (!confirm("ยืนยันการเริ่มประมวลผลจัดสรรรถยนต์และคนขับรายสัปดาห์ตามคิวความเท่าเทียม?")) return;
    
    openGlobalModal('กำลังดำเนินการ...', '<p class="text-secondary">ระบบกำลังจัดลำดับ Fairness Queue คัดสรรพนักงานขับรถและรถที่ว่างอัตโนมัติ...</p>');
    
    const res = await apiFetch('generate_routine_schedules', 'POST', { week_start: weekStartVal });
    
    closeGlobalModal();
    
    if (res.status === 'success') {
        alert(res.message);
        loadRoutineTemplatesView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};


// --- VEHICLES MANAGEMENT VIEW ---
async function loadVehiclesView(container) {
    container.innerHTML = '<p class="text-secondary">กำลังโหลดข้อมูลรถยนต์...</p>';
    const res = await apiFetch('get_vehicles', 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<p class="text-danger">ไม่สามารถดึงข้อมูลยานพาหนะได้: ' + res.message + '</p>';
        return;
    }
    
    const isAdmin = currentUser.role === 'admin';
    let rowsHtml = '';
    res.vehicles.forEach(v => {
        let statusBadge = '';
        if (v.status === 'available') statusBadge = '<span class="badge badge-success"><span class="badge-dot"></span>พร้อมใช้งาน</span>';
        else if (v.status === 'active') statusBadge = '<span class="badge badge-info"><span class="badge-dot"></span>กำลังใช้งาน</span>';
        else if (v.status === 'maintenance') statusBadge = '<span class="badge badge-warning"><span class="badge-dot"></span>ส่งซ่อม</span>';
        else if (v.status === 'retired') statusBadge = '<span class="badge badge-danger"><span class="badge-dot"></span>ปลดระวาง</span>';
        
        let typeLabel = v.type === 'sedan' ? 'รถเก๋ง' : (v.type === 'van' ? 'รถตู้' : 'รถกระบะ');
        
        let actionButtons = isAdmin ? `
            <button class="btn btn-secondary btn-sm" onclick="editVehicleModal(${JSON.stringify(v).replace(/"/g, '&quot;')})">
                <i class="fa-solid fa-pen-to-square"></i> แก้ไข
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteVehicle(${v.id})">
                <i class="fa-solid fa-trash-can"></i> ลบ
            </button>
        ` : `<span class="text-muted" style="font-size:12px;">ดูได้อย่างเดียว</span>`;
        
        rowsHtml += `
            <tr>
                <td><strong>${escapeHtml(v.license_plate)}</strong><br><span class="text-muted" style="font-size:12px;">${escapeHtml(v.province)}</span></td>
                <td>${escapeHtml(v.brand_model)}</td>
                <td>${typeLabel} (${v.seats} ที่นั่ง)</td>
                <td><strong>${v.current_mileage.toLocaleString()} กม.</strong></td>
                <td>${statusBadge}</td>
                <td style="font-size:12px; line-height:1.4;">
                    ภาษีหมด: ${v.tax_expiry}<br>
                    พรบ.หมด: ${v.prb_expiry}<br>
                    ประกันหมด: ${v.insurance_expiry}
                </td>
                <td>
                    <div style="display:flex; gap:8px;">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = `
        <div class="glass-panel" style="padding: 24px; animation: fadeIn var(--transition-fast);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                <h3>ข้อมูลยานพาหนะหลัก (Vehicle Management)</h3>
                ${isAdmin ? `
                    <button class="btn btn-primary" onclick="editVehicleModal()">
                        <i class="fa-solid fa-car-on"></i> เพิ่มรถยนต์ใหม่
                    </button>
                ` : ''}
            </div>
            <div class="table-responsive">
                <table class="table-custom">
                    <thead>
                        <tr>
                            <th>ทะเบียน / จังหวัด</th>
                            <th>ยี่ห้อ / รุ่น</th>
                            <th>ประเภท / ที่นั่ง</th>
                            <th>เลขไมล์ปัจจุบัน</th>
                            <th>สถานะการใช้งาน</th>
                            <th>วันหมดอายุเอกสาร</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="7" class="text-center text-secondary">ไม่พบข้อมูลยานพาหนะ</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.editVehicleModal = function(v = null) {
    const isEdit = v !== null;
    const formHtml = `
        <form id="vehicle-form" onsubmit="handleSaveVehicle(event, ${isEdit ? v.id : 0})">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="v-plate">ทะเบียนรถ</label>
                    <input type="text" id="v-plate" class="form-control" required value="${v ? escapeHtml(v.license_plate) : ''}" placeholder="e.g. กข 1234">
                </div>
                <div class="form-group">
                    <label class="form-label" for="v-province">จังหวัด</label>
                    <input type="text" id="v-province" class="form-control" required value="${v ? escapeHtml(v.province) : ''}" placeholder="e.g. กรุงเทพมหานคร">
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:2fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="v-brand">ยี่ห้อ / รุ่น</label>
                    <input type="text" id="v-brand" class="form-control" required value="${v ? escapeHtml(v.brand_model) : ''}" placeholder="e.g. Toyota Camry">
                </div>
                <div class="form-group">
                    <label class="form-label" for="v-type">ประเภทรถ</label>
                    <select id="v-type" class="form-control" style="padding-left:14px;">
                        <option value="sedan" ${v && v.type === 'sedan' ? 'selected' : ''}>รถเก๋ง (Sedan)</option>
                        <option value="van" ${v && v.type === 'van' ? 'selected' : ''}>รถตู้ (Van)</option>
                        <option value="pickup" ${v && v.type === 'pickup' ? 'selected' : ''}>รถกระบะ (Pickup)</option>
                    </select>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="v-seats">จำนวนที่นั่ง</label>
                    <input type="number" id="v-seats" class="form-control" required value="${v ? v.seats : 5}" min="1">
                </div>
                <div class="form-group">
                    <label class="form-label" for="v-mileage">เลขไมล์ปัจจุบัน</label>
                    <input type="number" id="v-mileage" class="form-control" required value="${v ? v.current_mileage : 0}" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label" for="v-status">สถานะรถ</label>
                    <select id="v-status" class="form-control" style="padding-left:14px;">
                        <option value="available" ${v && v.status === 'available' ? 'selected' : ''}>พร้อมใช้งาน</option>
                        <option value="active" ${v && v.status === 'active' ? 'selected' : ''}>กำลังใช้งาน</option>
                        <option value="maintenance" ${v && v.status === 'maintenance' ? 'selected' : ''}>ส่งซ่อม</option>
                        <option value="retired" ${v && v.status === 'retired' ? 'selected' : ''}>ปลดระวาง</option>
                    </select>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="v-tax">วันหมดอายุภาษี</label>
                    <input type="date" id="v-tax" class="form-control" required value="${v ? v.tax_expiry : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="v-prb">วันหมดอายุ พรบ.</label>
                    <input type="date" id="v-prb" class="form-control" required value="${v ? v.prb_expiry : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="v-ins">วันหมดอายุประกันภัย</label>
                    <input type="date" id="v-ins" class="form-control" required value="${v ? v.insurance_expiry : ''}">
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="v-last-service">ไมล์เช็คศูนย์ล่าสุด</label>
                    <input type="number" id="v-last-service" class="form-control" required value="${v ? v.last_service_mileage : 0}" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label" for="v-service-interval">ระยะทางสำหรับเช็คศูนย์รอบถัดไป (กม.)</label>
                    <input type="number" id="v-service-interval" class="form-control" required value="${v ? v.service_interval : 10000}" min="100">
                </div>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">บันทึกข้อมูล</button>
            </div>
        </form>
    `;
    openGlobalModal(isEdit ? 'แก้ไขข้อมูลรถยนต์' : 'เพิ่มรถยนต์คันใหม่', formHtml);
};

window.handleSaveVehicle = async function(event, id) {
    event.preventDefault();
    const body = {
        id: id,
        license_plate: document.getElementById('v-plate').value.trim(),
        province: document.getElementById('v-province').value.trim(),
        brand_model: document.getElementById('v-brand').value.trim(),
        type: document.getElementById('v-type').value,
        seats: parseInt(document.getElementById('v-seats').value),
        status: document.getElementById('v-status').value,
        tax_expiry: document.getElementById('v-tax').value,
        prb_expiry: document.getElementById('v-prb').value,
        insurance_expiry: document.getElementById('v-ins').value,
        current_mileage: parseInt(document.getElementById('v-mileage').value),
        last_service_mileage: parseInt(document.getElementById('v-last-service').value),
        service_interval: parseInt(document.getElementById('v-service-interval').value)
    };
    
    const res = await apiFetch('save_vehicle', 'POST', body);
    if (res.status === 'success') {
        closeGlobalModal();
        alert(res.message);
        loadVehiclesView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};

window.deleteVehicle = async function(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรถยนต์คันนี้?')) return;
    const res = await apiFetch('delete_vehicle', 'POST', { id: id });
    if (res.status === 'success') {
        alert(res.message);
        loadVehiclesView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};


// --- DRIVERS MANAGEMENT VIEW ---
async function loadDriversView(container) {
    container.innerHTML = '<p class="text-secondary">กำลังโหลดข้อมูลคนขับรถ...</p>';
    const res = await apiFetch('get_drivers', 'GET');
    if (res.status !== 'success') {
        container.innerHTML = '<p class="text-danger">ไม่สามารถดึงข้อมูลพนักงานขับรถได้: ' + res.message + '</p>';
        return;
    }
    
    const isAdmin = currentUser.role === 'admin';
    let rowsHtml = '';
    res.drivers.forEach(d => {
        let statusBadge = '';
        if (d.status === 'active') statusBadge = '<span class="badge badge-success"><span class="badge-dot"></span>พร้อมขับ</span>';
        else if (d.status === 'vacation') statusBadge = '<span class="badge badge-warning"><span class="badge-dot"></span>ลาพักร้อน</span>';
        else if (d.status === 'sick') statusBadge = '<span class="badge badge-danger"><span class="badge-dot"></span>ลาป่วย</span>';
        
        let actionButtons = isAdmin ? `
            <button class="btn btn-secondary btn-sm" onclick="editDriverModal(${JSON.stringify(d).replace(/"/g, '&quot;')})">
                <i class="fa-solid fa-pen-to-square"></i> แก้ไข
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteDriver(${d.id})">
                <i class="fa-solid fa-trash-can"></i> ลบ
            </button>
        ` : `<span class="text-muted" style="font-size:12px;">ดูได้อย่างเดียว</span>`;
        
        let lastTrip = d.last_out_of_town_date ? d.last_out_of_town_date : '<span class="text-muted">-</span>';
        
        rowsHtml += `
            <tr>
                <td><strong>${escapeHtml(d.name)}</strong></td>
                <td>${escapeHtml(d.phone)}</td>
                <td><code>${escapeHtml(d.license_number)}</code></td>
                <td>${d.license_expiry}</td>
                <td><strong>${d.out_of_town_count} ครั้ง</strong></td>
                <td style="font-size:12px;">${lastTrip}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex; gap:8px;">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = `
        <div class="glass-panel" style="padding: 24px; animation: fadeIn var(--transition-fast);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                <h3>ข้อมูลคนขับรถและสถิติสะสม (Driver Management)</h3>
                ${isAdmin ? `
                    <button class="btn btn-primary" onclick="editDriverModal()">
                        <i class="fa-solid fa-user-plus"></i> เพิ่มคนขับรถใหม่
                    </button>
                ` : ''}
            </div>
            <div class="table-responsive">
                <table class="table-custom">
                    <thead>
                        <tr>
                            <th>ชื่อ-นามสกุล</th>
                            <th>เบอร์โทรศัพท์</th>
                            <th>เลขที่ใบขับขี่</th>
                            <th>วันหมดอายุใบขับขี่</th>
                            <th>ทริปต่างจังหวัดสะสม</th>
                            <th>เดินทางล่าสุด</th>
                            <th>สถานะการทำงาน</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="8" class="text-center text-secondary">ไม่พบข้อมูลพนักงานขับรถ</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.editDriverModal = function(d = null) {
    const isEdit = d !== null;
    const formHtml = `
        <form id="driver-form" onsubmit="handleSaveDriver(event, ${isEdit ? d.id : 0})">
            <div class="form-group">
                <label class="form-label" for="d-name">ชื่อ-นามสกุล</label>
                <input type="text" id="d-name" class="form-control" required value="${d ? escapeHtml(d.name) : ''}" placeholder="ชื่อจริง - นามสกุล">
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="d-phone">เบอร์โทรศัพท์</label>
                    <input type="text" id="d-phone" class="form-control" required value="${d ? escapeHtml(d.phone) : ''}" placeholder="e.g. 081-234-5678">
                </div>
                <div class="form-group">
                    <label class="form-label" for="d-status">สถานะปฏิบัติงาน</label>
                    <select id="d-status" class="form-control" style="padding-left:14px;">
                        <option value="active" ${d && d.status === 'active' ? 'selected' : ''}>พร้อมขับงาน</option>
                        <option value="vacation" ${d && d.status === 'vacation' ? 'selected' : ''}>ลางาน / ลาพักร้อน</option>
                        <option value="sick" ${d && d.status === 'sick' ? 'selected' : ''}>ลาป่วย</option>
                    </select>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="d-license">เลขที่ใบอนุญาตขับขี่</label>
                    <input type="text" id="d-license" class="form-control" required value="${d ? escapeHtml(d.license_number) : ''}" placeholder="e.g. DL-123456">
                </div>
                <div class="form-group">
                    <label class="form-label" for="d-expiry">วันหมดอายุใบอนุญาต</label>
                    <input type="date" id="d-expiry" class="form-control" required value="${d ? d.license_expiry : ''}">
                </div>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">บันทึกข้อมูล</button>
            </div>
        </form>
    `;
    openGlobalModal(isEdit ? 'แก้ไขข้อมูลพนักงานขับรถ' : 'เพิ่มพนักงานขับรถใหม่', formHtml);
};

window.handleSaveDriver = async function(event, id) {
    event.preventDefault();
    const body = {
        id: id,
        name: document.getElementById('d-name').value.trim(),
        phone: document.getElementById('d-phone').value.trim(),
        license_number: document.getElementById('d-license').value.trim(),
        license_expiry: document.getElementById('d-expiry').value,
        status: document.getElementById('d-status').value
    };
    
    const res = await apiFetch('save_driver', 'POST', body);
    if (res.status === 'success') {
        closeGlobalModal();
        alert(res.message);
        loadDriversView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};

window.deleteDriver = async function(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบพนักงานขับรถรายนี้?')) return;
    const res = await apiFetch('delete_driver', 'POST', { id: id });
    if (res.status === 'success') {
        alert(res.message);
        loadDriversView(document.getElementById('main-content'));
    } else {
        alert(res.message);
    }
};


// --- ORG & USER MANAGEMENT VIEW ---
let activeOrgTab = 'users';

async function loadOrgView(container) {
    if (currentUser.role !== 'admin') {
        container.innerHTML = `
            <div class="glass-panel text-center" style="padding: 40px; animation: fadeIn var(--transition-normal);">
                <i class="fa-solid fa-lock" style="font-size: 48px; color: var(--danger); margin-bottom: 16px;"></i>
                <h3>สิทธิ์ไม่เพียงพอ</h3>
                <p class="text-secondary" style="margin-top: 10px;">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการบัญชีผู้ใช้งานและโครงสร้างองค์กรได้</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="tab-container" style="margin-bottom: 24px; display: flex; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; flex-wrap:wrap;">
            <button class="btn ${activeOrgTab === 'users' ? 'btn-primary' : 'btn-secondary'}" onclick="switchOrgTab('users')">
                <i class="fa-solid fa-users-gear"></i> ผู้ใช้งานและสิทธิ์ระบบ
            </button>
            <button class="btn ${activeOrgTab === 'structure' ? 'btn-primary' : 'btn-secondary'}" onclick="switchOrgTab('structure')">
                <i class="fa-solid fa-sitemap"></i> โครงสร้างองค์กร (ตำแหน่ง/ส่วน/งาน)
            </button>
        </div>
        <div id="org-tab-content">
            <p class="text-secondary">กำลังโหลดข้อมูล...</p>
        </div>
    `;
    
    renderOrgTabContent();
}

window.switchOrgTab = function(tabName) {
    activeOrgTab = tabName;
    loadOrgView(document.getElementById('main-content'));
};

async function renderOrgTabContent() {
    const contentDiv = document.getElementById('org-tab-content');
    if (!contentDiv) return;
    
    if (activeOrgTab === 'users') {
        contentDiv.innerHTML = '<p class="text-secondary">กำลังโหลดข้อมูลผู้ใช้งาน...</p>';
        const [orgRes, usersRes] = await Promise.all([
            apiFetch('get_org_data', 'GET'),
            apiFetch('get_users', 'GET')
        ]);
        
        if (orgRes.status !== 'success' || usersRes.status !== 'success') {
            contentDiv.innerHTML = '<p class="text-danger">ไม่สามารถโหลดข้อมูลระบบองค์กรได้</p>';
            return;
        }
        
        const titles = orgRes.titles;
        const departments = orgRes.departments;
        const divisions = orgRes.divisions;
        const users = usersRes.users;
        
        // Cache these for user creation/editing
        window.cachedTitles = titles;
        window.cachedDepts = departments;
        window.cachedDivs = divisions;
        
        let rowsHtml = '';
        users.forEach(u => {
            const systemBadges = u.systems.map(sys => `
                <span class="badge ${sys === 'fleetflow' ? 'badge-info' : 'badge-success'}">
                    ${sys}
                </span>
            `).join(' ') || '<span class="text-muted" style="font-size:12px;">ไม่มีสิทธิ์</span>';
            
            rowsHtml += `
                <tr>
                    <td><strong>${escapeHtml(u.fullname)}</strong></td>
                    <td><code>${escapeHtml(u.username)}</code></td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}">${u.role === 'admin' ? 'Admin' : 'Staff'}</span></td>
                    <td>${escapeHtml(u.title_name || '-')}</td>
                    <td>${escapeHtml(u.dept_name || '-')} / ${escapeHtml(u.div_name || '-')}</td>
                    <td>${systemBadges}</td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-secondary btn-sm" onclick="editUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">
                                <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">
                                <i class="fa-solid fa-trash-can"></i> ลบ
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        contentDiv.innerHTML = `
            <div class="glass-panel" style="padding: 24px; animation: fadeIn var(--transition-fast);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                    <h4>รายชื่อผู้ใช้งานและสิทธิ์เข้าใช้ระบบย่อย</h4>
                    <button class="btn btn-primary" onclick="editUserModal()">
                        <i class="fa-solid fa-user-plus"></i> เพิ่มผู้ใช้งานใหม่
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="table-custom">
                        <thead>
                            <tr>
                                <th>ชื่อ-นามสกุล</th>
                                <th>Username</th>
                                <th>บทบาท</th>
                                <th>ตำแหน่ง</th>
                                <th>ส่วน / งาน</th>
                                <th>สิทธิ์ระบบย่อย</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml || '<tr><td colspan="7" class="text-center text-secondary">ไม่พบข้อมูลผู้ใช้</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
    } else {
        contentDiv.innerHTML = '<p class="text-secondary">กำลังโหลดข้อมูลผังโครงสร้างองค์กร...</p>';
        const res = await apiFetch('get_org_data', 'GET');
        if (res.status !== 'success') {
            contentDiv.innerHTML = '<p class="text-danger">ไม่สามารถโหลดข้อมูลโครงสร้างองค์กรได้</p>';
            return;
        }
        
        const renderList = (type, items) => {
            let listHtml = '';
            items.forEach(item => {
                listHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid var(--border-color); background: rgba(255,255,255,0.01);">
                        <span>${escapeHtml(item.name)} ${type === 'div' && item.dept_name ? `<small class="text-muted">(${escapeHtml(item.dept_name)})</small>` : ''}</span>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-secondary btn-sm" style="padding:4px 8px;" onclick="editOrgItemModal('${type}', ${item.id}, '${escapeHtml(item.name)}', ${type === 'div' ? item.department_id : 'null'})">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" style="padding:4px 8px;" onclick="deleteOrgItem('${type}', ${item.id})">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            let label = type === 'title' ? 'ตำแหน่ง' : (type === 'dept' ? 'ส่วน' : 'งาน');
            return `
                <div class="col-4 glass-panel" style="padding: 20px; display:flex; flex-direction:column; min-height:400px; animation: fadeIn var(--transition-fast);">
                    <h4 style="margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                        <i class="fa-solid fa-folder-tree"></i> ข้อมูล${label}
                    </h4>
                    <div style="flex:1; overflow-y:auto; margin-bottom:16px; max-height:300px;">
                        ${listHtml || '<p class="text-secondary text-center">ไม่มีข้อมูล</p>'}
                    </div>
                    <form onsubmit="handleSaveOrgItem(event, '${type}', 0)">
                        ${type === 'div' ? `
                            <select class="form-control" style="margin-bottom:8px; padding:8px;" id="new-dept-div" required>
                                <option value="" disabled selected>เลือกส่วนงานต้นสังกัด...</option>
                                ${window.cachedDepts.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')}
                            </select>
                        ` : ''}
                        <div style="display:flex; gap:8px;">
                            <input type="text" class="form-control" placeholder="เพิ่ม${label}ใหม่" required id="new-name-${type}">
                            <button type="submit" class="btn btn-primary" style="padding:10px 14px;"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    </form>
                </div>
            `;
        };
        
        contentDiv.innerHTML = `
            <div class="panel-grid" style="grid-template-columns: 1fr 1fr;">
                ${renderList('dept', res.departments)}
                ${renderList('div', res.divisions)}
            </div>
        `;
    }
}

window.filterUserDivisions = function() {
    const deptId = document.getElementById('user-dept').value;
    const divSelect = document.getElementById('user-div');
    const currentVal = divSelect.value;
    
    const divs = window.cachedDivs || [];
    const filteredDivs = divs.filter(dv => dv.department_id == deptId);
    
    let opts = '<option value="">-- เลือกงาน --</option>';
    filteredDivs.forEach(dv => {
        opts += `<option value="${dv.id}" ${currentVal == dv.id ? 'selected' : ''}>${escapeHtml(dv.name)}</option>`;
    });
    divSelect.innerHTML = opts;
    
    if (!filteredDivs.find(dv => dv.id == currentVal)) {
        divSelect.value = '';
    }
};

window.editUserModal = function(user = null) {
    const isEdit = user !== null;
    const depts = window.cachedDepts || [];
    const divs = window.cachedDivs || [];
    
    const deptOpts = depts.map(d => `<option value="${d.id}" ${user && user.department_id == d.id ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('');
    
    let initialDivs = divs;
    if (user && user.department_id) {
        initialDivs = divs.filter(dv => dv.department_id == user.department_id);
    }
    const divOpts = initialDivs.map(dv => `<option value="${dv.id}" ${user && user.division_id == dv.id ? 'selected' : ''}>${escapeHtml(dv.name)}</option>`).join('');
    
    const hasFleetflow = user ? user.systems.includes('fleetflow') : true;
    const hasEdocument = user ? user.systems.includes('e-document') : false;
    
    const formHtml = `
        <form id="user-form" onsubmit="handleSaveUser(event, ${isEdit ? user.id : 0})">
            <div class="form-group">
                <label class="form-label" for="user-fullname">ชื่อ-นามสกุล</label>
                <input type="text" id="user-fullname" class="form-control" required value="${user ? escapeHtml(user.fullname) : ''}">
            </div>
            
            <div class="form-group">
                <label class="form-label" for="user-username">Username</label>
                <input type="text" id="user-username" class="form-control" required value="${user ? escapeHtml(user.username) : ''}">
            </div>
            
            <div class="form-group">
                <label class="form-label" for="user-password">รหัสผ่าน ${isEdit ? '(เว้นว่างหากไม่ต้องการเปลี่ยน)' : ''}</label>
                <input type="password" id="user-password" class="form-control" ${isEdit ? '' : 'required'}>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="user-role">บทบาท</label>
                    <select id="user-role" class="form-control" style="padding-left:14px;">
                        <option value="staff" ${user && user.role === 'staff' ? 'selected' : ''}>Staff (ผู้ใช้ทั่วไป)</option>
                        <option value="admin" ${user && user.role === 'admin' ? 'selected' : ''}>Admin (ผู้ดูแลระบบ)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="user-title">ตำแหน่ง</label>
                    <input type="text" id="user-title" class="form-control" placeholder="กรอกตำแหน่ง..." required value="${user ? escapeHtml(user.title || user.title_name || '') : ''}">
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="user-dept">ส่วนงาน</label>
                    <select id="user-dept" class="form-control" style="padding-left:14px;" onchange="filterUserDivisions()">
                        <option value="">-- เลือกส่วน --</option>
                        ${deptOpts}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="user-div">งานย่อย</label>
                    <select id="user-div" class="form-control" style="padding-left:14px;">
                        <option value="">-- เลือกงาน --</option>
                        ${divOpts}
                    </select>
                </div>
            </div>
            
            <div class="form-group" style="margin-top:10px;">
                <label class="form-label">สิทธิ์การเข้าใช้งานระบบย่อย</label>
                <div style="display:flex; gap:20px; margin-top:8px;">
                    <label class="checkbox-container">
                        FleetFlow (ระบบจัดยานพาหนะ)
                        <input type="checkbox" id="sys-fleetflow" value="fleetflow" ${hasFleetflow ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                    <label class="checkbox-container">
                        e-Document (ระบบสารบรรณ)
                        <input type="checkbox" id="sys-edocument" value="e-document" ${hasEdocument ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </div>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">บันทึกข้อมูล</button>
            </div>
        </form>
    `;
    
    openGlobalModal(isEdit ? 'แก้ไขบัญชีผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่', formHtml);
};

window.handleSaveUser = async function(event, id) {
    event.preventDefault();
    
    const systems = [];
    if (document.getElementById('sys-fleetflow').checked) systems.push('fleetflow');
    if (document.getElementById('sys-edocument').checked) systems.push('e-document');
    
    const body = {
        id: id,
        fullname: document.getElementById('user-fullname').value.trim(),
        username: document.getElementById('user-username').value.trim(),
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value,
        title: document.getElementById('user-title').value.trim(),
        department_id: document.getElementById('user-dept').value || null,
        division_id: document.getElementById('user-div').value || null,
        systems: systems
    };
    
    const res = await apiFetch('save_user', 'POST', body);
    if (res.status === 'success') {
        closeGlobalModal();
        alert(res.message);
        renderOrgTabContent();
    } else {
        alert(res.message);
    }
};

window.deleteUser = async function(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ใช้นี้?')) return;
    
    const res = await apiFetch('delete_user', 'POST', { id: id });
    if (res.status === 'success') {
        alert(res.message);
        renderOrgTabContent();
    } else {
        alert(res.message);
    }
};

window.handleSaveOrgItem = async function(event, type, id, inlineName = null, inlineDeptId = null) {
    if (event) event.preventDefault();
    
    const nameVal = inlineName || document.getElementById(`new-name-${type}`).value.trim();
    if (!nameVal) return;
    
    let deptIdVal = inlineDeptId;
    if (!deptIdVal && type === 'div') {
        const selectEl = document.getElementById(`new-dept-div`);
        if (selectEl) deptIdVal = selectEl.value;
    }
    
    const payload = {
        type: type,
        id: id,
        name: nameVal
    };
    if (type === 'div' && deptIdVal) {
        payload.department_id = deptIdVal;
    }
    
    const res = await apiFetch('save_org_item', 'POST', payload);
    
    if (res.status === 'success') {
        if (!inlineName) document.getElementById(`new-name-${type}`).value = '';
        else closeGlobalModal();
        
        renderOrgTabContent();
    } else {
        alert(res.message);
    }
};

window.editOrgItemModal = function(type, id, currentName, currentDeptId = null) {
    let label = type === 'title' ? 'ตำแหน่ง' : (type === 'dept' ? 'ส่วน' : 'งาน');
    
    let extraField = '';
    if (type === 'div') {
        extraField = `
            <div class="form-group">
                <label class="form-label">สังกัดส่วน</label>
                <select id="edit-org-dept-id" class="form-control" required>
                    <option value="" disabled>เลือกส่วนงานต้นสังกัด...</option>
                    ${window.cachedDepts.map(d => `<option value="${d.id}" ${d.id == currentDeptId ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('')}
                </select>
            </div>
        `;
    }
    
    const formHtml = `
        <form onsubmit="handleSaveOrgItem(event, '${type}', ${id}, document.getElementById('edit-org-name').value.trim(), ${type === 'div' ? "document.getElementById('edit-org-dept-id').value" : "null"})">
            ${extraField}
            <div class="form-group">
                <label class="form-label">ชื่อ${label}</label>
                <input type="text" id="edit-org-name" class="form-control" value="${escapeHtml(currentName)}" required>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">บันทึก</button>
            </div>
        </form>
    `;
    openGlobalModal(`แก้ไขชื่อ${label}`, formHtml);
};

window.deleteOrgItem = async function(type, id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการโครงสร้างนี้?')) return;
    
    const res = await apiFetch('delete_org_item', 'POST', { type: type, id: id });
    if (res.status === 'success') {
        renderOrgTabContent();
    } else {
        alert(res.message);
    }
};


// Modal global elements helper
window.openGlobalModal = function(title, contentHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = contentHtml;
    document.getElementById('global-modal').classList.add('open');
};

window.closeGlobalModal = function() {
    document.getElementById('global-modal').classList.remove('open');
    document.getElementById('modal-body').innerHTML = '';
};

// Helper to escape HTML characters
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
