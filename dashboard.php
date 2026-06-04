<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}
require_once 'db.php';

// ============================================================
// Fetch all dashboard data
// ============================================================

// 1. Summary stats
$total_bookings = $pdo->query("SELECT COUNT(*) FROM bookings")->fetchColumn();
$completed      = $pdo->query("SELECT COUNT(*) FROM bookings WHERE status='completed'")->fetchColumn();
$approved       = $pdo->query("SELECT COUNT(*) FROM bookings WHERE status='approved'")->fetchColumn();
$pending        = $pdo->query("SELECT COUNT(*) FROM bookings WHERE status='pending_admin'")->fetchColumn();
$cancelled      = $pdo->query("SELECT COUNT(*) FROM bookings WHERE status='cancelled'")->fetchColumn();

// 2. Vehicle stats
$total_vehicles    = $pdo->query("SELECT COUNT(*) FROM vehicles")->fetchColumn();
$available_vehicles= $pdo->query("SELECT COUNT(*) FROM vehicles WHERE status='available'")->fetchColumn();
$active_vehicles   = $pdo->query("SELECT COUNT(*) FROM vehicles WHERE status='active'")->fetchColumn();
$maintenance_vehicles = $pdo->query("SELECT COUNT(*) FROM vehicles WHERE status='maintenance'")->fetchColumn();

// 3. Driver stats
$total_drivers    = $pdo->query("SELECT COUNT(*) FROM drivers")->fetchColumn();
$active_drivers   = $pdo->query("SELECT COUNT(*) FROM drivers WHERE status='active'")->fetchColumn();
$unavail_drivers  = $pdo->query("SELECT COUNT(*) FROM drivers WHERE status IN ('vacation','sick')")->fetchColumn();

// 4. Trip type breakdown
$daily_count    = $pdo->query("SELECT COUNT(*) FROM bookings WHERE trip_type='daily'")->fetchColumn();
$province_count = $pdo->query("SELECT COUNT(*) FROM bookings WHERE trip_type='province'")->fetchColumn();

