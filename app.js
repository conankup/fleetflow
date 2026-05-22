// app.js - Frontend application controller for FleetFlow

// Global Application State
let currentUser = null;
let currentView = 'dashboard';

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
    document.getElementById('profile-dept').textContent = currentUser.title + ' / ' + currentUser.division;
    
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
        default:
            pageTitle.textContent = 'หน้ากระดาษว่างเปล่า';
            mainContent.innerHTML = '<p class="text-secondary">กำลังปรับปรุงหน้านี้</p>';
    }
}

// --- DUMMY PLACEHOLDERS FOR DYNAMIC VIEWS ---
// We will replace these functions as we code each feature.
function loadDashboardView(container) {
    container.innerHTML = `
        <div class="glass-panel" style="padding: 24px; animation: fadeIn var(--transition-normal);">
            <h3>ยินดีต้อนรับสู่ FleetFlow</h3>
            <p style="color: var(--text-secondary); margin-top: 10px;">
                ระบบได้รับการติดตั้งเรียบร้อยแล้ว ท่านสามารถเลือกเมนูด้านซ้ายเพื่อเริ่มตั้งค่าข้อมูลและใช้งานระบบ
            </p>
        </div>
    `;
}

function loadCalendarView(container) {
    container.innerHTML = `<div class="glass-panel" style="padding: 24px;"><p class="text-secondary">กำลังพัฒนาระบบปฏิทินในส่วนงานถัดไป...</p></div>`;
}

function loadBookingsView(container) {
    container.innerHTML = `<div class="glass-panel" style="padding: 24px;"><p class="text-secondary">กำลังพัฒนาระบบจองรถในส่วนงานถัดไป...</p></div>`;
}

function loadRoutineTemplatesView(container) {
    container.innerHTML = `<div class="glass-panel" style="padding: 24px;"><p class="text-secondary">กำลังพัฒนาระบบตั้งค่าตารางงานประจำในส่วนงานถัดไป...</p></div>`;
}

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
