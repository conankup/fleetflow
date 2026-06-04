<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    die("กรุณาเข้าสู่ระบบก่อนทำการพิมพ์เอกสาร");
}
require_once 'db.php';

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($id <= 0) {
    die("ข้อมูลคำขอไม่ถูกต้อง");
}

try {
    $stmt = $pdo->prepare("
        SELECT b.*,
               u.fullname as creator_fullname,
               u.title as creator_title,
               d_dept.name as creator_dept,
               d_div.name as creator_div,
               drv.name as driver_name,
               drv.phone as driver_phone,
               drv.license_number as driver_license,
               v.license_plate,
               v.province,
               v.brand_model,
               v.type as vehicle_type
        FROM bookings b
        LEFT JOIN users u ON b.created_by = u.id
        LEFT JOIN departments d_dept ON u.department_id = d_dept.id
        LEFT JOIN divisions d_div ON u.division_id = d_div.id
        LEFT JOIN drivers drv ON b.driver_id = drv.id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.id = ?
    ");
    $stmt->execute([$id]);
    $booking = $stmt->fetch();

    if (!$booking) {
        die("ไม่พบข้อมูลการจองนี้");
    }
} catch (\PDOException $e) {
    die("เกิดข้อผิดพลาดทางเทคนิค: " . $e->getMessage());
}

function formatThaiDateTime($datetime_str) {
    if (empty($datetime_str)) return '-';
    $timestamp = strtotime($datetime_str);
    if (!$timestamp) return '-';
    
    $thai_months = [
        1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
        5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
        9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
    ];
    
    $day = date('j', $timestamp);
    $month = $thai_months[intval(date('n', $timestamp))];
    $year = intval(date('Y', $timestamp)) + 543;
    $time = date('H:i', $timestamp);
    
    return "$day $month $year เวลา $time น.";
}

function formatThaiDateOnly($date_str) {
    if (empty($date_str)) return '-';
    $timestamp = strtotime($date_str);
    if (!$timestamp) return '-';
    
    $thai_months = [
        1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
        5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
        9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
    ];
    
    $day = date('j', $timestamp);
    $month = $thai_months[intval(date('n', $timestamp))];
    $year = intval(date('Y', $timestamp)) + 543;
    
    return "$day $month $year";
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>ใบขออนุญาตใช้รถยนต์ - เลขที่ <?= htmlspecialchars($booking['id']) ?></title>
    <!-- Google Font: Sarabun -->
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
            background-color: #f4f6f9;
            color: #000;
            margin: 0;
            padding: 10px;
        }
        .a4-container {
            background-color: #fff;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 15mm 15mm;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            box-sizing: border-box;
            position: relative;
            font-size: 15px;
            line-height: 1.9;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        
        .header-section {
            margin-bottom: 25px;
            text-align: center;
        }
        
        .title-main {
            font-size: 21px;
            font-weight: 700;
            text-decoration: underline;
            margin-bottom: 2px;
        }
        .title-sub {
            font-size: 16.5px;
            font-weight: 700;
        }
        
        .dotted-fill-inline {
            border-bottom: 1px dotted #000;
            font-weight: 600;
            padding: 0 4px;
            display: inline-block;
            text-align: center;
        }
        
        .no-print-banner {
            text-align: center;
            margin-bottom: 15px;
        }
        
        .btn-print {
            background-color: #7850f0;
            color: white;
            border: none;
            padding: 10px 24px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            border-radius: 8px;
            font-family: 'Sarabun', sans-serif;
            box-shadow: 0 4px 10px rgba(120, 80, 240, 0.25);
            transition: 0.2s;
        }
        
        .btn-print:hover {
            background-color: #603bb8;
            transform: translateY(-1px);
        }

        .status-stamp-print {
            position: absolute;
            top: 25mm;
            left: 20mm;
            border: 2px solid;
            padding: 3px 8px;
            font-size: 12px;
            font-weight: bold;
            border-radius: 4px;
            transform: rotate(-10deg);
            opacity: 0.85;
        }
        .stamp-pending { border-color: #ff9800; color: #ff9800; }
        .stamp-approved { border-color: #4caf50; color: #4caf50; }
        .stamp-completed { border-color: #2196f3; color: #2196f3; }
        .stamp-cancelled { border-color: #f44336; color: #f44336; }
        
        @media print {
            body {
                background-color: #fff;
                padding: 0;
            }
            .a4-container {
                box-shadow: none;
                margin: 0;
                padding: 5mm 10mm;
                width: auto;
                min-height: auto;
            }
            .no-print-banner {
                display: none;
            }
        }
    </style>
</head>
<body>

    <div class="no-print-banner">
        <button class="btn-print" onclick="window.print()">🖨️ สั่งพิมพ์ใบขออนุญาตใช้รถยนต์</button>
    </div>

    <div class="a4-container">
        <!-- Status Stamp for reference -->
        <?php
        $status = $booking['status'];
        $stamp_class = 'stamp-pending';
        $stamp_text = 'รออนุมัติ';
        if ($status === 'approved') { $stamp_class = 'stamp-approved'; $stamp_text = 'อนุมัติแล้ว'; }
        elseif ($status === 'completed') { $stamp_class = 'stamp-completed'; $stamp_text = 'เดินทางเสร็จสิ้น'; }
        elseif ($status === 'cancelled') { $stamp_class = 'stamp-cancelled'; $stamp_text = 'ยกเลิกคำขอ'; }
        ?>
        <div class="status-stamp-print <?= $stamp_class ?>"><?= $stamp_text ?></div>

        <?php
        // Prepare Thai Dates
        $request_date_parts = getThaiDateParts($booking['created_at']);
        $start_parts = getThaiDateParts($booking['start_datetime']);
        $end_parts = getThaiDateParts($booking['end_datetime']);
        
        $is_daily = ($booking['trip_type'] === 'daily');
        $is_province = ($booking['trip_type'] === 'province');
        
        // Prepare passengers string
        $passenger_names = [];
        if (!empty($booking['passenger_ids'])) {
            $passenger_ids = json_decode($booking['passenger_ids'], true);
            if (is_array($passenger_ids) && count($passenger_ids) > 0) {
                $in_clause = implode(',', array_fill(0, count($passenger_ids), '?'));
                $stmt_pass = $pdo->prepare("SELECT fullname FROM users WHERE id IN ($in_clause)");
                $stmt_pass->execute($passenger_ids);
                $passenger_names = $stmt_pass->fetchAll(PDO::FETCH_COLUMN);
            }
        }
        $passenger_str = implode(', ', $passenger_names);
        if (empty($passenger_str)) {
            $passenger_str = '........................................................................................................................................................................';
        }
        ?>

        <div class="header-section">
            <div class="title-main">แบบใบขออนุญาตใช้รถยนต์</div>
            <div class="title-sub">ศูนย์วิทยาศาสตร์เพื่อการศึกษารังสิต กรมส่งเสริมการเรียนรู้</div>
        </div>

        <div class="text-right" style="margin-bottom: 15px; font-size: 15.5px;">
            วันที่ <span class="dotted-fill-inline" style="min-width: 1.2cm;"><?= $request_date_parts['day'] ?></span>
            เดือน <span class="dotted-fill-inline" style="min-width: 3.2cm;"><?= $request_date_parts['month'] ?></span>
            พ.ศ. <span class="dotted-fill-inline" style="min-width: 1.6cm;"><?= $request_date_parts['year'] ?></span>
        </div>

        <div style="margin-bottom: 15px; font-size: 15.5px;">
            <strong>เรียน</strong> ผู้อำนวยการศูนย์วิทยาศาสตร์เพื่อการศึกษารังสิต
        </div>

        <div style="font-size: 15.5px; line-height: 2.1; text-align: justify;">
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ข้าพเจ้า <span class="dotted-fill-inline" style="min-width: 6.5cm;"><?= htmlspecialchars($booking['creator_fullname']) ?></span> 
            ตำแหน่ง <span class="dotted-fill-inline" style="min-width: 5.5cm;"><?= htmlspecialchars($booking['creator_title'] ?: '-') ?></span> <br>
            ส่วน <span class="dotted-fill-inline" style="min-width: 5.5cm;"><?= htmlspecialchars($booking['creator_dept_name'] ?: '-') ?></span> 
            งาน <span class="dotted-fill-inline" style="min-width: 6.5cm;"><?= htmlspecialchars($booking['creator_div_name'] ?: '-') ?></span> 
            ขออนุญาตใช้รถยนต์ไปติดต่อราชการที่ <span class="dotted-fill-inline" style="min-width: 12.8cm; text-align: left; text-indent: 6px;"><?= htmlspecialchars($booking['destination']) ?></span> <br>
            เรื่อง <span class="dotted-fill-inline" style="min-width: 16.5cm; text-align: left; text-indent: 6px;"><?= htmlspecialchars($booking['subject'] ?: '-') ?></span> <br>
            
            <div style="margin-left: 20px; display: flex; flex-direction: column; gap: 4px; margin-top: 6px; margin-bottom: 6px;">
                <div>
                    <?php if ($is_daily): ?>
                        ( &nbsp;&#10003;&nbsp; ) ประจำวัน <span class="dotted-fill-inline" style="min-width: 2.2cm;"><?= $start_parts['day_name'] ?></span> ที่ <span class="dotted-fill-inline" style="min-width: 1cm;"><?= $start_parts['day'] ?></span> เดือน <span class="dotted-fill-inline" style="min-width: 3.2cm;"><?= $start_parts['month'] ?></span> พ.ศ. <span class="dotted-fill-inline" style="min-width: 1.6cm;"><?= $start_parts['year'] ?></span> เวลา <span class="dotted-fill-inline" style="min-width: 1.8cm;"><?= $start_parts['time'] ?></span> น.
                    <?php else: ?>
                        ( &nbsp;&nbsp; ) ประจำวัน .................................... ที่ ............ เดือน .................................... พ.ศ. .................... เวลา .................... น.
                    <?php endif; ?>
                </div>
                <div>
                    <?php if ($is_province): ?>
                        ( &nbsp;&#10003;&nbsp; ) ต่างจังหวัดในวัน <span class="dotted-fill-inline" style="min-width: 2.2cm;"><?= $start_parts['day_name'] ?></span> ที่ <span class="dotted-fill-inline" style="min-width: 1cm;"><?= $start_parts['day'] ?></span> เดือน <span class="dotted-fill-inline" style="min-width: 3.2cm;"><?= $start_parts['month'] ?></span> พ.ศ. <span class="dotted-fill-inline" style="min-width: 1.6cm;"><?= $start_parts['year'] ?></span> เวลา <span class="dotted-fill-inline" style="min-width: 1.8cm;"><?= $start_parts['time'] ?></span> น.
                    <?php else: ?>
                        ( &nbsp;&nbsp; ) ต่างจังหวัดในวัน ............................ ที่ ............ เดือน .................................... พ.ศ. .................... เวลา .................... น.
                    <?php endif; ?>
                </div>
                <div>
                    ( &nbsp;&#10003;&nbsp; ) กลับถึงศูนย์วัน <span class="dotted-fill-inline" style="min-width: 2.2cm;"><?= $end_parts['day_name'] ?></span> ที่ <span class="dotted-fill-inline" style="min-width: 1cm;"><?= $end_parts['day'] ?></span> เดือน <span class="dotted-fill-inline" style="min-width: 3.2cm;"><?= $end_parts['month'] ?></span> พ.ศ. <span class="dotted-fill-inline" style="min-width: 1.6cm;"><?= $end_parts['year'] ?></span> เวลา <span class="dotted-fill-inline" style="min-width: 1.8cm;"><?= $end_parts['time'] ?></span> น.
                </div>
            </div>
            
            โดยมี <span class="dotted-fill-inline" style="min-width: 6.5cm;"><?= htmlspecialchars($booking['controller_fullname'] ?: '-') ?></span> เป็นผู้ควบคุมรถ และมีบุคคลร่วมคณะดังนี้ <br>
            <span class="dotted-fill-inline" style="width: 100%; text-align: left; text-indent: 8px; min-height: 25px; line-height: 1.6;"><?= htmlspecialchars($passenger_str) ?></span> <br>
            ในกรณีที่ไม่มีผู้ควบคุมรถ เห็นควรให้ <span class="dotted-fill-inline" style="min-width: 6.5cm;"><?= htmlspecialchars($booking['backup_controller_fullname'] ?: '-') ?></span> เป็นผู้ควบคุมรถ
        </div>

        <!-- Middle Approval and Allocation Section -->
        <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 15px; margin-top: 15px; font-size: 15px; page-break-inside: avoid;">
            <!-- Left Side: Vehicle Dept Opinion -->
            <div style="border: 1px solid #000; padding: 12px; border-radius: 4px; display: flex; flex-direction: column; gap: 8px; line-height: 1.7;">
                <div style="font-weight: bold; text-decoration: underline;">ความเห็นงานยานพาหนะ</div>
                <div>
                    จัดรถยนต์หมายเลขทะเบียน <span class="dotted-fill-inline" style="min-width: 3.5cm;"><?= htmlspecialchars($booking['license_plate'] ?: '................................') ?></span>
                </div>
                <div>
                    โดยมี <span class="dotted-fill-inline" style="min-width: 4.5cm;"><?= htmlspecialchars($booking['driver_name'] ?: '........................................') ?></span> เป็นพนักงานขับรถ
                </div>
                <div style="margin-top: 5px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <span>ลงชื่อ......................................................</span>
                    <span style="font-size: 11.5px; font-weight: bold;">(งานยานพาหนะ)</span>
                </div>
                <div style="margin-top: 3px; text-align: left;">
                    ลงชื่อ...................................................... หัวหน้างานยานพาหนะ
                </div>
            </div>
            
            <!-- Right Side: Requester & Director Signatures -->
            <div style="display: flex; flex-direction: column; justify-content: space-between; padding-left: 5px;">
                <div style="text-align: center; margin-top: 5px; margin-bottom: 15px;">
                    <p>ลงชื่อ...................................................... ผู้ขออนุญาต</p>
                    <p style="margin-top: 2px;">( <span style="font-weight: 600;"><?= htmlspecialchars($booking['creator_fullname']) ?></span> )</p>
                </div>
                
                <div style="text-align: center; margin-top: 10px;">
                    <p>ลงชื่อ...................................................... ผู้อนุมัติ</p>
                    <p style="margin-top: 2px;">( นายพงศ์สวัสดิ์ จ้างจิตต์ )</p>
                    <p style="font-size: 12.5px; font-weight: bold; margin: 0;">ผู้อำนวยการศูนย์วิทยาศาสตร์เพื่อการศึกษารังสิต</p>
                </div>
            </div>
        </div>

        <!-- Bottom Log Box (ผู้ควบคุมรถ/พนักงานขับรถ/รปภ.) -->
        <div style="border: 2px solid #000; padding: 12px; margin-top: 15px; font-size: 13.5px; line-height: 1.9; page-break-inside: avoid; border-radius: 4px;">
            <div style="font-weight: bold; border-bottom: 1.5px solid #000; padding-bottom: 3px; margin-bottom: 8px; font-size: 14.5px;">
                ผู้ควบคุมรถ/พนักงานขับรถ/รปภ.
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>ออกจากศูนย์ฯ เวลา........................น.</span>
                <span>สภาพรถ ( &nbsp; ) ปกติ &nbsp;&nbsp; ( &nbsp; ) ไม่ปกติ เพราะ................................................................</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span>เลขไมล์ออกจากศูนย์ฯ........................</span>
                <span>ลงชื่อ...............................................................................................พนักงานขับรถ</span>
            </div>
            <hr style="border: none; border-top: 1px dashed #000; margin: 6px 0;">
            <div style="display: flex; justify-content: space-between;">
                <span>กลับถึงศูนย์ฯ เวลา........................น.</span>
                <span>สภาพรถ ( &nbsp; ) ปกติ &nbsp;&nbsp; ( &nbsp; ) ไม่ปกติ เพราะ................................................................</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span>เลขไมล์เข้าจอดศูนย์ฯ........................</span>
                <span>ลงชื่อ...............................................................................................พนักงานขับรถ</span>
            </div>
            <div style="margin-top: 6px;">
                กลับถึงศูนย์ฯ ไม่ตรงเวลา เนื่องจาก.....................................................................................................................................
            </div>
            <div style="margin-top: 2px; text-align: right; font-style: italic; font-size: 11.5px; font-weight: bold; color: #333;">
                (ผู้ควบคุมรถลงรายละเอียด)
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 10px; text-align: center; font-weight: 500;">
                <div>
                    ลงชื่อ...................................................... เจ้าหน้าที่ รปภ.
                </div>
                <div>
                    ลงชื่อ...................................................... ผู้ควบคุมรถ
                </div>
            </div>
        </div>

        <div class="text-center" style="margin-top: 15px; font-size: 11px; color: #555; border-top: 1px dashed #bbb; padding-top: 6px;">
            พิมพ์โดยระบบสารสนเทศ FleetFlow เมื่อ: <?= formatThaiDateTime(date('Y-m-d H:i:s')) ?> &nbsp;&nbsp;|&nbsp;&nbsp; รหัสจองอ้างอิง: FF-<?= str_pad($booking['id'], 5, '0', STR_PAD_LEFT) ?>
        </div>
    </div>

    <script>
        // Auto open print dialog on page load
        window.onload = function() {
            // window.print();
        };
    </script>
</body>
</html>
