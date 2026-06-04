<?php
// seed_bookings.php - เพิ่มข้อมูลการจองย้อนหลัง 20 รายการ
// เรียกใช้ครั้งเดียวเพื่อเพิ่มข้อมูลตัวอย่าง
session_start();
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // ดึง user IDs, vehicle IDs, driver IDs จากฐานข้อมูล
    $users    = $pdo->query("SELECT id, username, fullname FROM users")->fetchAll(PDO::FETCH_ASSOC);
    $vehicles = $pdo->query("SELECT id, license_plate, brand_model FROM vehicles")->fetchAll(PDO::FETCH_ASSOC);
    $drivers  = $pdo->query("SELECT id, name FROM drivers WHERE status='active'")->fetchAll(PDO::FETCH_ASSOC);

    if (empty($users) || empty($vehicles) || empty($drivers)) {
        echo json_encode(['status' => 'error', 'message' => 'ไม่พบข้อมูล users/vehicles/drivers กรุณา setup_db.php ก่อน'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $u = array_column($users, 'id');
    $v = array_column($vehicles, 'id');
    $d = array_column($drivers, 'id');

    // ข้อมูลการจองย้อนหลัง 20 รายการ (ย้อนหลัง ~3 เดือน)
    $bookings = [
        // ---- เดือน มีนาคม 2569 ----
        [
            'requester' => 'ส่วนบริหารงานกลาง',
            'start'     => '2026-03-05 08:00:00',
            'end'       => '2026-03-05 17:00:00',
            'dest'      => 'กรมบัญชีกลาง กรุงเทพฯ',
            'purpose'   => 'ยื่นเอกสารเบิกจ่ายงบประมาณประจำปี',
            'subject'   => 'การเบิกจ่ายงบประมาณ',
            'trip_type' => 'daily',
            'pax'       => 2, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[0], 'did' => $d[0], 'start_mi' => 4000, 'end_mi' => 4060,
            'uid' => $u[0], 'created' => '2026-03-04 15:00:00',
        ],
        [
            'requester' => 'ส่วนเทคโนโลยีสารสนเทศ',
            'start'     => '2026-03-08 09:00:00',
            'end'       => '2026-03-08 16:30:00',
            'dest'      => 'สำนักงาน กสทช. กรุงเทพฯ',
            'purpose'   => 'ประชุมคณะกรรมการด้าน ICT',
            'subject'   => 'การประชุม ICT',
            'trip_type' => 'daily',
            'pax'       => 3, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[1], 'did' => $d[1], 'start_mi' => 44000, 'end_mi' => 44080,
            'uid' => $u[1], 'created' => '2026-03-07 10:00:00',
        ],
        [
            'requester' => 'ส่วนยุทธศาสตร์และแผนงาน',
            'start'     => '2026-03-12 07:30:00',
            'end'       => '2026-03-13 18:00:00',
            'dest'      => 'จ.เชียงใหม่ (ต่างจังหวัด)',
            'purpose'   => 'สัมมนายุทธศาสตร์การพัฒนาองค์กร ประจำปี 2569',
            'subject'   => 'สัมมนายุทธศาสตร์',
            'trip_type' => 'province',
            'pax'       => 5, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[1], 'did' => $d[0], 'start_mi' => 44080, 'end_mi' => 44780,
            'uid' => $u[0], 'created' => '2026-03-10 08:00:00',
        ],
        [
            'requester' => 'ส่วนบริหารงานกลาง',
            'start'     => '2026-03-18 10:00:00',
            'end'       => '2026-03-18 12:00:00',
            'dest'      => 'ไปรษณีย์กลาง บางรัก กรุงเทพฯ',
            'purpose'   => 'จัดส่งพัสดุและเอกสารราชการ',
            'subject'   => 'จัดส่งเอกสาร',
            'trip_type' => 'daily',
            'pax'       => 1, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[3], 'did' => $d[2], 'start_mi' => 5030, 'end_mi' => 5055,
            'uid' => $u[2], 'created' => '2026-03-17 14:00:00',
        ],
        [
            'requester' => 'ส่วนเทคโนโลยีสารสนเทศ',
            'start'     => '2026-03-22 08:00:00',
            'end'       => '2026-03-22 17:00:00',
            'dest'      => 'จ.ระยอง (ต่างจังหวัด)',
            'purpose'   => 'ตรวจสอบระบบ IT โรงงานระยองสาขา',
            'subject'   => 'ตรวจสอบระบบ IT',
            'trip_type' => 'province',
            'pax'       => 2, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[0], 'did' => $d[1], 'start_mi' => 4060, 'end_mi' => 4310,
            'uid' => $u[1], 'created' => '2026-03-20 09:00:00',
        ],

        // ---- เดือน เมษายน 2569 ----
        [
            'requester' => 'ส่วนบริหารงานกลาง',
            'start'     => '2026-04-02 09:00:00',
            'end'       => '2026-04-02 14:00:00',
            'dest'      => 'สำนักงบประมาณ กรุงเทพฯ',
            'purpose'   => 'รับเอกสารอนุมัติงบประมาณโครงการพิเศษ',
            'subject'   => 'รับเอกสารงบประมาณ',
            'trip_type' => 'daily',
            'pax'       => 2, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[0], 'did' => $d[2], 'start_mi' => 4310, 'end_mi' => 4360,
            'uid' => $u[0], 'created' => '2026-04-01 16:00:00',
        ],
        [
            'requester' => 'ส่วนยุทธศาสตร์และแผนงาน',
            'start'     => '2026-04-07 08:30:00',
            'end'       => '2026-04-07 16:00:00',
            'dest'      => 'กระทรวงศึกษาธิการ กรุงเทพฯ',
            'purpose'   => 'นำเสนอแผนพัฒนาการศึกษา ประจำปี 2569',
            'subject'   => 'นำเสนอแผนพัฒนา',
            'trip_type' => 'daily',
            'pax'       => 4, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[1], 'did' => $d[0], 'start_mi' => 44780, 'end_mi' => 44840,
            'uid' => $u[0], 'created' => '2026-04-05 11:00:00',
        ],
        [
            'requester' => 'ส่วนบริหารงานกลาง',
            'start'     => '2026-04-10 10:00:00',
            'end'       => '2026-04-10 12:30:00',
            'dest'      => 'ธนาคารกรุงไทย สาขาลาดพร้าว กรุงเทพฯ',
            'purpose'   => 'ฝากเงินและทำธุรกรรมธนาคาร',
            'subject'   => 'ธุรกรรมธนาคาร',
            'trip_type' => 'daily',
            'pax'       => 1, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[3], 'did' => $d[2], 'start_mi' => 5055, 'end_mi' => 5080,
            'uid' => $u[2], 'created' => '2026-04-09 15:00:00',
        ],
        [
            'requester' => 'ส่วนเทคโนโลยีสารสนเทศ',
            'start'     => '2026-04-16 07:00:00',
            'end'       => '2026-04-17 19:00:00',
            'dest'      => 'จ.ขอนแก่น (ต่างจังหวัด)',
            'purpose'   => 'ติดตั้งระบบเครือข่ายสำนักงานสาขาภาคตะวันออกเฉียงเหนือ',
            'subject'   => 'ติดตั้งระบบเครือข่าย',
            'trip_type' => 'province',
            'pax'       => 3, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[0], 'did' => $d[0], 'start_mi' => 4360, 'end_mi' => 4760,
            'uid' => $u[1], 'created' => '2026-04-14 09:00:00',
        ],
        [
            'requester' => 'ส่วนยุทธศาสตร์และแผนงาน',
            'start'     => '2026-04-22 09:30:00',
            'end'       => '2026-04-22 16:00:00',
            'dest'      => 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน กรุงเทพฯ',
            'purpose'   => 'ประชุมติดตามแผนพัฒนา Q1/2569',
            'subject'   => 'ประชุมติดตามแผน',
            'trip_type' => 'daily',
            'pax'       => 2, 'status' => 'cancelled', 'travel_status' => 'not_started',
            'vid' => null, 'did' => null, 'start_mi' => null, 'end_mi' => null,
            'uid' => $u[2], 'created' => '2026-04-20 14:00:00',
        ],

        // ---- เดือน พฤษภาคม 2569 ----
        [
            'requester' => 'ส่วนบริหารงานกลาง',
            'start'     => '2026-05-06 08:00:00',
            'end'       => '2026-05-06 17:00:00',
            'dest'      => 'กรมส่งเสริมการเรียนรู้ กรุงเทพฯ',
            'purpose'   => 'รายงานผลการดำเนินงานไตรมาสที่ 1',
            'subject'   => 'รายงานผลดำเนินงาน Q1',
            'trip_type' => 'daily',
            'pax'       => 3, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[1], 'did' => $d[1], 'start_mi' => 44840, 'end_mi' => 44920,
            'uid' => $u[0], 'created' => '2026-05-05 10:00:00',
        ],
        [
            'requester' => 'ส่วนเทคโนโลยีสารสนเทศ',
            'start'     => '2026-05-12 09:00:00',
            'end'       => '2026-05-12 12:00:00',
            'dest'      => 'มหาวิทยาลัยธรรมศาสตร์ รังสิต ปทุมธานี',
            'purpose'   => 'ขอยืมอุปกรณ์เพื่อการสาธิต',
            'subject'   => 'ยืมอุปกรณ์การสาธิต',
            'trip_type' => 'daily',
            'pax'       => 2, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[3], 'did' => $d[2], 'start_mi' => 5080, 'end_mi' => 5115,
            'uid' => $u[1], 'created' => '2026-05-10 11:00:00',
        ],
        [
            'requester' => 'ส่วนยุทธศาสตร์และแผนงาน',
            'start'     => '2026-05-19 08:00:00',
            'end'       => '2026-05-20 18:00:00',
            'dest'      => 'จ.ชลบุรี (ต่างจังหวัด)',
            'purpose'   => 'ศึกษาดูงานด้านนวัตกรรมการศึกษาภาคตะวันออก',
            'subject'   => 'ศึกษาดูงานนวัตกรรม',
            'trip_type' => 'province',
            'pax'       => 6, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[1], 'did' => $d[0], 'start_mi' => 44920, 'end_mi' => 45170,
            'uid' => $u[0], 'created' => '2026-05-16 09:00:00',
        ],
        [
            'requester' => 'ส่วนบริหารงานกลาง',
            'start'     => '2026-05-23 10:30:00',
            'end'       => '2026-05-23 15:00:00',
            'dest'      => 'สำนักงานประกันสังคม พื้นที่ปทุมธานี',
            'purpose'   => 'ยื่นแบบรายงานและชำระเงินสมทบประกันสังคม',
            'subject'   => 'ประกันสังคมรายเดือน',
            'trip_type' => 'daily',
            'pax'       => 1, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[3], 'did' => $d[2], 'start_mi' => 5115, 'end_mi' => 5145,
            'uid' => $u[2], 'created' => '2026-05-22 14:00:00',
        ],
        [
            'requester' => 'ส่วนเทคโนโลยีสารสนเทศ',
            'start'     => '2026-05-27 09:00:00',
            'end'       => '2026-05-27 16:00:00',
            'dest'      => 'NECTEC ปทุมธานี',
            'purpose'   => 'ประชุมความร่วมมือด้านเทคโนโลยี',
            'subject'   => 'ประชุมความร่วมมือ',
            'trip_type' => 'daily',
            'pax'       => 3, 'status' => 'completed', 'travel_status' => 'completed',
            'vid' => $v[0], 'did' => $d[1], 'start_mi' => 4760, 'end_mi' => 4800,
            'uid' => $u[1], 'created' => '2026-05-25 13:00:00',
        ],

        // ---- เดือน มิถุนายน 2569 (ปัจจุบัน) ----
        [
            'requester' => 'ส่วนบริหารงานกลาง',
            'start'     => '2026-06-02 08:00:00',
            'end'       => '2026-06-02 12:00:00',
            'dest'      => 'คลังพัสดุกลาง ลาดกระบัง กรุงเทพฯ',
            'purpose'   => 'รับครุภัณฑ์คอมพิวเตอร์งวดที่ 1',
            'subject'   => 'รับครุภัณฑ์คอมพิวเตอร์',
            'trip_type' => 'daily',
            'pax'       => 2, 'status' => 'approved', 'travel_status' => 'completed',
            'vid' => $v[1], 'did' => $d[0], 'start_mi' => 45170, 'end_mi' => 45250,
            'uid' => $u[0], 'created' => '2026-06-01 10:00:00',
        ],
        [
            'requester' => 'ส่วนยุทธศาสตร์และแผนงาน',
            'start'     => '2026-06-03 09:00:00',
            'end'       => '2026-06-03 17:00:00',
            'dest'      => 'สำนักงานส่งเสริมเศรษฐกิจดิจิทัล (DEPA) กรุงเทพฯ',
            'purpose'   => 'นำเสนอโครงการขอรับการสนับสนุนด้านดิจิทัล',
            'subject'   => 'นำเสนอโครงการดิจิทัล',
            'trip_type' => 'daily',
            'pax'       => 4, 'status' => 'approved', 'travel_status' => 'completed',
            'vid' => $v[0], 'did' => $d[2], 'start_mi' => 4800, 'end_mi' => 4860,
            'uid' => $u[2], 'created' => '2026-06-02 09:30:00',
        ],
        [
            'requester' => 'ส่วนบริหารงานกลาง',
            'start'     => '2026-06-04 13:00:00',
            'end'       => '2026-06-04 16:30:00',
            'dest'      => 'ศาลากลางจังหวัดปทุมธานี',
            'purpose'   => 'ยื่นหนังสือเรียนผู้ว่าราชการจังหวัด',
            'subject'   => 'ยื่นหนังสือราชการ',
            'trip_type' => 'daily',
            'pax'       => 2, 'status' => 'approved', 'travel_status' => 'driving',
            'vid' => $v[3], 'did' => $d[1], 'start_mi' => 5145, 'end_mi' => null,
            'uid' => $u[1], 'created' => '2026-06-04 08:00:00',
        ],
        [
            'requester' => 'ส่วนเทคโนโลยีสารสนเทศ',
            'start'     => '2026-06-05 08:30:00',
            'end'       => '2026-06-05 16:30:00',
            'dest'      => 'TOT ศูนย์ข้อมูล รังสิต ปทุมธานี',
            'purpose'   => 'ต่อสัญญาเช่าใช้บริการ Data Center',
            'subject'   => 'ต่อสัญญา Data Center',
            'trip_type' => 'daily',
            'pax'       => 2, 'status' => 'approved', 'travel_status' => 'not_started',
            'vid' => $v[0], 'did' => $d[0], 'start_mi' => null, 'end_mi' => null,
            'uid' => $u[0], 'created' => '2026-06-04 10:00:00',
        ],
        [
            'requester' => 'ส่วนยุทธศาสตร์และแผนงาน',
            'start'     => '2026-06-06 09:00:00',
            'end'       => '2026-06-07 17:00:00',
            'dest'      => 'จ.สุราษฎร์ธานี (ต่างจังหวัด)',
            'purpose'   => 'ศึกษาดูงานและประชุมเครือข่ายวิทยาศาสตร์ภาคใต้',
            'subject'   => 'ศึกษาดูงานภาคใต้',
            'trip_type' => 'province',
            'pax'       => 5, 'status' => 'pending_admin', 'travel_status' => 'not_started',
            'vid' => null, 'did' => null, 'start_mi' => null, 'end_mi' => null,
            'uid' => $u[2], 'created' => '2026-06-04 14:00:00',
        ],
    ];

    $stmt = $pdo->prepare("
        INSERT INTO bookings 
            (requester_name, start_datetime, end_datetime, destination, purpose, subject, trip_type,
             passenger_count, status, vehicle_id, driver_id, start_mileage, end_mileage, 
             travel_status, job_type, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'adhoc', ?, ?)
    ");

    $count = 0;
    foreach ($bookings as $b) {
        $stmt->execute([
            $b['requester'],
            $b['start'],
            $b['end'],
            $b['dest'],
            $b['purpose'],
            $b['subject'],
            $b['trip_type'],
            $b['pax'],
            $b['status'],
            $b['vid'],
            $b['did'],
            $b['start_mi'],
            $b['end_mi'],
            $b['travel_status'],
            $b['uid'],
            $b['created'],
        ]);
        $count++;
    }

    echo json_encode([
        'status'  => 'success',
        'message' => "เพิ่มข้อมูลการจองย้อนหลังสำเร็จ จำนวน $count รายการ",
        'details' => [
            'total'     => $count,
            'completed' => count(array_filter($bookings, fn($b) => $b['status'] === 'completed')),
            'approved'  => count(array_filter($bookings, fn($b) => $b['status'] === 'approved')),
            'cancelled' => count(array_filter($bookings, fn($b) => $b['status'] === 'cancelled')),
            'pending'   => count(array_filter($bookings, fn($b) => $b['status'] === 'pending_admin')),
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (\PDOException $e) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
