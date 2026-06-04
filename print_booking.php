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
    <title>ใบอนุญาตใช้รถยนต์ส่วนกลาง - เลขที่ <?= htmlspecialchars($booking['id']) ?></title>
    <!-- Google Font: Sarabun -->
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
            background-color: #f4f6f9;
            color: #000;
            margin: 0;
            padding: 20px;
        }
        .a4-container {
            background-color: #fff;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 25mm 20mm;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            box-sizing: border-box;
            position: relative;
            font-size: 16px;
            line-height: 1.8;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        
        .header-section {
            margin-bottom: 30px;
            position: relative;
        }
        
        .garuda-logo {
            width: 3.5cm;
            height: auto;
            display: block;
            margin: 0 auto 15px auto;
        }
        
        .title-main {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .document-meta {
            margin-top: 10px;
            font-size: 15px;
        }
        
        .meta-line {
            margin-bottom: 10px;
        }
        
        .info-content {
            text-indent: 2.5cm;
            margin-bottom: 15px;
            text-align: justify;
        }
        
        .dotted-line {
            border-bottom: 1px dotted #333;
            display: inline-block;
            padding-bottom: 0px;
        }
        
        .table-allocation {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
        }
        
        .table-allocation td {
            padding: 8px 12px;
            border: 1px solid #000;
        }
        
        .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            page-break-inside: avoid;
        }
        
        .sig-box {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .sig-line {
            width: 70%;
            margin: 40px auto 10px auto;
            border-bottom: 1px dotted #000;
        }
        
        .no-print-banner {
            text-align: center;
            margin-bottom: 20px;
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

        .status-stamp {
            display: inline-block;
            padding: 4px 12px;
            border: 2px solid;
            border-radius: 4px;
            font-weight: 700;
            font-size: 14px;
            text-transform: uppercase;
            margin-top: 5px;
        }
        .status-pending { border-color: #ff9800; color: #ff9800; }
        .status-approved { border-color: #4caf50; color: #4caf50; }
        .status-completed { border-color: #2196f3; color: #2196f3; }
        .status-cancelled { border-color: #f44336; color: #f44336; }
        
        @media print {
            body {
                background-color: #fff;
                padding: 0;
            }
            .a4-container {
                box-shadow: none;
                margin: 0;
                padding: 0;
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
        <button class="btn-print" onclick="window.print()"><i class="fa-solid fa-print"></i> 🖨️ สั่งพิมพ์เอกสารใบขอใช้รถ</button>
    </div>

    <div class="a4-container">
        <!-- Garuda Emblem (standard for official Thai docs) -->
        <div class="text-center">
            <!-- Simple SVG Garuda Logo -->
            <svg class="garuda-logo" viewBox="0 0 100 100" width="80" height="80">
                <path d="M50 10 C50 10, 48 20, 45 25 C42 30, 35 32, 28 32 C33 36, 42 36, 47 38 C42 45, 38 52, 33 60 C38 60, 43 55, 47 50 C47 55, 45 65, 42 75 C45 72, 48 68, 50 64 C52 68, 55 72, 58 75 C55 65, 53 55, 53 50 C57 55, 62 60, 67 60 C62 52, 58 45, 53 38 C58 36, 67 36, 72 32 C65 32, 58 30, 55 25 C52 20, 50 10, 50 10 Z" fill="#b01c1c"/>
                <path d="M50 35 L45 42 L42 48 L46 48 L50 44 L54 48 L58 48 L55 42 Z" fill="#ffd700"/>
                <circle cx="50" cy="30" r="3" fill="#b01c1c"/>
            </svg>
            <div class="title-main">ใบขออนุญาตใช้รถยนต์ส่วนกลาง</div>
            <div class="header-subtitle">ระบบบริหารจัดการยานพาหนะ FleetFlow</div>
        </div>

        <div class="text-right document-meta">
            <div class="meta-line"><strong>เลขที่คำขอ:</strong> <?= htmlspecialchars($booking['id']) ?></div>
            <div class="meta-line"><strong>วันที่เขียนคำขอ:</strong> <?= formatThaiDateOnly($booking['created_at']) ?></div>
        </div>

        <div style="margin-top: 30px;">
            <div class="meta-line"><strong>เรื่อง</strong> ขอใช้รถยนต์ส่วนกลาง</div>
            <div class="meta-line"><strong>เรียน</strong> หัวหน้างานยานพาหนะ ฝ่ายบริหารงานกลาง</div>
        </div>

        <div style="margin-top: 20px;">
            <p class="info-content">
                ด้วยข้าพเจ้า <span class="dotted-line" style="min-width: 6cm; text-align: center; font-weight: 600;"><?= htmlspecialchars($booking['requester_name']) ?></span> 
                ตำแหน่ง <span class="dotted-line" style="min-width: 5cm; text-align: center;"><?= htmlspecialchars($booking['creator_title'] ?: '-') ?></span>
                สังกัดส่วนงาน <span class="dotted-line" style="min-width: 7cm; text-align: center;"><?= htmlspecialchars(($booking['creator_dept'] ?: '-') . ' / ' . ($booking['creator_div'] ?: '-')) ?></span>
                มีความประสงค์ขอใช้รถยนต์ส่วนกลางขององค์กร เพื่อเดินทางไปปฏิบัติหน้าที่ ณ 
                <span class="dotted-line" style="min-width: 12cm; font-weight: 500;"><?= htmlspecialchars($booking['destination']) ?></span>
            </p>

            <p class="info-content" style="text-indent: 0;">
                เพื่อวัตถุประสงค์ในการ <span class="dotted-line" style="min-width: 14.5cm;"><?= htmlspecialchars($booking['purpose']) ?></span>
                มีผู้ร่วมเดินทางทั้งหมดจำนวน <span class="dotted-line" style="min-width: 1.5cm; text-align: center; font-weight: 600;"><?= htmlspecialchars($booking['passenger_count']) ?></span> คน
                โดยกำหนดการเดินทางตั้งแต่วันที่ <span class="dotted-line" style="min-width: 6cm; text-align: center;"><?= formatThaiDateTime($booking['start_datetime']) ?></span>
                ถึงวันที่ <span class="dotted-line" style="min-width: 6cm; text-align: center;"><?= formatThaiDateTime($booking['end_datetime']) ?></span>
            </p>
        </div>

        <div style="margin-top: 30px;">
            <h4 style="margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px;">สำหรับงานยานพาหนะและผลการพิจารณาจัดสรร</h4>
            
            <?php if ($booking['status'] === 'pending_admin'): ?>
                <div class="text-center" style="padding: 20px; border: 1px dashed #777; border-radius: 8px; margin: 15px 0;">
                    <div class="status-stamp status-pending">⏳ อยู่ระหว่างรอการอนุมัติและจัดสรรจากเจ้าหน้าที่</div>
                    <p style="margin-top: 10px; font-size: 14px; color: #666;">ข้อมูลคนขับและยานพาหนะจะแสดงที่นี่หลังจากผู้ดูแลอนุมัติคำขอแล้ว</p>
                </div>
            <?php else: ?>
                <table class="table-allocation">
                    <tr>
                        <td width="30%"><strong>ประเภทรถที่จัดสรร</strong></td>
                        <td width="70%"><?= $booking['vehicle_type'] === 'sedan' ? 'รถเก๋ง' : ($booking['vehicle_type'] === 'van' ? 'รถตู้' : 'รถกระบะ') ?></td>
                    </tr>
                    <tr>
                        <td><strong>ยี่ห้อ / รุ่นรถยนต์</strong></td>
                        <td><?= htmlspecialchars($booking['brand_model'] ?: '-') ?></td>
                    </tr>
                    <tr>
                        <td><strong>ทะเบียนรถยนต์</strong></td>
                        <td><strong><?= htmlspecialchars($booking['license_plate'] ?: '-') ?></strong> <?= htmlspecialchars($booking['province'] ?: '') ?></td>
                    </tr>
                    <tr>
                        <td><strong>พนักงานขับรถ</strong></td>
                        <td><strong><?= htmlspecialchars($booking['driver_name'] ?: '-') ?></strong> (เบอร์โทรศัพท์: <?= htmlspecialchars($booking['driver_phone'] ?: '-') ?>)</td>
                    </tr>
                    <tr>
                        <td><strong>เลขไมล์เริ่มต้น</strong></td>
                        <td><?= $booking['start_mileage'] !== null ? number_format($booking['start_mileage']) . ' กม.' : 'ยังไม่บันทึกเลขไมล์เริ่มต้น' ?></td>
                    </tr>
                    <tr>
                        <td><strong>เลขไมล์สิ้นสุด</strong></td>
                        <td><?= $booking['end_mileage'] !== null ? number_format($booking['end_mileage']) . ' กม.' : 'ยังไม่สิ้นสุดการเดินทาง' ?></td>
                    </tr>
                </table>
                
                <div class="text-right" style="margin-bottom: 20px;">
                    <strong>สถานะคำขอ: </strong> 
                    <?php if ($booking['status'] === 'approved'): ?>
                        <span class="status-stamp status-approved">✓ อนุมัติการขอใช้รถแล้ว</span>
                    <?php elseif ($booking['status'] === 'completed'): ?>
                        <span class="status-stamp status-completed">✓ เสร็จสิ้นการเดินทาง (ปิดทริป)</span>
                    <?php elseif ($booking['status'] === 'cancelled'): ?>
                        <span class="status-stamp status-cancelled">✗ ไม่อนุมัติ / ยกเลิกคำขอ</span>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>

        <!-- Signature boxes -->
        <div class="signature-section">
            <div class="sig-box">
                <p>ลงชื่อ...................................................... ผู้ขอใช้รถ</p>
                <p style="margin-top: 10px;">( <span style="font-weight: 500;"><?= htmlspecialchars($booking['requester_name']) ?></span> )</p>
                <p style="font-size: 14px; color: #555;">ตำแหน่ง: <?= htmlspecialchars($booking['creator_title'] ?: '-') ?></p>
            </div>
            
            <div class="sig-box">
                <p>ลงชื่อ...................................................... ผู้จัดสรรงาน</p>
                <p style="margin-top: 10px;">( สมศักดิ์ รักงานดี )</p>
                <p style="font-size: 14px; color: #555;">ตำแหน่ง: หัวหน้างานยานพาหนะ</p>
            </div>

            <div class="sig-box" style="grid-column: span 2; margin-top: 30px;">
                <p>ลงชื่อ...................................................... ผู้อนุมัติคำขอใช้รถ</p>
                <p style="margin-top: 10px;">( ดร.วิชัย ใจดี )</p>
                <p style="font-size: 14px; color: #555;">ตำแหน่ง: ผู้อำนวยการส่วนบริหารงานกลาง</p>
            </div>
        </div>

        <div class="text-center" style="margin-top: 50px; font-size: 12px; color: #666; border-top: 1px dashed #ccc; padding-top: 10px;">
            พิมพ์โดยระบบสารสนเทศ FleetFlow เมื่อ: <?= formatThaiDateTime(date('Y-m-d H:i:s')) ?>
        </div>
    </div>

    <script>
        // Auto print on load
        window.onload = function() {
            // Uncomment if you want to auto open print dialog:
            // window.print();
        };
    </script>
</body>
</html>
