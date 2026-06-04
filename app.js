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
window.openSaveBookingModal = function(b = null) {
    const isEdit = b !== null;
    
    // Prepare values
    const requester = b ? escapeHtml(b.requester_name) : escapeHtml(currentUser.fullname);
    const destination = b ? escapeHtml(b.destination) : '';
    const purpose = b ? escapeHtml(b.purpose) : '';
    const passengers = b ? b.passenger_count : 1;
    
    const startDT = b ? b.start_datetime.replace(' ', 'T').substring(0, 16) : '';
    const endDT = b ? b.end_datetime.replace(' ', 'T').substring(0, 16) : '';
    
    const formHtml = `
        <form id="booking-request-form" onsubmit="handleSaveBooking(event, ${isEdit ? b.id : 0})">
            <div class="form-group">
                <label class="form-label" for="bk-requester">ชื่อผู้ขอใช้รถ / ส่วนงานที่แจ้งจอง</label>
                <input type="text" id="bk-requester" class="form-control" required value="${requester}" placeholder="ระบุชื่อผู้ขอใช้หรือแผนก">
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="bk-start">วันและเวลาเดินทางไป</label>
                    <input type="datetime-local" id="bk-start" class="form-control" required value="${startDT}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="bk-end">วันและเวลาเดินทางกลับ</label>
                    <input type="datetime-local" id="bk-end" class="form-control" required value="${endDT}">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="bk-dest">สถานที่ปลายทาง (โปรดระบุต่างจังหวัดด้วยหากไปนอกพื้นที่ เช่น จ.ชลบุรี (ต่างจังหวัด))</label>
                <input type="text" id="bk-dest" class="form-control" required value="${destination}" placeholder="ระบุสถานที่ปลายทางและจังหวัด">
            </div>
            
            <div style="display:grid; grid-template-columns:2fr 1fr; gap:16px;">
                <div class="form-group">
                    <label class="form-label" for="bk-purpose">วัตถุประสงค์ในการขอใช้รถ</label>
                    <input type="text" id="bk-purpose" class="form-control" required value="${purpose}" placeholder="e.g. เดินทางไปสัมมนา, ส่งหนังสือราชการ">
                </div>
                <div class="form-group">
                    <label class="form-label" for="bk-passengers">จำนวนผู้เดินทาง (คน)</label>
                    <input type="number" id="bk-passengers" class="form-control" required value="${passengers}" min="1" max="50">
                </div>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                <button type="button" class="btn btn-secondary" onclick="closeGlobalModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">ส่งคำขอจองรถ</button>
            </div>
        </form>
    `;
    
    openGlobalModal(isEdit ? 'แก้ไขรายละเอียดการขอใช้รถ' : 'ส่งแบบฟอร์มขอใช้รถยนต์ส่วนกลาง', formHtml);
};

window.handleSaveBooking = async function(event, id) {
    event.preventDefault();
    
    const startVal = document.getElementById('bk-start').value;
    const endVal = document.getElementById('bk-end').value;
    
    // Check simple date validation
    if (new Date(startVal) >= new Date(endVal)) {
        alert("วันเวลาเดินทางกลับ ต้องอยู่หลังวันเวลาเดินทางไป");
        return;
    }
    
    // Convert inputs back to YYYY-MM-DD HH:MM:SS format
    const startDT = startVal.replace('T', ' ') + ':00';
    const endDT = endVal.replace('T', ' ') + ':00';
    
    const body = {
        id: id,
        requester_name: document.getElementById('bk-requester').value.trim(),
        start_datetime: startDT,
        end_datetime: endDT,
        destination: document.getElementById('bk-dest').value.trim(),
        purpose: document.getElementById('bk-purpose').value.trim(),
        passenger_count: parseInt(document.getElementById('bk-passengers').value)
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