// 5. Monthly booking trend (last 6 months)
$trend_stmt = $pdo->query("
    SELECT DATE_FORMAT(created_at,'%Y-%m') AS month_key,
           DATE_FORMAT(created_at,'%b %Y')  AS month_label,
           COUNT(*) AS total,
           SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS done,
           SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancel
    FROM bookings
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY month_key, month_label
    ORDER BY month_key ASC
");
$trend_data = $trend_stmt->fetchAll(PDO::FETCH_ASSOC);

// Convert to Thai month names
$thai_months_short = [
    'Jan'=>'ม.ค.','Feb'=>'ก.พ.','Mar'=>'มี.ค.','Apr'=>'เม.ย.','May'=>'พ.ค.',
    'Jun'=>'มิ.ย.','Jul'=>'ก.ค.','Aug'=>'ส.ค.','Sep'=>'ก.ย.','Oct'=>'ต.ค.',
    'Nov'=>'พ.ย.','Dec'=>'ธ.ค.'
];
foreach ($trend_data as &$row) {
    $parts = explode(' ', $row['month_label']);
    $row['month_label'] = ($thai_months_short[$parts[0]] ?? $parts[0]) . ' ' . (intval($parts[1]) + 543);
}
unset($row);

// 6. Top destinations (top 7)
$dest_stmt = $pdo->query("
    SELECT destination, COUNT(*) AS cnt
    FROM bookings
    GROUP BY destination
    ORDER BY cnt DESC
    LIMIT 7
");
$top_dests = $dest_stmt->fetchAll(PDO::FETCH_ASSOC);

// 7. Vehicle utilization (usage count per vehicle)
$veh_util_stmt = $pdo->query("
    SELECT v.brand_model, v.license_plate, COUNT(b.id) AS trips,
           SUM(COALESCE(b.end_mileage,0) - COALESCE(b.start_mileage,0)) AS km_used
    FROM vehicles v
    LEFT JOIN bookings b ON b.vehicle_id = v.id
    GROUP BY v.id, v.brand_model, v.license_plate
    ORDER BY trips DESC
");
$veh_util = $veh_util_stmt->fetchAll(PDO::FETCH_ASSOC);

// 8. Recent 8 bookings
$recent_stmt = $pdo->query("
    SELECT b.id, b.requester_name, b.destination, b.start_datetime, b.end_datetime,
           b.status, b.trip_type, b.passenger_count,
           u.fullname AS creator_name,
           v.license_plate, v.brand_model,
           drv.name AS driver_name
    FROM bookings b
    LEFT JOIN users u ON b.created_by = u.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    LEFT JOIN drivers drv ON b.driver_id = drv.id
    ORDER BY b.created_at DESC
    LIMIT 8
");
$recent_bookings = $recent_stmt->fetchAll(PDO::FETCH_ASSOC);

// 9. Department usage
$dept_stmt = $pdo->query("
    SELECT d.name AS dept, COUNT(b.id) AS cnt
    FROM bookings b
    LEFT JOIN users u ON b.created_by = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    GROUP BY d.name
    ORDER BY cnt DESC
");
$dept_usage = $dept_stmt->fetchAll(PDO::FETCH_ASSOC);

// 10. Mileage totals
$km_total = $pdo->query("
    SELECT COALESCE(SUM(end_mileage - start_mileage),0) 
    FROM bookings 
    WHERE start_mileage IS NOT NULL AND end_mileage IS NOT NULL
")->fetchColumn();

// Helper: format Thai date
function thaiDate($dt) {
    if (!$dt) return '-';
    $ts = strtotime($dt);
    $m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return date('j', $ts) . ' ' . $m[intval(date('n',$ts))-1] . ' ' . (intval(date('Y',$ts))+543);
}

$current_user = $_SESSION['fullname'] ?? 'ผู้ใช้งาน';
$user_role    = $_SESSION['role'] ?? 'staff';
?>
<!DOCTYPE html>
<html lang="th" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FleetFlow — Dashboard ภาพรวมระบบ</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
    <style>
        /* ── Dashboard specific ── */
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Sarabun', 'Inter', sans-serif;
            background: var(--bg-main);
            color: var(--text-primary);
            min-height: 100vh;
        }

        /* ─── Top Bar ─── */
        .dash-topbar {
            position: sticky; top: 0; z-index: 100;
            background: var(--bg-topbar);
            backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--border-color);
            padding: 0 28px;
            height: 62px;
            display: flex; align-items: center; justify-content: space-between;
        }
        .topbar-brand {
            display: flex; align-items: center; gap: 12px;
        }
        .topbar-logo {
            width: 36px; height: 36px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; color: #fff;
            box-shadow: 0 4px 12px var(--primary-glow);
        }
        .topbar-title {
            font-family: 'Outfit', sans-serif;
            font-weight: 700; font-size: 20px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .topbar-sub { font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }

        .topbar-right {
            display: flex; align-items: center; gap: 14px;
        }
        .topbar-user {
            display: flex; align-items: center; gap: 10px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 40px;
            padding: 6px 14px 6px 8px;
            cursor: pointer;
            transition: var(--transition-fast);
            text-decoration: none; color: inherit;
        }
        .topbar-user:hover { background: var(--bg-card-hover); }
        .topbar-avatar {
            width: 30px; height: 30px;
            background: linear-gradient(135deg, var(--primary), var(--secondary-light));
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; color: #fff; font-weight: 700;
        }
        .topbar-user-name { font-size: 13px; font-weight: 600; }
        .topbar-user-role { font-size: 11px; color: var(--text-muted); }

        .btn-back {
            display: flex; align-items: center; gap: 6px;
            padding: 8px 16px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            font-size: 13px; font-weight: 600;
            color: var(--text-secondary);
            cursor: pointer; text-decoration: none;
            transition: var(--transition-fast);
        }
        .btn-back:hover {
            background: var(--primary); color: #fff;
            border-color: var(--primary);
            box-shadow: 0 4px 12px var(--primary-glow);
        }
        .theme-toggle {
            width: 36px; height: 36px;
            border: 1px solid var(--border-color);
            background: var(--bg-card);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 16px;
            transition: var(--transition-fast);
        }
        .theme-toggle:hover { background: var(--bg-card-hover); }

        /* ─── Main Layout ─── */
        .dash-wrap {
            max-width: 1400px;
            margin: 0 auto;
            padding: 28px 24px 48px;
        }

        /* ─── Section Title ─── */
        .section-header {
            display: flex; align-items: center; gap: 10px;
            margin-bottom: 18px;
        }
        .section-header h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 16px; font-weight: 700;
            color: var(--text-primary);
        }
        .section-icon {
            width: 30px; height: 30px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px;
        }
        .section-line {
            flex: 1; height: 1px;
            background: linear-gradient(to right, var(--border-color), transparent);
        }

        /* ─── KPI Cards ─── */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 28px;
        }
        .kpi-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 20px 18px;
            position: relative;
            overflow: hidden;
            transition: var(--transition-normal);
            cursor: default;
        }
        .kpi-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            border-radius: 16px 16px 0 0;
        }
        .kpi-card:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-lg);
        }
        .kpi-card.primary::before   { background: linear-gradient(90deg, var(--primary), var(--primary-light)); }
        .kpi-card.success::before   { background: linear-gradient(90deg, var(--success), #4ade80); }
        .kpi-card.warning::before   { background: linear-gradient(90deg, var(--warning), #fbbf24); }
        .kpi-card.danger::before    { background: linear-gradient(90deg, var(--danger), #f87171); }
        .kpi-card.info::before      { background: linear-gradient(90deg, var(--info), #38bdf8); }
        .kpi-card.purple::before    { background: linear-gradient(90deg, #8b5cf6, #c084fc); }
        .kpi-card.teal::before      { background: linear-gradient(90deg, #14b8a6, #5eead4); }
        .kpi-card.orange::before    { background: linear-gradient(90deg, #f97316, #fb923c); }

        .kpi-icon {
            width: 42px; height: 42px;
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; margin-bottom: 12px;
        }
        .kpi-card.primary .kpi-icon   { background: rgba(120,80,240,0.12); }
        .kpi-card.success .kpi-icon   { background: rgba(40,180,120,0.12); }
        .kpi-card.warning .kpi-icon   { background: rgba(230,170,40,0.12); }
        .kpi-card.danger .kpi-icon    { background: rgba(220,60,80,0.12); }
        .kpi-card.info .kpi-icon      { background: rgba(40,160,220,0.12); }
        .kpi-card.purple .kpi-icon    { background: rgba(139,92,246,0.12); }
        .kpi-card.teal .kpi-icon      { background: rgba(20,184,166,0.12); }
        .kpi-card.orange .kpi-icon    { background: rgba(249,115,22,0.12); }

        .kpi-value {
            font-family: 'Outfit', sans-serif;
            font-size: 32px; font-weight: 800;
            line-height: 1; margin-bottom: 4px;
        }
        .kpi-card.primary .kpi-value { color: var(--primary); }
        .kpi-card.success .kpi-value { color: var(--success); }
        .kpi-card.warning .kpi-value { color: var(--warning); }
        .kpi-card.danger .kpi-value  { color: var(--danger); }
        .kpi-card.info .kpi-value    { color: var(--info); }
        .kpi-card.purple .kpi-value  { color: #8b5cf6; }
        .kpi-card.teal .kpi-value    { color: #14b8a6; }
        .kpi-card.orange .kpi-value  { color: #f97316; }

        .kpi-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
        .kpi-sub   { font-size: 11.5px; color: var(--text-muted); margin-top: 6px; }

        /* ─── Chart grid ─── */
        .chart-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
        }
        .chart-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
        }
        @media (max-width: 1100px) {
            .chart-grid, .chart-grid-3 { grid-template-columns: 1fr; }
        }

        .chart-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 22px 22px 18px;
            transition: var(--transition-normal);
        }
        .chart-card:hover { box-shadow: var(--shadow-main); }
        .chart-card h3 {
            font-family: 'Outfit', sans-serif;
            font-size: 14px; font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 16px;
            display: flex; align-items: center; gap: 8px;
        }
        .chart-container {
            position: relative;
        }

        /* ─── Table ─── */
        .table-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            overflow: hidden;
            margin-bottom: 24px;
        }
        .table-header {
            padding: 18px 22px;
            border-bottom: 1px solid var(--border-color);
            display: flex; align-items: center; justify-content: space-between;
        }
        .table-header h3 {
            font-family: 'Outfit', sans-serif;
            font-size: 14px; font-weight: 700;
            display: flex; align-items: center; gap: 8px;
        }
        .table-link {
            font-size: 12.5px; color: var(--primary);
            font-weight: 600; text-decoration: none;
            display: flex; align-items: center; gap: 4px;
            padding: 5px 12px;
            border: 1px solid var(--primary);
            border-radius: 8px;
            transition: var(--transition-fast);
        }
        .table-link:hover { background: var(--primary); color: #fff; }

        table.dash-table {
            width: 100%; border-collapse: collapse;
        }
        .dash-table th {
            background: var(--bg-input);
            padding: 10px 16px;
            font-size: 12px; font-weight: 600;
            color: var(--text-muted); text-align: left;
            border-bottom: 1px solid var(--border-color);
            white-space: nowrap;
        }
        .dash-table td {
            padding: 12px 16px;
            font-size: 13px;
            border-bottom: 1px solid var(--border-color);
            vertical-align: middle;
        }
        .dash-table tr:last-child td { border-bottom: none; }
        .dash-table tr:hover td { background: var(--bg-card-hover); }

        /* Status badges */
        .badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 11.5px; font-weight: 600;
            white-space: nowrap;
        }
        .badge-completed { background: rgba(40,180,120,0.12); color: #16a34a; }
        .badge-approved  { background: rgba(40,160,220,0.12); color: #0284c7; }
        .badge-pending   { background: rgba(230,170,40,0.12); color: #d97706; }
        .badge-cancelled { background: rgba(220,60,80,0.12); color: #dc2626; }
        .badge-driving   { background: rgba(120,80,240,0.12); color: #7c3aed; }
        .badge-daily     { background: rgba(20,184,166,0.10); color: #0f766e; }
        .badge-province  { background: rgba(249,115,22,0.10); color: #c2410c; }

        /* ─── Vehicle Utilization bars ─── */
        .util-list { list-style: none; }
        .util-item {
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color);
        }
        .util-item:last-child { border-bottom: none; }
        .util-top {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 6px;
        }
        .util-name { font-size: 13px; font-weight: 600; }
        .util-plate {
            font-size: 11px; color: var(--text-muted);
            background: var(--bg-input); padding: 2px 8px;
            border-radius: 6px;
        }
        .util-bar-wrap {
            background: var(--bg-input); border-radius: 20px;
            height: 8px; overflow: hidden;
        }
        .util-bar {
            height: 100%; border-radius: 20px;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            transition: width 1s ease;
        }
        .util-stat { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

        /* ─── Dept usage bar ─── */
        .dept-item {
            display: flex; align-items: center; gap: 12px;
            padding: 8px 0;
            border-bottom: 1px solid var(--border-color);
        }
        .dept-item:last-child { border-bottom: none; }
        .dept-name { font-size: 13px; font-weight: 500; flex: 1; }
        .dept-cnt {
            font-family: 'Outfit', sans-serif;
            font-weight: 700; font-size: 15px;
            color: var(--primary); min-width: 32px; text-align: right;
        }
        .dept-bar-wrap { flex: 2; background: var(--bg-input); border-radius: 20px; height: 7px; overflow: hidden; }
        .dept-bar { height: 100%; border-radius: 20px; }
        .dept-colors { display: flex; flex-direction: column; }

        /* ─── Greeting banner ─── */
        .greeting-banner {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            border-radius: 20px;
            padding: 24px 28px;
            margin-bottom: 24px;
            color: #fff;
            display: flex; align-items: center; justify-content: space-between;
            overflow: hidden;
            position: relative;
        }
        .greeting-banner::after {
            content: '🚗';
            position: absolute;
            right: 28px; top: 50%;
            transform: translateY(-50%);
            font-size: 72px;
            opacity: 0.15;
        }
        .greeting-title {
            font-family: 'Outfit', sans-serif;
            font-size: 22px; font-weight: 800;
            margin-bottom: 4px;
        }
        .greeting-sub { font-size: 14px; opacity: 0.85; }
        .greeting-date { font-size: 12.5px; opacity: 0.7; margin-top: 6px; }

        .greeting-actions { display: flex; gap: 10px; z-index: 1; }
        .banner-btn {
            padding: 10px 20px;
            border-radius: 12px;
            font-size: 13px; font-weight: 700;
            cursor: pointer; text-decoration: none;
            display: flex; align-items: center; gap: 6px;
            transition: var(--transition-fast);
        }
        .banner-btn-primary {
            background: #fff;
            color: var(--primary);
        }
        .banner-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
        .banner-btn-outline {
            background: rgba(255,255,255,0.15);
            color: #fff;
            border: 1.5px solid rgba(255,255,255,0.4);
            backdrop-filter: blur(4px);
        }
        .banner-btn-outline:hover { background: rgba(255,255,255,0.25); }

        /* ─── Destination list ─── */
        .dest-list { list-style: none; }
        .dest-item {
            display: flex; align-items: center; gap: 12px;
            padding: 9px 0;
            border-bottom: 1px solid var(--border-color);
        }
        .dest-item:last-child { border-bottom: none; }
        .dest-rank {
            width: 24px; height: 24px; border-radius: 50%;
            background: var(--bg-input);
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 700; color: var(--text-muted);
            flex-shrink: 0;
        }
        .dest-rank.top1 { background: rgba(234,179,8,0.15); color: #a16207; }
        .dest-rank.top2 { background: rgba(148,163,184,0.15); color: #475569; }
        .dest-rank.top3 { background: rgba(180,120,60,0.15); color: #92400e; }
        .dest-name { font-size: 13px; flex: 1; color: var(--text-primary); }
        .dest-cnt {
            font-family: 'Outfit', sans-serif;
            font-weight: 700; color: var(--primary); font-size: 14px;
        }

        /* ─── Scrollbar ─── */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }

        /* ─── Animate in ─── */
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .kpi-card  { animation: fadeUp 0.5s ease both; }
        .kpi-card:nth-child(1) { animation-delay: 0.05s; }
        .kpi-card:nth-child(2) { animation-delay: 0.10s; }
        .kpi-card:nth-child(3) { animation-delay: 0.15s; }
        .kpi-card:nth-child(4) { animation-delay: 0.20s; }
        .kpi-card:nth-child(5) { animation-delay: 0.25s; }
        .kpi-card:nth-child(6) { animation-delay: 0.30s; }
        .kpi-card:nth-child(7) { animation-delay: 0.35s; }
        .kpi-card:nth-child(8) { animation-delay: 0.40s; }

        .trip-type-legend {
            display: flex; gap: 16px; margin-top: 12px;
            justify-content: center;
        }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-secondary); }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; }

        .no-data { text-align: center; color: var(--text-muted); font-size: 13px; padding: 24px; }
    </style>
</head>
<body>
<!-- ═════════════════════ TOP BAR ═════════════════════ -->
<header class="dash-topbar">
    <div class="topbar-brand">
        <div class="topbar-logo">🚗</div>
        <div>
            <div class="topbar-title">FleetFlow</div>
            <div class="topbar-sub">ระบบบริหารจัดการยานพาหนะ</div>
        </div>
    </div>
    <div class="topbar-right">
        <button class="theme-toggle" onclick="toggleTheme()" title="เปลี่ยนธีม" id="themeBtn">🌙</button>
        <a href="index.php" class="btn-back">⬅ กลับระบบหลัก</a>
        <div class="topbar-user">
            <div class="topbar-avatar"><?= mb_substr($current_user, 0, 1) ?></div>
            <div>
                <div class="topbar-user-name"><?= htmlspecialchars($current_user) ?></div>
                <div class="topbar-user-role"><?= $user_role === 'admin' ? '👑 ผู้ดูแลระบบ' : '👤 เจ้าหน้าที่' ?></div>
            </div>
        </div>
    </div>
</header>

<!-- ═════════════════════ CONTENT ═════════════════════ -->
<main class="dash-wrap">

    <!-- Greeting -->
    <div class="greeting-banner">
        <div>
            <div class="greeting-title">สวัสดี, <?= htmlspecialchars($current_user) ?> 👋</div>
            <div class="greeting-sub">ยินดีต้อนรับสู่ Dashboard ภาพรวมระบบบริหารจัดการยานพาหนะ</div>
            <div class="greeting-date">📅 <?= thaiDate(date('Y-m-d H:i:s')) ?> | รวมทั้งหมด <?= number_format($total_bookings) ?> รายการใช้รถ</div>
        </div>
        <div class="greeting-actions">
            <a href="index.php" class="banner-btn banner-btn-primary">📋 จองรถยนต์</a>
            <?php if ($user_role === 'admin'): ?>
            <a href="index.php#admin" class="banner-btn banner-btn-outline">⚙️ จัดการระบบ</a>
            <?php endif; ?>
        </div>
    </div>

    <!-- ── KPI Cards ── -->
    <div class="section-header">
        <div class="section-icon">📊</div>
        <h2>สถิติภาพรวม</h2>
        <div class="section-line"></div>
    </div>
    <div class="kpi-grid">
        <div class="kpi-card primary">
            <div class="kpi-icon">📋</div>
            <div class="kpi-value"><?= number_format($total_bookings) ?></div>
            <div class="kpi-label">รายการทั้งหมด</div>
            <div class="kpi-sub">รวมทุกสถานะ</div>
        </div>
        <div class="kpi-card success">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value"><?= number_format($completed) ?></div>
            <div class="kpi-label">เสร็จสิ้น</div>
            <div class="kpi-sub"><?= $total_bookings > 0 ? round($completed/$total_bookings*100) : 0 ?>% ของทั้งหมด</div>
        </div>
        <div class="kpi-card info">
            <div class="kpi-icon">✔️</div>
            <div class="kpi-value"><?= number_format($approved) ?></div>
            <div class="kpi-label">อนุมัติแล้ว</div>
            <div class="kpi-sub">กำลังดำเนินการ</div>
        </div>
        <div class="kpi-card warning">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-value"><?= number_format($pending) ?></div>
            <div class="kpi-label">รออนุมัติ</div>
            <div class="kpi-sub">รอการพิจารณา</div>
        </div>
        <div class="kpi-card danger">
            <div class="kpi-icon">❌</div>
            <div class="kpi-value"><?= number_format($cancelled) ?></div>
            <div class="kpi-label">ยกเลิก</div>
            <div class="kpi-sub">ไม่ดำเนินการ</div>
        </div>
        <div class="kpi-card teal">
            <div class="kpi-icon">🚗</div>
            <div class="kpi-value"><?= $available_vehicles ?></div>
            <div class="kpi-label">รถว่าง</div>
            <div class="kpi-sub">จาก <?= $total_vehicles ?> คัน</div>
        </div>
        <div class="kpi-card purple">
            <div class="kpi-icon">👨‍✈️</div>
            <div class="kpi-value"><?= $active_drivers ?></div>
            <div class="kpi-label">พนักงานขับรถ</div>
            <div class="kpi-sub">พร้อมปฏิบัติงาน</div>
        </div>
        <div class="kpi-card orange">
            <div class="kpi-icon">🛣️</div>
            <div class="kpi-value"><?= number_format($km_total) ?></div>
            <div class="kpi-label">ระยะทางรวม (กม.)</div>
            <div class="kpi-sub">สะสมทั้งหมด</div>
        </div>
    </div>

    <!-- ── Charts Row 1: Trend + Donut ── -->
    <div class="section-header">
        <div class="section-icon">📈</div>
        <h2>แนวโน้มการใช้รถ</h2>
        <div class="section-line"></div>
    </div>
    <div class="chart-grid">
        <div class="chart-card">
            <h3>📊 แนวโน้มการจองรายเดือน (6 เดือนล่าสุด)</h3>
            <div class="chart-container" style="height:260px">
                <canvas id="trendChart"></canvas>
            </div>
        </div>
        <div class="chart-card">
            <h3>🥧 สัดส่วนสถานะการจอง</h3>
            <div class="chart-container" style="height:220px">
                <canvas id="statusDonut"></canvas>
            </div>
            <div class="trip-type-legend" id="statusLegend"></div>
        </div>
    </div>

    <!-- ── Charts Row 2: Trip Type + Dept usage + Destinations ── -->
    <div class="section-header">
        <div class="section-icon">🗺️</div>
        <h2>การวิเคราะห์เชิงลึก</h2>
        <div class="section-line"></div>
    </div>
    <div class="chart-grid-3">
        <!-- Trip type -->
        <div class="chart-card">
            <h3>🗺️ ประเภทการเดินทาง</h3>
            <div class="chart-container" style="height:200px">
                <canvas id="tripTypeChart"></canvas>
            </div>
            <div class="trip-type-legend">
                <div class="legend-item">
                    <div class="legend-dot" style="background:#14b8a6"></div>
                    ประจำวัน (<?= $daily_count ?>)
                </div>
                <div class="legend-item">
                    <div class="legend-dot" style="background:#f97316"></div>
                    ต่างจังหวัด (<?= $province_count ?>)
                </div>
            </div>
        </div>

        <!-- Department usage -->
        <div class="chart-card">
            <h3>🏢 การใช้รถแยกตามส่วนงาน</h3>
            <?php
            $dept_colors = ['#7c3aed','#0284c7','#16a34a','#d97706','#dc2626'];
            $dept_max = max(array_column($dept_usage, 'cnt') ?: [1]);
            ?>
            <ul class="dept-list" style="list-style:none; margin-top:8px;">
                <?php foreach ($dept_usage as $i => $dept): ?>
                <li class="dept-item">
                    <span class="dept-name"><?= htmlspecialchars($dept['dept'] ?? 'ไม่ระบุ') ?></span>
                    <div class="dept-bar-wrap">
                        <div class="dept-bar" style="width:<?= round($dept['cnt']/$dept_max*100) ?>%; background:<?= $dept_colors[$i % count($dept_colors)] ?>"></div>
                    </div>
                    <span class="dept-cnt"><?= $dept['cnt'] ?></span>
                </li>
                <?php endforeach; ?>
                <?php if (empty($dept_usage)): ?><div class="no-data">ไม่มีข้อมูล</div><?php endif; ?>
            </ul>
        </div>

        <!-- Top destinations -->
        <div class="chart-card">
            <h3>📍 ปลายทางยอดนิยม</h3>
            <ul class="dest-list">
                <?php foreach ($top_dests as $i => $d): ?>
                <li class="dest-item">
                    <div class="dest-rank <?= $i===0?'top1':($i===1?'top2':($i===2?'top3':'')) ?>">
                        <?= $i < 3 ? ['🥇','🥈','🥉'][$i] : ($i+1) ?>
                    </div>
                    <span class="dest-name"><?= htmlspecialchars($d['destination']) ?></span>
                    <span class="dest-cnt"><?= $d['cnt'] ?></span>
                </li>
                <?php endforeach; ?>
                <?php if (empty($top_dests)): ?><div class="no-data">ไม่มีข้อมูล</div><?php endif; ?>
            </ul>
        </div>
    </div>

    <!-- ── Vehicle Utilization ── -->
    <div class="section-header">
        <div class="section-icon">🚙</div>
        <h2>การใช้งานยานพาหนะ</h2>
        <div class="section-line"></div>
    </div>
    <div class="chart-grid">
        <div class="chart-card">
            <h3>📊 จำนวนเที่ยวต่อคัน</h3>
            <div class="chart-container" style="height:240px">
                <canvas id="vehicleBarChart"></canvas>
            </div>
        </div>
        <div class="chart-card">
            <h3>🛣️ ระยะทางสะสมแต่ละคัน</h3>
            <?php
            $max_trips = max(array_column($veh_util, 'trips') ?: [1]);
            ?>
            <ul class="util-list">
                <?php foreach ($veh_util as $v): ?>
                <li class="util-item">
                    <div class="util-top">
                        <span class="util-name"><?= htmlspecialchars($v['brand_model']) ?></span>
                        <span class="util-plate"><?= htmlspecialchars($v['license_plate']) ?></span>
                    </div>
                    <div class="util-bar-wrap">
                        <div class="util-bar" style="width: <?= $max_trips > 0 ? round($v['trips']/$max_trips*100) : 0 ?>%"></div>
                    </div>
                    <div class="util-stat"><?= $v['trips'] ?> เที่ยว · <?= number_format($v['km_used']) ?> กม.</div>
                </li>
                <?php endforeach; ?>
            </ul>
        </div>
    </div>

    <!-- ── Recent Bookings Table ── -->
    <div class="section-header">
        <div class="section-icon">🕐</div>
        <h2>รายการจองล่าสุด</h2>
        <div class="section-line"></div>
    </div>
    <div class="table-card">
        <div class="table-header">
            <h3>📋 รายการล่าสุด 8 รายการ</h3>
            <a href="index.php" class="table-link">ดูทั้งหมด →</a>
        </div>
        <div style="overflow-x:auto">
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>ผู้ขอ</th>
                        <th>ปลายทาง</th>
                        <th>ประเภท</th>
                        <th>วันที่เดินทาง</th>
                        <th>ยานพาหนะ</th>
                        <th>พนักงานขับรถ</th>
                        <th>สถานะ</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($recent_bookings as $b): ?>
                    <?php
                        $s = $b['status'];
                        if ($s === 'completed')     $badge = '<span class="badge badge-completed">✅ เสร็จสิ้น</span>';
                        elseif ($s === 'approved')  $badge = '<span class="badge badge-approved">✔️ อนุมัติ</span>';
                        elseif ($s === 'pending_admin') $badge = '<span class="badge badge-pending">⏳ รออนุมัติ</span>';
                        elseif ($s === 'cancelled') $badge = '<span class="badge badge-cancelled">❌ ยกเลิก</span>';
                        else $badge = '<span class="badge">' . htmlspecialchars($s) . '</span>';

                        $trip_badge = $b['trip_type'] === 'province'
                            ? '<span class="badge badge-province">✈️ ต่างจังหวัด</span>'
                            : '<span class="badge badge-daily">📍 ประจำวัน</span>';
                    ?>
                    <tr>
                        <td style="color:var(--text-muted);font-weight:600">FF-<?= str_pad($b['id'], 4, '0', STR_PAD_LEFT) ?></td>
                        <td>
                            <div style="font-weight:600;font-size:13px"><?= htmlspecialchars($b['requester_name']) ?></div>
                            <div style="font-size:11.5px;color:var(--text-muted)"><?= htmlspecialchars($b['creator_name'] ?? '') ?></div>
                        </td>
                        <td style="max-width:220px">
                            <div style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><?= htmlspecialchars($b['destination']) ?></div>
                        </td>
                        <td><?= $trip_badge ?></td>
                        <td>
                            <div style="font-size:12.5px"><?= thaiDate($b['start_datetime']) ?></div>
                            <div style="font-size:11px;color:var(--text-muted)"><?= date('H:i', strtotime($b['start_datetime'])) ?> น.</div>
                        </td>
                        <td>
                            <?php if ($b['license_plate']): ?>
                            <div style="font-weight:600;font-size:12.5px"><?= htmlspecialchars($b['license_plate']) ?></div>
                            <div style="font-size:11px;color:var(--text-muted)"><?= htmlspecialchars($b['brand_model'] ?? '') ?></div>
                            <?php else: ?>
                            <span style="color:var(--text-muted);font-size:12px">—</span>
                            <?php endif; ?>
                        </td>
                        <td style="font-size:12.5px"><?= htmlspecialchars($b['driver_name'] ?? '—') ?></td>
                        <td><?= $badge ?></td>
                        <td>
                            <a href="print_booking.php?id=<?= $b['id'] ?>" target="_blank"
                               style="font-size:12px;color:var(--primary);text-decoration:none;font-weight:600"
                               title="พิมพ์ใบขออนุญาต">🖨️</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($recent_bookings)): ?>
                    <tr><td colspan="9" class="no-data">ยังไม่มีรายการจอง</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

</main>

<!-- ═════════════════════ SCRIPTS ═════════════════════ -->
<script>
// ─── Theme Toggle ───
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('themeBtn').textContent = isDark ? '🌙' : '☀️';
    localStorage.setItem('ff_dash_theme', isDark ? 'light' : 'dark');
}
(function() {
    const saved = localStorage.getItem('ff_dash_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        document.getElementById('themeBtn').textContent = saved === 'dark' ? '☀️' : '🌙';
    }
})();

// ─── Chart.js defaults ───
const style = getComputedStyle(document.documentElement);
function cssVar(v) { return style.getPropertyValue(v).trim(); }

Chart.defaults.font.family = "'Sarabun', 'Inter', sans-serif";
Chart.defaults.color = '#7c7aaf';

// ─── Trend Chart ───
const trendLabels = <?= json_encode(array_column($trend_data, 'month_label'), JSON_UNESCAPED_UNICODE) ?>;
const trendTotal  = <?= json_encode(array_column($trend_data, 'total')) ?>;
const trendDone   = <?= json_encode(array_column($trend_data, 'done')) ?>;
const trendCancel = <?= json_encode(array_column($trend_data, 'cancel')) ?>;

new Chart(document.getElementById('trendChart'), {
    type: 'bar',
    data: {
        labels: trendLabels,
        datasets: [
            {
                label: 'ทั้งหมด',
                data: trendTotal,
                backgroundColor: 'rgba(120,80,240,0.15)',
                borderColor: 'rgba(120,80,240,0.8)',
                borderWidth: 2,
                borderRadius: 8,
                type: 'bar',
            },
            {
                label: 'เสร็จสิ้น',
                data: trendDone,
                borderColor: '#16a34a',
                backgroundColor: 'rgba(40,180,120,0.08)',
                borderWidth: 2.5,
                type: 'line',
                tension: 0.4,
                pointBackgroundColor: '#16a34a',
                pointRadius: 5,
                fill: false,
            },
            {
                label: 'ยกเลิก',
                data: trendCancel,
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220,60,80,0.08)',
                borderWidth: 2,
                type: 'line',
                tension: 0.4,
                pointBackgroundColor: '#dc2626',
                pointRadius: 4,
                fill: false,
            }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 16 } } },
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(130,120,200,0.08)' } },
            x: { grid: { display: false } }
        }
    }
});

// ─── Status Donut ───
const donutData = [<?= $completed ?>, <?= $approved ?>, <?= $pending ?>, <?= $cancelled ?>];
const donutLabels = ['เสร็จสิ้น', 'อนุมัติแล้ว', 'รออนุมัติ', 'ยกเลิก'];
const donutColors = ['#16a34a', '#0284c7', '#d97706', '#dc2626'];

new Chart(document.getElementById('statusDonut'), {
    type: 'doughnut',
    data: {
        labels: donutLabels,
        datasets: [{
            data: donutData,
            backgroundColor: donutColors.map(c => c + '22'),
            borderColor: donutColors,
            borderWidth: 2.5,
            hoverOffset: 10,
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} รายการ` } }
        }
    }
});
// Legend
const legendEl = document.getElementById('statusLegend');
donutLabels.forEach((l, i) => {
    legendEl.innerHTML += `<div class="legend-item"><div class="legend-dot" style="background:${donutColors[i]}"></div>${l} (${donutData[i]})</div>`;
});

// ─── Trip Type Donut ───
new Chart(document.getElementById('tripTypeChart'), {
    type: 'doughnut',
    data: {
        labels: ['ประจำวัน', 'ต่างจังหวัด'],
        datasets: [{
            data: [<?= $daily_count ?>, <?= $province_count ?>],
            backgroundColor: ['rgba(20,184,166,0.2)', 'rgba(249,115,22,0.2)'],
            borderColor: ['#14b8a6', '#f97316'],
            borderWidth: 2.5, hoverOffset: 10,
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} รายการ` } }
        }
    }
});

// ─── Vehicle Bar ───
const vehLabels = <?= json_encode(array_map(fn($v) => $v['license_plate'], $veh_util), JSON_UNESCAPED_UNICODE) ?>;
const vehTrips  = <?= json_encode(array_map(fn($v) => intval($v['trips']), $veh_util)) ?>;
const vehKm     = <?= json_encode(array_map(fn($v) => intval($v['km_used']), $veh_util)) ?>;

new Chart(document.getElementById('vehicleBarChart'), {
    type: 'bar',
    data: {
        labels: vehLabels,
        datasets: [
            {
                label: 'จำนวนเที่ยว',
                data: vehTrips,
                backgroundColor: 'rgba(120,80,240,0.75)',
                borderRadius: 8,
                yAxisID: 'y',
            },
            {
                label: 'ระยะทาง (กม.)',
                data: vehKm,
                backgroundColor: 'rgba(40,160,220,0.65)',
                borderRadius: 8,
                yAxisID: 'y1',
            }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 14 } } },
        scales: {
            y:  { beginAtZero: true, ticks: { stepSize: 1 }, position: 'left',  grid: { color: 'rgba(130,120,200,0.08)' }, title: { display: true, text: 'เที่ยว' } },
            y1: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: true, text: 'กม.' } },
            x:  { grid: { display: false } }
        }
    }
});
</script>
</body>
</html>
