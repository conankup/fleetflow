<?php
// setup_db.php - Setup database and tables with mock data for FleetFlow

$is_setup_script = true;
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Connect without database to create it
    $pdo_setup = new PDO("mysql:host=$host;charset=$charset", $user, $pass, $options);
    
    // 2. Drop and Create Database
    $pdo_setup->exec("DROP DATABASE IF EXISTS `$db`");
    $pdo_setup->exec("CREATE DATABASE `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    
    // Reconnect to the newly created DB
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // 3. Create Tables
    


    // Departments Table
    $pdo->exec("CREATE TABLE departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Divisions Table
    $pdo->exec("CREATE TABLE divisions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        UNIQUE KEY dept_div (department_id, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Users Table
    $pdo->exec("CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        fullname VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        department_id INT,
        division_id INT,
        role VARCHAR(50) DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // System Access Table
    $pdo->exec("CREATE TABLE system_access (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        system_name VARCHAR(100) NOT NULL,
        is_allowed BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY user_system (user_id, system_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Vehicles Table
    $pdo->exec("CREATE TABLE vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_plate VARCHAR(50) NOT NULL,
        province VARCHAR(100) NOT NULL,
        brand_model VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL, -- 'sedan', 'van', 'pickup'
        seats INT NOT NULL,
        status VARCHAR(50) DEFAULT 'available', -- 'available', 'active', 'maintenance', 'retired'
        tax_expiry DATE NOT NULL,
        prb_expiry DATE NOT NULL,
        insurance_expiry DATE NOT NULL,
        current_mileage INT DEFAULT 0,
        last_service_mileage INT DEFAULT 0,
        service_interval INT DEFAULT 10000
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Drivers Table
    $pdo->exec("CREATE TABLE drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        license_number VARCHAR(100) NOT NULL,
        license_expiry DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'active' -- 'active', 'vacation', 'sick'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Bookings Table
    $pdo->exec("CREATE TABLE bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_name VARCHAR(255) NOT NULL,
        start_datetime DATETIME NOT NULL,
        end_datetime DATETIME NOT NULL,
        destination VARCHAR(255) NOT NULL,
        purpose TEXT NOT NULL,
        passenger_count INT DEFAULT 1,
        status VARCHAR(50) DEFAULT 'pending_admin', -- 'pending_admin', 'approved', 'completed', 'cancelled'
        vehicle_id INT,
        driver_id INT,
        start_mileage INT,
        end_mileage INT,
        travel_status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'driving', 'arrived', 'completed'
        job_type VARCHAR(50) DEFAULT 'adhoc', -- 'routine', 'adhoc'
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Routine Templates Table
    $pdo->exec("CREATE TABLE routine_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_name VARCHAR(255) NOT NULL,
        days_of_week VARCHAR(100) NOT NULL, -- '1,2,3,4,5' (1=Mon, 7=Sun)
        destination VARCHAR(255) NOT NULL,
        purpose TEXT NOT NULL,
        vehicle_type_required VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Routine Schedules Table
    $pdo->exec("CREATE TABLE routine_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_id INT NOT NULL,
        schedule_date DATE NOT NULL,
        booking_id INT,
        driver_id INT,
        vehicle_id INT,
        FOREIGN KEY (template_id) REFERENCES routine_templates(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
        UNIQUE KEY template_date (template_id, schedule_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Maintenance Alerts Table
    $pdo->exec("CREATE TABLE maintenance_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT NOT NULL,
        alert_type VARCHAR(50) NOT NULL, -- 'tax', 'prb', 'insurance', 'mileage'
        description TEXT NOT NULL,
        due_date DATE,
        due_mileage INT,
        status VARCHAR(50) DEFAULT 'active', -- 'active', 'resolved'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 4. Insert Mock Data
    


    // Departments
    $depts = ['ส่วนบริหารงานกลาง', 'ส่วนเทคโนโลยีสารสนเทศ', 'ส่วนยุทธศาสตร์และแผนงาน'];
    $dept_ids = [];
    foreach ($depts as $d) {
        $stmt = $pdo->prepare("INSERT INTO departments (name) VALUES (?)");
        $stmt->execute([$d]);
        $dept_ids[$d] = $pdo->lastInsertId();
    }

    // Divisions
    $divs = [
        ['name' => 'งานยานพาหนะ', 'dept' => 'ส่วนบริหารงานกลาง'],
        ['name' => 'งานธุรการและสารบรรณ', 'dept' => 'ส่วนบริหารงานกลาง'],
        ['name' => 'งานพัฒนาซอฟต์แวร์', 'dept' => 'ส่วนเทคโนโลยีสารสนเทศ'],
        ['name' => 'งานการเงินและบัญชี', 'dept' => 'ส่วนบริหารงานกลาง']
    ];
    $div_ids = [];
    foreach ($divs as $dv) {
        $stmt = $pdo->prepare("INSERT INTO divisions (department_id, name) VALUES (?, ?)");
        $stmt->execute([$dept_ids[$dv['dept']], $dv['name']]);
        $div_ids[$dv['name']] = $pdo->lastInsertId();
    }

    // Users
    $users_data = [
        [
            'username' => 'admin',
            'fullname' => 'สมศักดิ์ รักงานดี',
            'password' => 'admin123',
            'title' => 'หัวหน้างานยานพาหนะ',
            'dept' => 'ส่วนบริหารงานกลาง',
            'div' => 'งานยานพาหนะ',
            'role' => 'admin'
        ],
        [
            'username' => 'director',
            'fullname' => 'ดร.วิชัย ใจดี',
            'password' => 'director123',
            'title' => 'ผู้อำนวยการส่วน',
            'dept' => 'ส่วนบริหารงานกลาง',
            'div' => 'งานธุรการและสารบรรณ',
            'role' => 'staff'
        ],
        [
            'username' => 'staff1',
            'fullname' => 'นภา สดใส',
            'password' => 'password123',
            'title' => 'เจ้าหน้าที่ธุรการ',
            'dept' => 'ส่วนยุทธศาสตร์และแผนงาน',
            'div' => 'งานธุรการและสารบรรณ',
            'role' => 'staff'
        ]
    ];

    $user_ids = [];
    foreach ($users_data as $ud) {
        $hash = password_hash($ud['password'], PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, fullname, title, department_id, division_id, role) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $ud['username'],
            $hash,
            $ud['fullname'],
            $ud['title'],
            $dept_ids[$ud['dept']],
            $div_ids[$ud['div']],
            $ud['role']
        ]);
        $uid = $pdo->lastInsertId();
        $user_ids[$ud['username']] = $uid;

        // Give them system access
        $stmt_access = $pdo->prepare("INSERT INTO system_access (user_id, system_name, is_allowed) VALUES (?, 'fleetflow', 1)");
        $stmt_access->execute([$uid]);
        
        if ($ud['username'] == 'staff1') {
            $stmt_access2 = $pdo->prepare("INSERT INTO system_access (user_id, system_name, is_allowed) VALUES (?, 'e-document', 1)");
            $stmt_access2->execute([$uid]);
        }
    }

    // Vehicles
    $today = new DateTime('2026-05-22'); // Fix based on CURRENT_METADATA context
    $t_45 = clone $today; $t_45->modify('+45 days');
    $t_10 = clone $today; $t_10->modify('+10 days');
    $t_15 = clone $today; $t_15->modify('+15 days');
    $t_100 = clone $today; $t_100->modify('+100 days');
    $t_200 = clone $today; $t_200->modify('+200 days');
    $t_120 = clone $today; $t_120->modify('+120 days');
    $t_250 = clone $today; $t_250->modify('+250 days');
    $t_300 = clone $today; $t_300->modify('+300 days');

    $vehicles_data = [
        [
            'plate' => 'กข 1234',
            'province' => 'กรุงเทพมหานคร',
            'brand' => 'Toyota Camry',
            'type' => 'sedan',
            'seats' => 5,
            'status' => 'available',
            'tax' => $t_45->format('Y-m-d'), // 45 days (will trigger 60-day warning)
            'prb' => $t_100->format('Y-m-d'),
            'ins' => $t_200->format('Y-m-d'),
            'mileage' => 9800, // 200km near 10,000km interval -> triggers service alert!
            'last_service' => 0
        ],
        [
            'plate' => 'ฮต 5678',
            'province' => 'นนทบุรี',
            'brand' => 'Toyota Commuter',
            'type' => 'van',
            'seats' => 12,
            'status' => 'available',
            'tax' => $t_120->format('Y-m-d'),
            'prb' => $t_15->format('Y-m-d'), // 15 days (will trigger 30-day warning)
            'ins' => $t_250->format('Y-m-d'),
            'mileage' => 45000,
            'last_service' => 40000
        ],
        [
            'plate' => 'บบ 9012',
            'province' => 'ปทุมธานี',
            'brand' => 'Isuzu D-Max',
            'type' => 'pickup',
            'seats' => 3,
            'status' => 'maintenance',
            'tax' => $t_10->format('Y-m-d'), // Expiring very soon
            'prb' => $t_10->format('Y-m-d'),
            'ins' => $t_10->format('Y-m-d'),
            'mileage' => 120000,
            'last_service' => 115000
        ],
        [
            'plate' => 'ฆอ 4455',
            'province' => 'กรุงเทพมหานคร',
            'brand' => 'Honda Civic',
            'type' => 'sedan',
            'seats' => 5,
            'status' => 'available',
            'tax' => $t_300->format('Y-m-d'),
            'prb' => $t_300->format('Y-m-d'),
            'ins' => $t_300->format('Y-m-d'),
            'mileage' => 5200,
            'last_service' => 0
        ]
    ];

    $vehicle_ids = [];
    foreach ($vehicles_data as $vd) {
        $stmt = $pdo->prepare("INSERT INTO vehicles (license_plate, province, brand_model, type, seats, status, tax_expiry, prb_expiry, insurance_expiry, current_mileage, last_service_mileage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $vd['plate'],
            $vd['province'],
            $vd['brand'],
            $vd['type'],
            $vd['seats'],
            $vd['status'],
            $vd['tax'],
            $vd['prb'],
            $vd['ins'],
            $vd['mileage'],
            $vd['last_service']
        ]);
        $vehicle_ids[] = $pdo->lastInsertId();
    }

    // Drivers
    $drivers_data = [
        [
            'name' => 'นายสมเกียรติ ยอดขยัน',
            'phone' => '081-234-5678',
            'license' => 'DL-112233',
            'expiry' => $t_200->format('Y-m-d'),
            'status' => 'active'
        ],
        [
            'name' => 'นายวิเชียร ขยันขับ',
            'phone' => '082-345-6789',
            'license' => 'DL-445566',
            'expiry' => $t_15->format('Y-m-d'), // Expiring soon (triggers 30-day alert)
            'status' => 'active'
        ],
        [
            'name' => 'นายประหยัด ปลอดภัย',
            'phone' => '083-456-7890',
            'license' => 'DL-778899',
            'expiry' => $t_300->format('Y-m-d'),
            'status' => 'active'
        ],
        [
            'name' => 'นายธงชัย ชนะภัย',
            'phone' => '084-567-8901',
            'license' => 'DL-990011',
            'expiry' => $t_300->format('Y-m-d'),
            'status' => 'vacation' // Sick or vacation today
        ],
        [
            'name' => 'นายเสกสรร วิ่งสู้ฟัด',
            'phone' => '085-678-9012',
            'license' => 'DL-223344',
            'expiry' => $t_300->format('Y-m-d'),
            'status' => 'sick' // Sick today
        ],
        [
            'name' => 'นายมาโนชญ์ นิ่งสงบ',
            'phone' => '086-789-0123',
            'license' => 'DL-556677',
            'expiry' => $t_300->format('Y-m-d'),
            'status' => 'active'
        ]
    ];

    $driver_ids = [];
    foreach ($drivers_data as $dd) {
        $stmt = $pdo->prepare("INSERT INTO drivers (name, phone, license_number, license_expiry, status) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $dd['name'],
            $dd['phone'],
            $dd['license'],
            $dd['expiry'],
            $dd['status']
        ]);
        $driver_ids[$dd['name']] = $pdo->lastInsertId();
    }

    // Historical Bookings (To test the All-time Out-of-town Fairness Queue)
    // We want:
    // - นายสมเกียรติ ยอดขยัน (Driver 1): Has 2 historical out-of-town trips
    // - นายวิเชียร ขยันขับ (Driver 2): Has 1 historical out-of-town trip
    // - นายประหยัด ปลอดภัย (Driver 3): Has 0 out-of-town trips
    // - นายมาโนชญ์ นิ่งสงบ (Driver 6): Has 0 out-of-town trips
    
    // Historical trip for Driver 1 (May 10) - Out of town
    $stmt_book = $pdo->prepare("INSERT INTO bookings (requester_name, start_datetime, end_datetime, destination, purpose, passenger_count, status, vehicle_id, driver_id, start_mileage, end_mileage, travel_status, job_type, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    // Driver 1 Trip 1
    $stmt_book->execute([
        'ฝ่ายขาย', '2026-05-10 08:00:00', '2026-05-10 17:00:00', 
        'จ.นครราชสีมา (ต่างจังหวัด)', 'สัมมนาการตลาดจังหวัดนครราชสีมา', 3, 
        'completed', $vehicle_ids[0], $driver_ids['นายสมเกียรติ ยอดขยัน'],
        9000, 9300, 'completed', 'adhoc', $user_ids['staff1'], '2026-05-09 10:00:00'
    ]);
    
    // Driver 1 Trip 2
    $stmt_book->execute([
        'ฝ่ายวิจัย', '2026-05-14 08:30:00', '2026-05-14 16:30:00', 
        'จ.ระยอง (ต่างจังหวัด)', 'สำรวจโรงงานระยอง', 2, 
        'completed', $vehicle_ids[0], $driver_ids['นายสมเกียรติ ยอดขยัน'],
        9300, 9600, 'completed', 'adhoc', $user_ids['staff1'], '2026-05-12 14:00:00'
    ]);
    
    // Driver 2 Trip 1
    $stmt_book->execute([
        'ส่วนบริหารงานกลาง', '2026-05-16 09:00:00', '2026-05-16 18:00:00', 
        'จ.ชลบุรี (ต่างจังหวัด)', 'รับหนังสือราชการสำคัญชลบุรี', 1, 
        'completed', $vehicle_ids[1], $driver_ids['นายวิเชียร ขยันขับ'],
        44000, 44250, 'completed', 'adhoc', $user_ids['staff1'], '2026-05-15 08:00:00'
    ]);

    // Driver 3 (นายประหยัด ปลอดภัย) has local jobs only (no out-of-town prefix in destination)
    $stmt_book->execute([
        'งานเทคโนโลยีสารสนเทศ', '2026-05-18 10:00:00', '2026-05-18 12:00:00', 
        'สำนักงานเขตพญาไท (กรุงเทพฯ)', 'ซ่อมบำรุงเครือข่าย', 1, 
        'completed', $vehicle_ids[3], $driver_ids['นายประหยัด ปลอดภัย'],
        5000, 5030, 'completed', 'adhoc', $user_ids['staff1'], '2026-05-17 09:00:00'
    ]);
    
    // Routine Templates
    // Day code: 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 7 = Sun
    $templates = [
        [
            'name' => 'งานธนาคารประจำวัน',
            'days' => '1,2,3,4,5', // Mon-Fri
            'dest' => 'ธนาคารแห่งประเทศไทย (กรุงเทพฯ)',
            'purpose' => 'ทำธุรกรรมฝากถอนและรับส่งเช็คประจำวัน',
            'vehicle_type' => 'sedan'
        ],
        [
            'name' => 'ส่งหนังสือปทุมธานี',
            'days' => '2,4', // Tue & Thu
            'dest' => 'สำนักงานจังหวัดปทุมธานี (ปทุมธานี)',
            'purpose' => 'จัดส่งเอกสารและหนังสือราชการระหว่างหน่วยงาน',
            'vehicle_type' => 'pickup'
        ],
        [
            'name' => 'รับส่งวิทยากรวันหยุด',
            'days' => '6', // Saturday
            'dest' => 'ท่าอากาศยานดอนเมือง (กรุงเทพฯ)',
            'purpose' => 'รับและจัดส่งวิทยากรภายนอกโครงการพิเศษ',
            'vehicle_type' => 'van'
        ]
    ];

    foreach ($templates as $temp) {
        $stmt = $pdo->prepare("INSERT INTO routine_templates (job_name, days_of_week, destination, purpose, vehicle_type_required) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $temp['name'],
            $temp['days'],
            $temp['dest'],
            $temp['purpose'],
            $temp['vehicle_type']
        ]);
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'ติดตั้งโครงสร้างฐานข้อมูลและข้อมูลตัวอย่างสำเร็จเรียบร้อยแล้ว!',
        'details' => [
            'tables_created' => ['departments', 'divisions', 'users', 'system_access', 'vehicles', 'drivers', 'bookings', 'routine_templates', 'routine_schedules', 'maintenance_alerts'],
            'users_created' => count($users_data),
            'vehicles_created' => count($vehicles_data),
            'drivers_created' => count($drivers_data),
            'routine_templates_created' => count($templates),
            'credentials' => [
                'admin' => 'admin123',
                'director' => 'director123',
                'staff1' => 'password123'
            ]
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (\PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'การติดตั้งฐานข้อมูลล้มเหลว: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
