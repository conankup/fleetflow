<?php
// api.php - Main Backend API Router for FleetFlow
session_start();
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');

// Parse JSON body if present
$input_data = [];
$content_type = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';
if (strpos($content_type, 'application/json') !== false) {
    $raw_body = file_get_contents('php://input');
    $input_data = json_decode($raw_body, true) ?: [];
}

$action = isset($_GET['action']) ? $_GET['action'] : (isset($input_data['action']) ? $input_data['action'] : '');

// Security Gate: Ensure session is active for all actions except login and check_session
if (!in_array($action, ['login', 'check_session'])) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่ถูกต้อง: กรุณาเข้าสู่ระบบก่อนทำการทำรายการ'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

switch ($action) {
    case 'login':
        $username = isset($input_data['username']) ? trim($input_data['username']) : '';
        $password = isset($input_data['password']) ? $input_data['password'] : '';

        if (empty($username) || empty($password)) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $stmt = $pdo->prepare("
                SELECT u.*, u.title as title_name, d.name as dept_name, divi.name as div_name 
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                LEFT JOIN divisions divi ON u.division_id = divi.id
                WHERE u.username = ?
            ");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                // Get system access permissions
                $stmt_access = $pdo->prepare("SELECT system_name, is_allowed FROM system_access WHERE user_id = ?");
                $stmt_access->execute([$user['id']]);
                $access_rows = $stmt_access->fetchAll();
                
                $systems = [];
                foreach ($access_rows as $row) {
                    if ($row['is_allowed']) {
                        $systems[] = $row['system_name'];
                    }
                }

                // Check if user is allowed to access FleetFlow
                if (!in_array('fleetflow', $systems)) {
                    echo json_encode(['status' => 'error', 'message' => 'บัญชีผู้ใช้นี้ไม่มีสิทธิ์เข้าใช้งานระบบ FleetFlow'], JSON_UNESCAPED_UNICODE);
                    exit;
                }

                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['fullname'] = $user['fullname'];
                $_SESSION['role'] = $user['role'];
                $_SESSION['title_name'] = $user['title_name'];
                $_SESSION['dept_name'] = $user['dept_name'];
                $_SESSION['div_name'] = $user['div_name'];
                $_SESSION['systems'] = $systems;

                echo json_encode([
                    'status' => 'success',
                    'message' => 'เข้าสู่ระบบสำเร็จ',
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'fullname' => $user['fullname'],
                        'role' => $user['role'],
                        'title' => $user['title_name'],
                        'department' => $user['dept_name'],
                        'division' => $user['div_name'],
                        'systems' => $systems
                    ]
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
            }
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'ข้อผิดพลาดทางเทคนิค: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'check_session':
        if (isset($_SESSION['user_id'])) {
            echo json_encode([
                'status' => 'success',
                'logged_in' => true,
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'username' => $_SESSION['username'],
                    'fullname' => $_SESSION['fullname'],
                    'role' => $_SESSION['role'],
                    'title' => $_SESSION['title_name'],
                    'department' => $_SESSION['dept_name'],
                    'division' => $_SESSION['div_name'],
                    'systems' => $_SESSION['systems']
                ]
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                'status' => 'success',
                'logged_in' => false
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'logout':
        session_unset();
        session_destroy();
        echo json_encode(['status' => 'success', 'message' => 'ออกจากระบบสำเร็จ'], JSON_UNESCAPED_UNICODE);
        break;

    // --- 1. ORGANIZATION MDM ENDPOINTS ---
    case 'get_org_data':
        try {
            $depts = $pdo->query("SELECT * FROM departments ORDER BY name ASC")->fetchAll();
            $divs = $pdo->query("SELECT divisions.*, departments.name AS dept_name FROM divisions LEFT JOIN departments ON divisions.department_id = departments.id ORDER BY divisions.name ASC")->fetchAll();
            echo json_encode([
                'status' => 'success',
                'departments' => $depts,
                'divisions' => $divs
            ], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'save_org_item':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ: เฉพาะผู้ดูแลระบบเท่านั้นที่ทำรายการนี้ได้'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $type = isset($input_data['type']) ? trim($input_data['type']) : ''; // 'title', 'dept', 'div'
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        $name = isset($input_data['name']) ? trim($input_data['name']) : '';
        $dept_id = isset($input_data['department_id']) ? intval($input_data['department_id']) : 0;

        if (empty($type) || empty($name)) {
            echo json_encode(['status' => 'error', 'message' => 'ข้อมูลไม่ครบถ้วน'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($type === 'div' && $dept_id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณาเลือกส่วนงานต้นสังกัด'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $table = '';
        if ($type === 'dept') $table = 'departments';
        elseif ($type === 'div') $table = 'divisions';

        if (empty($table)) {
            echo json_encode(['status' => 'error', 'message' => 'ประเภทโครงสร้างองค์กรไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            if ($id > 0) {
                if ($type === 'div') {
                    $stmt = $pdo->prepare("UPDATE `$table` SET name = ?, department_id = ? WHERE id = ?");
                    $stmt->execute([$name, $dept_id, $id]);
                } else {
                    $stmt = $pdo->prepare("UPDATE `$table` SET name = ? WHERE id = ?");
                    $stmt->execute([$name, $id]);
                }
            } else {
                if ($type === 'div') {
                    $stmt = $pdo->prepare("INSERT INTO `$table` (name, department_id) VALUES (?, ?)");
                    $stmt->execute([$name, $dept_id]);
                } else {
                    $stmt = $pdo->prepare("INSERT INTO `$table` (name) VALUES (?)");
                    $stmt->execute([$name]);
                }
            }
            echo json_encode(['status' => 'success', 'message' => 'บันทึกข้อมูลสำเร็จ'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'บันทึกล้มเหลว (ชื่อนี้อาจมีอยู่แล้วในระบบ)'], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'delete_org_item':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $type = isset($input_data['type']) ? trim($input_data['type']) : '';
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;

        $table = '';
        if ($type === 'dept') $table = 'departments';
        elseif ($type === 'div') $table = 'divisions';

        if (empty($table) || $id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'ข้อมูลไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success', 'message' => 'ลบข้อมูลสำเร็จ'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'ไม่สามารถลบข้อมูลนี้ได้เนื่องจากมีข้อมูลผู้ใช้เชื่อมโยงอยู่'], JSON_UNESCAPED_UNICODE);
        }
        break;

    // --- 2. USER ACCOUNT MDM ENDPOINTS ---
    case 'get_users':
        try {
            $users = $pdo->query("
                SELECT u.id, u.username, u.fullname, u.role, u.title, u.department_id, u.division_id,
                       u.title as title_name, d.name as dept_name, divi.name as div_name, u.created_at
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                LEFT JOIN divisions divi ON u.division_id = divi.id
                ORDER BY u.id DESC
            ")->fetchAll();

            // Append system access details
            foreach ($users as &$u) {
                $stmt = $pdo->prepare("SELECT system_name, is_allowed FROM system_access WHERE user_id = ?");
                $stmt->execute([$u['id']]);
                $access = $stmt->fetchAll();
                $systems = [];
                foreach ($access as $a) {
                    if ($a['is_allowed']) {
                        $systems[] = $a['system_name'];
                    }
                }
                $u['systems'] = $systems;
            }

            echo json_encode([
                'status' => 'success',
                'users' => $users
            ], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'save_user':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        $username = isset($input_data['username']) ? trim($input_data['username']) : '';
        $fullname = isset($input_data['fullname']) ? trim($input_data['fullname']) : '';
        $password = isset($input_data['password']) ? $input_data['password'] : '';
        $title = isset($input_data['title']) ? trim($input_data['title']) : '';
        $department_id = isset($input_data['department_id']) ? intval($input_data['department_id']) : null;
        $division_id = isset($input_data['division_id']) ? intval($input_data['division_id']) : null;
        $role = isset($input_data['role']) ? trim($input_data['role']) : 'staff';
        $systems = isset($input_data['systems']) ? $input_data['systems'] : [];

        if (empty($username) || empty($fullname)) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณากรอก Username และชื่อผู้ใช้ให้ครบถ้วน'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $pdo->beginTransaction();

            if ($id > 0) {
                // Update User
                if (!empty($password)) {
                    $hash = password_hash($password, PASSWORD_DEFAULT);
                    $stmt = $pdo->prepare("UPDATE users SET username = ?, password_hash = ?, fullname = ?, title = ?, department_id = ?, division_id = ?, role = ? WHERE id = ?");
                    $stmt->execute([$username, $hash, $fullname, $title, $department_id, $division_id, $role, $id]);
                } else {
                    $stmt = $pdo->prepare("UPDATE users SET username = ?, fullname = ?, title = ?, department_id = ?, division_id = ?, role = ? WHERE id = ?");
                    $stmt->execute([$username, $fullname, $title, $department_id, $division_id, $role, $id]);
                }
                $user_id = $id;
            } else {
                // Create New User
                if (empty($password)) {
                    echo json_encode(['status' => 'error', 'message' => 'จำเป็นต้องใส่รหัสผ่านสำหรับพนักงานใหม่'], JSON_UNESCAPED_UNICODE);
                    $pdo->rollBack();
                    exit;
                }
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, fullname, title, department_id, division_id, role) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$username, $hash, $fullname, $title, $department_id, $division_id, $role]);
                $user_id = $pdo->lastInsertId();
            }

            // Sync system access tags
            $stmt_del = $pdo->prepare("DELETE FROM system_access WHERE user_id = ?");
            $stmt_del->execute([$user_id]);

            $stmt_ins = $pdo->prepare("INSERT INTO system_access (user_id, system_name, is_allowed) VALUES (?, ?, 1)");
            foreach ($systems as $sys) {
                if (!empty($sys)) {
                    $stmt_ins->execute([$user_id, trim($sys)]);
                }
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'บันทึกข้อมูลบัญชีผู้ใช้เรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            $pdo->rollBack();
            echo json_encode(['status' => 'error', 'message' => 'บันทึกล้มเหลว: ชื่อผู้ใช้งานนี้มีอยู่แล้วในระบบ'], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'delete_user':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        if ($id === intval($_SESSION['user_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'ไม่สามารถลบบัญชีของตัวเองที่กำลังใช้งานอยู่ได้'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success', 'message' => 'ลบบัญชีผู้ใช้สำเร็จ'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'ลบล้มเหลว: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // --- 3. VEHICLE MDM ENDPOINTS ---
    case 'get_vehicles':
        try {
            $vehicles = $pdo->query("SELECT * FROM vehicles ORDER BY license_plate ASC")->fetchAll();
            echo json_encode(['status' => 'success', 'vehicles' => $vehicles], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'save_vehicle':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        $license_plate = isset($input_data['license_plate']) ? trim($input_data['license_plate']) : '';
        $province = isset($input_data['province']) ? trim($input_data['province']) : '';
        $brand_model = isset($input_data['brand_model']) ? trim($input_data['brand_model']) : '';
        $type = isset($input_data['type']) ? trim($input_data['type']) : '';
        $seats = isset($input_data['seats']) ? intval($input_data['seats']) : 5;
        $status = isset($input_data['status']) ? trim($input_data['status']) : 'available';
        $tax_expiry = isset($input_data['tax_expiry']) ? trim($input_data['tax_expiry']) : '';
        $prb_expiry = isset($input_data['prb_expiry']) ? trim($input_data['prb_expiry']) : '';
        $insurance_expiry = isset($input_data['insurance_expiry']) ? trim($input_data['insurance_expiry']) : '';
        $current_mileage = isset($input_data['current_mileage']) ? intval($input_data['current_mileage']) : 0;
        $last_service_mileage = isset($input_data['last_service_mileage']) ? intval($input_data['last_service_mileage']) : 0;
        $service_interval = isset($input_data['service_interval']) ? intval($input_data['service_interval']) : 10000;

        if (empty($license_plate) || empty($province) || empty($brand_model) || empty($type) || empty($tax_expiry) || empty($prb_expiry) || empty($insurance_expiry)) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณากรอกข้อมูลรถยนต์ที่จำเป็นให้ครบถ้วน'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            if ($id > 0) {
                $stmt = $pdo->prepare("
                    UPDATE vehicles 
                    SET license_plate = ?, province = ?, brand_model = ?, type = ?, seats = ?, status = ?, 
                        tax_expiry = ?, prb_expiry = ?, insurance_expiry = ?, current_mileage = ?, 
                        last_service_mileage = ?, service_interval = ? 
                    WHERE id = ?
                ");
                $stmt->execute([
                    $license_plate, $province, $brand_model, $type, $seats, $status,
                    $tax_expiry, $prb_expiry, $insurance_expiry, $current_mileage,
                    $last_service_mileage, $service_interval, $id
                ]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO vehicles (license_plate, province, brand_model, type, seats, status, tax_expiry, prb_expiry, insurance_expiry, current_mileage, last_service_mileage, service_interval) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $license_plate, $province, $brand_model, $type, $seats, $status,
                    $tax_expiry, $prb_expiry, $insurance_expiry, $current_mileage,
                    $last_service_mileage, $service_interval
                ]);
            }
            echo json_encode(['status' => 'success', 'message' => 'บันทึกข้อมูลยานพาหนะเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'บันทึกล้มเหลว: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'delete_vehicle':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        try {
            // Check if there are active bookings linked to this vehicle
            $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE vehicle_id = ? AND status IN ('pending_admin', 'approved')");
            $stmt_check->execute([$id]);
            if ($stmt_check->fetchColumn() > 0) {
                // Instead of deletion, retire the vehicle
                $stmt = $pdo->prepare("UPDATE vehicles SET status = 'retired' WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success', 'message' => 'ยานพาหนะถูกปรับสถานะเป็น ปลดระวาง (ไม่ใช้งาน) เนื่องจากมีตารางงานเชื่อมโยงอยู่'], JSON_UNESCAPED_UNICODE);
            } else {
                $stmt = $pdo->prepare("DELETE FROM vehicles WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success', 'message' => 'ลบข้อมูลยานพาหนะสำเร็จ'], JSON_UNESCAPED_UNICODE);
            }
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'ลบล้มเหลว: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // --- 4. DRIVER MDM ENDPOINTS ---
    case 'get_drivers':
        try {
            // Calculate all-time out of town count and last out of town trip date
            $drivers = $pdo->query("
                SELECT d.*, 
                       (SELECT COUNT(*) FROM bookings b WHERE b.driver_id = d.id AND b.status = 'completed' AND b.destination LIKE '%ต่างจังหวัด%') as out_of_town_count,
                       (SELECT MAX(b.end_datetime) FROM bookings b WHERE b.driver_id = d.id AND b.status = 'completed' AND b.destination LIKE '%ต่างจังหวัด%') as last_out_of_town_date
                FROM drivers d 
                ORDER BY d.name ASC
            ")->fetchAll();
            echo json_encode(['status' => 'success', 'drivers' => $drivers], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'save_driver':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        $name = isset($input_data['name']) ? trim($input_data['name']) : '';
        $phone = isset($input_data['phone']) ? trim($input_data['phone']) : '';
        $license_number = isset($input_data['license_number']) ? trim($input_data['license_number']) : '';
        $license_expiry = isset($input_data['license_expiry']) ? trim($input_data['license_expiry']) : '';
        $status = isset($input_data['status']) ? trim($input_data['status']) : 'active';

        if (empty($name) || empty($phone) || empty($license_number) || empty($license_expiry)) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณากรอกข้อมูลพนักงานขับรถให้ครบถ้วน'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE drivers SET name = ?, phone = ?, license_number = ?, license_expiry = ?, status = ? WHERE id = ?");
                $stmt->execute([$name, $phone, $license_number, $license_expiry, $status, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO drivers (name, phone, license_number, license_expiry, status) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$name, $phone, $license_number, $license_expiry, $status]);
            }
            echo json_encode(['status' => 'success', 'message' => 'บันทึกข้อมูลพนักงานขับรถเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'บันทึกล้มเหลว: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'delete_driver':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        try {
            // Check if there are active bookings linked to this driver
            $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE driver_id = ? AND status IN ('pending_admin', 'approved')");
            $stmt_check->execute([$id]);
            if ($stmt_check->fetchColumn() > 0) {
                echo json_encode(['status' => 'error', 'message' => 'ไม่สามารถลบคนขับรถนี้ได้ เนื่องจากมีตารางงานที่ได้รับมอบหมายอยู่'], JSON_UNESCAPED_UNICODE);
            } else {
                $stmt = $pdo->prepare("DELETE FROM drivers WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success', 'message' => 'ลบข้อมูลพนักงานขับรถสำเร็จ'], JSON_UNESCAPED_UNICODE);
            }
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'ลบล้มเหลว: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // --- 5. ROUTINE JOBS & TEMPLATES ENDPOINTS ---
    case 'get_routine_templates':
        try {
            $templates = $pdo->query("SELECT * FROM routine_templates ORDER BY id ASC")->fetchAll();
            echo json_encode(['status' => 'success', 'templates' => $templates], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'save_routine_template':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        $job_name = isset($input_data['job_name']) ? trim($input_data['job_name']) : '';
        $days_of_week = isset($input_data['days_of_week']) ? trim($input_data['days_of_week']) : '';
        $destination = isset($input_data['destination']) ? trim($input_data['destination']) : '';
        $purpose = isset($input_data['purpose']) ? trim($input_data['purpose']) : '';
        $vehicle_type_required = isset($input_data['vehicle_type_required']) ? trim($input_data['vehicle_type_required']) : 'sedan';

        if (empty($job_name) || empty($days_of_week) || empty($destination) || empty($purpose)) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณากรอกข้อมูลงานประจำให้ครบถ้วน'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE routine_templates SET job_name = ?, days_of_week = ?, destination = ?, purpose = ?, vehicle_type_required = ? WHERE id = ?");
                $stmt->execute([$job_name, $days_of_week, $destination, $purpose, $vehicle_type_required, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO routine_templates (job_name, days_of_week, destination, purpose, vehicle_type_required) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$job_name, $days_of_week, $destination, $purpose, $vehicle_type_required]);
            }
            echo json_encode(['status' => 'success', 'message' => 'บันทึกตารางงานประจำล่วงหน้าเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'บันทึกล้มเหลว: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'delete_routine_template':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        try {
            $stmt = $pdo->prepare("DELETE FROM routine_templates WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success', 'message' => 'ลบตารางงานประจำล่วงหน้าสำเร็จ'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'ลบล้มเหลว: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'generate_routine_schedules':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        $week_start = isset($input_data['week_start']) ? trim($input_data['week_start']) : ''; 
        if (empty($week_start)) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณาระบุวันที่เริ่มต้นสัปดาห์'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $pdo->beginTransaction();

            $monday = new DateTime($week_start);
            $dates = [];
            for ($i = 0; $i < 7; $i++) {
                $current = clone $monday;
                $current->modify("+$i days");
                $dates[] = $current->format('Y-m-d');
            }

            $templates = $pdo->query("SELECT * FROM routine_templates")->fetchAll();
            $generated_count = 0;

            foreach ($dates as $date) {
                $dow = date('N', strtotime($date)); 
                
                foreach ($templates as $template) {
                    $days = explode(',', $template['days_of_week']);
                    if (!in_array($dow, $days)) {
                        continue;
                    }

                    $stmt_check = $pdo->prepare("SELECT id FROM routine_schedules WHERE template_id = ? AND schedule_date = ?");
                    $stmt_check->execute([$template['id'], $date]);
                    if ($stmt_check->fetch()) {
                        continue; 
                    }

                    // Get active drivers
                    $drivers = $pdo->query("SELECT id, name FROM drivers WHERE status = 'active'")->fetchAll();
                    
                    // Get busy drivers on this date
                    $stmt_busy_drivers = $pdo->prepare("
                        SELECT DISTINCT driver_id 
                        FROM bookings 
                        WHERE DATE(start_datetime) = ? AND status IN ('approved', 'completed') AND driver_id IS NOT NULL
                    ");
                    $stmt_busy_drivers->execute([$date]);
                    $busy_driver_ids = $stmt_busy_drivers->fetchAll(PDO::FETCH_COLUMN);

                    $available_drivers = [];
                    foreach ($drivers as $drv) {
                        if (!in_array($drv['id'], $busy_driver_ids)) {
                            $available_drivers[] = $drv;
                        }
                    }

                    $driver_id = null;
                    if (!empty($available_drivers)) {
                        if (strpos($template['job_name'], 'ธนาคาร') !== false) {
                            $start_of_week = $dates[0]; 
                            $end_of_week = $dates[6];   
                            
                            $driver_counts = [];
                            foreach ($available_drivers as $d_opt) {
                                $stmt_c = $pdo->prepare("
                                    SELECT COUNT(*) 
                                    FROM bookings 
                                    WHERE driver_id = ? AND job_type = 'routine' 
                                      AND DATE(start_datetime) BETWEEN ? AND ? 
                                      AND status IN ('approved', 'completed')
                                ");
                                $stmt_c->execute([$d_opt['id'], $start_of_week, $end_of_week]);
                                $count = $stmt_c->fetchColumn();
                                $driver_counts[] = [
                                    'id' => $d_opt['id'],
                                    'count' => $count
                                ];
                            }
                            
                            usort($driver_counts, function($a, $b) {
                                return $a['count'] <=> $b['count'];
                            });
                            $driver_id = $driver_counts[0]['id'];

                        } elseif (strpos($template['destination'], 'ปทุมธานี') !== false) {
                            $driver_dates = [];
                            foreach ($available_drivers as $d_opt) {
                                $stmt_d = $pdo->prepare("
                                    SELECT MAX(DATE(start_datetime)) 
                                    FROM bookings 
                                    WHERE driver_id = ? AND destination LIKE '%ปทุมธานี%' 
                                      AND status IN ('approved', 'completed')
                                ");
                                $stmt_d->execute([$d_opt['id']]);
                                $last_date = $stmt_d->fetchColumn();
                                $driver_dates[] = [
                                    'id' => $d_opt['id'],
                                    'last_date' => $last_date ? $last_date : '1970-01-01'
                                ];
                            }
                            
                            usort($driver_dates, function($a, $b) {
                                return strtotime($a['last_date']) <=> strtotime($b['last_date']);
                            });
                            $driver_id = $driver_dates[0]['id'];

                        } elseif ($dow == 6) {
                            $driver_sats = [];
                            foreach ($available_drivers as $d_opt) {
                                $stmt_s = $pdo->prepare("
                                    SELECT MAX(DATE(start_datetime)) 
                                    FROM bookings 
                                    WHERE driver_id = ? AND job_type = 'routine' AND destination LIKE '%ดอนเมือง%'
                                      AND status IN ('approved', 'completed')
                                ");
                                $stmt_s->execute([$d_opt['id']]);
                                $last_sat = $stmt_s->fetchColumn();
                                $driver_sats[] = [
                                    'id' => $d_opt['id'],
                                    'last_date' => $last_sat ? $last_sat : '1970-01-01'
                                ];
                            }
                            
                            usort($driver_sats, function($a, $b) {
                                return strtotime($a['last_date']) <=> strtotime($b['last_date']);
                            });
                            $driver_id = $driver_sats[0]['id'];
                        } else {
                            $driver_counts = [];
                            foreach ($available_drivers as $d_opt) {
                                $stmt_c = $pdo->prepare("
                                    SELECT COUNT(*) 
                                    FROM bookings 
                                    WHERE driver_id = ? AND status IN ('approved', 'completed')
                                ");
                                $stmt_c->execute([$d_opt['id']]);
                                $count = $stmt_c->fetchColumn();
                                $driver_counts[] = [
                                    'id' => $d_opt['id'],
                                    'count' => $count
                                ];
                            }
                            usort($driver_counts, function($a, $b) {
                                return $a['count'] <=> $b['count'];
                            });
                            $driver_id = $driver_counts[0]['id'];
                        }
                    }

                    // Allocate Vehicle
                    $stmt_vehicles = $pdo->prepare("
                        SELECT id 
                        FROM vehicles 
                        WHERE type = ? AND status = 'available'
                    ");
                    $stmt_vehicles->execute([$template['vehicle_type_required']]);
                    $typed_vehicles = $stmt_vehicles->fetchAll(PDO::FETCH_COLUMN);

                    $stmt_busy_vehicles = $pdo->prepare("
                        SELECT DISTINCT vehicle_id 
                        FROM bookings 
                        WHERE DATE(start_datetime) = ? AND status IN ('approved', 'completed') AND vehicle_id IS NOT NULL
                    ");
                    $stmt_busy_vehicles->execute([$date]);
                    $busy_vehicle_ids = $stmt_busy_vehicles->fetchAll(PDO::FETCH_COLUMN);

                    $vehicle_id = null;
                    foreach ($typed_vehicles as $v_id) {
                        if (!in_array($v_id, $busy_vehicle_ids)) {
                            $vehicle_id = $v_id;
                            break;
                        }
                    }

                    $stmt_ins_booking = $pdo->prepare("
                        INSERT INTO bookings (requester_name, start_datetime, end_datetime, destination, purpose, passenger_count, status, vehicle_id, driver_id, job_type, created_by)
                        VALUES (?, ?, ?, ?, ?, 1, 'approved', ?, ?, 'routine', ?)
                    ");
                    $stmt_ins_booking->execute([
                        'ระบบงานประจำ',
                        $date . ' 08:30:00',
                        $date . ' 16:30:00',
                        $template['destination'],
                        $template['purpose'],
                        $vehicle_id,
                        $driver_id,
                        $_SESSION['user_id']
                    ]);
                    $booking_id = $pdo->lastInsertId();

                    $stmt_ins_sched = $pdo->prepare("
                        INSERT INTO routine_schedules (template_id, schedule_date, booking_id, driver_id, vehicle_id)
                        VALUES (?, ?, ?, ?, ?)
                    ");
                    $stmt_ins_sched->execute([
                        $template['id'],
                        $date,
                        $booking_id,
                        $driver_id,
                        $vehicle_id
                    ]);

                    $generated_count++;
                }
            }

            $pdo->commit();
            echo json_encode([
                'status' => 'success', 
                'message' => "สร้างตารางงานประจำสำเร็จเรียบร้อยแล้ว จำนวน $generated_count รายการสำหรับสัปดาห์ $week_start"
            ], JSON_UNESCAPED_UNICODE);

        } catch (\PDOException $e) {
            $pdo->rollBack();
            echo json_encode(['status' => 'error', 'message' => 'เกิดข้อผิดพลาดในการสร้างตาราง: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // --- 6. BOOKINGS WORKSPACE ENDPOINTS ---
    case 'get_bookings':
        try {
            $bookings = $pdo->query("
                SELECT b.*, 
                       d.name as driver_name, d.phone as driver_phone,
                       v.license_plate, v.province, v.brand_model, v.type as vehicle_type,
                       u.fullname as creator_fullname
              FROM bookings b
              LEFT JOIN drivers d ON b.driver_id = d.id
              LEFT JOIN vehicles v ON b.vehicle_id = v.id
              LEFT JOIN users u ON b.created_by = u.id
              ORDER BY b.start_datetime DESC, b.id DESC
          ")->fetchAll();
          echo json_encode(['status' => 'success', 'bookings' => $bookings], JSON_UNESCAPED_UNICODE);
      } catch (\PDOException $e) {
          echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
      }
      break;

    case 'save_booking':
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        $requester_name = isset($input_data['requester_name']) ? trim($input_data['requester_name']) : '';
        $start_datetime = isset($input_data['start_datetime']) ? trim($input_data['start_datetime']) : '';
        $end_datetime = isset($input_data['end_datetime']) ? trim($input_data['end_datetime']) : '';
        $destination = isset($input_data['destination']) ? trim($input_data['destination']) : '';
        $purpose = isset($input_data['purpose']) ? trim($input_data['purpose']) : '';
        $passenger_count = isset($input_data['passenger_count']) ? intval($input_data['passenger_count']) : 1;
        
        $driver_id = isset($input_data['driver_id']) && $input_data['driver_id'] !== '' ? intval($input_data['driver_id']) : null;
        $vehicle_id = isset($input_data['vehicle_id']) && $input_data['vehicle_id'] !== '' ? intval($input_data['vehicle_id']) : null;
        $status = isset($input_data['status']) ? trim($input_data['status']) : 'pending_admin';

        if (empty($requester_name) || empty($start_datetime) || empty($end_datetime) || empty($destination) || empty($purpose)) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($_SESSION['role'] !== 'admin' && $id === 0) {
            $status = 'pending_admin';
            $driver_id = null;
            $vehicle_id = null;
        }

        try {
            if ($id > 0) {
                if ($_SESSION['role'] === 'admin') {
                    $stmt = $pdo->prepare("
                        UPDATE bookings 
                        SET requester_name = ?, start_datetime = ?, end_datetime = ?, destination = ?, 
                            purpose = ?, passenger_count = ?, driver_id = ?, vehicle_id = ?, status = ?
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $requester_name, $start_datetime, $end_datetime, $destination, 
                        $purpose, $passenger_count, $driver_id, $vehicle_id, $status, $id
                    ]);
                } else {
                    $stmt_check = $pdo->prepare("SELECT status FROM bookings WHERE id = ?");
                    $stmt_check->execute([$id]);
                    $curr_status = $stmt_check->fetchColumn();
                    if ($curr_status !== 'pending_admin') {
                        echo json_encode(['status' => 'error', 'message' => 'ไม่สามารถแก้ไขข้อมูลได้เนื่องจากรายการได้รับการอนุมัติแล้ว'], JSON_UNESCAPED_UNICODE);
                        exit;
                    }
                    $stmt = $pdo->prepare("
                        UPDATE bookings 
                        SET requester_name = ?, start_datetime = ?, end_datetime = ?, destination = ?, 
                            purpose = ?, passenger_count = ?
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $requester_name, $start_datetime, $end_datetime, $destination, 
                        $purpose, $passenger_count, $id
                    ]);
                }
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO bookings (requester_name, start_datetime, end_datetime, destination, purpose, passenger_count, driver_id, vehicle_id, status, job_type, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'adhoc', ?)
                ");
                $stmt->execute([
                    $requester_name, $start_datetime, $end_datetime, $destination, $purpose, 
                    $passenger_count, $driver_id, $vehicle_id, $status, $_SESSION['user_id']
                ]);
            }
            echo json_encode(['status' => 'success', 'message' => 'บันทึกข้อมูลการขอใช้รถเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'approve_booking':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        $driver_id = isset($input_data['driver_id']) ? intval($input_data['driver_id']) : null;
        $vehicle_id = isset($input_data['vehicle_id']) ? intval($input_data['vehicle_id']) : null;

        if ($id <= 0 || !$driver_id || !$vehicle_id) {
            echo json_encode(['status' => 'error', 'message' => 'ข้อมูลการอนุมัติไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $stmt = $pdo->prepare("
                UPDATE bookings 
                SET driver_id = ?, vehicle_id = ?, status = 'approved'
                WHERE id = ?
            ");
            $stmt->execute([$driver_id, $vehicle_id, $id]);
            echo json_encode(['status' => 'success', 'message' => 'อนุมัติการขอใช้รถและจัดสรรยานพาหนะ/คนขับเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'อนุมัติล้มเหลว: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'start_trip':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        $start_mileage = isset($input_data['start_mileage']) ? intval($input_data['start_mileage']) : 0;

        if ($id <= 0 || $start_mileage <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณากรอกเลขไมล์เริ่มต้นที่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $stmt = $pdo->prepare("
                UPDATE bookings 
                SET start_mileage = ?, travel_status = 'driving'
                WHERE id = ?
            ");
            $stmt->execute([$start_mileage, $id]);
            echo json_encode(['status' => 'success', 'message' => 'เริ่มเดินทางเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'เริ่มเดินทางล้มเหลว: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'complete_trip':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($input_data['id']) ? intval($input_data['id']) : 0;
        $end_mileage = isset($input_data['end_mileage']) ? intval($input_data['end_mileage']) : 0;

        if ($id <= 0 || $end_mileage <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณากรอกเลขไมล์สิ้นสุดที่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $pdo->beginTransaction();

            $stmt_b = $pdo->prepare("SELECT start_mileage, vehicle_id FROM bookings WHERE id = ?");
            $stmt_b->execute([$id]);
            $booking = $stmt_b->fetch();

            if (!$booking) {
                echo json_encode(['status' => 'error', 'message' => 'ไม่พบข้อมูลการจอง'], JSON_UNESCAPED_UNICODE);
                $pdo->rollBack();
                exit;
            }

            if ($end_mileage < $booking['start_mileage']) {
                echo json_encode(['status' => 'error', 'message' => 'เลขไมล์สิ้นสุดต้องไม่น้อยกว่าเลขไมล์เริ่มต้น (' . $booking['start_mileage'] . ')'], JSON_UNESCAPED_UNICODE);
                $pdo->rollBack();
                exit;
            }

            $stmt_u = $pdo->prepare("
                UPDATE bookings 
                SET end_mileage = ?, travel_status = 'completed', status = 'completed'
                WHERE id = ?
            ");
            $stmt_u->execute([$end_mileage, $id]);

            if ($booking['vehicle_id']) {
                $stmt_v = $pdo->prepare("
                    UPDATE vehicles 
                    SET current_mileage = ?
                    WHERE id = ?
                ");
                $stmt_v->execute([$end_mileage, $booking['vehicle_id']]);

                $stmt_v_details = $pdo->prepare("SELECT brand_model, license_plate, last_service_mileage, service_interval FROM vehicles WHERE id = ?");
                $stmt_v_details->execute([$booking['vehicle_id']]);
                $veh = $stmt_v_details->fetch();

                $next_service = $veh['last_service_mileage'] + $veh['service_interval'];
                if (($next_service - $end_mileage) <= 500) {
                    $stmt_alert_check = $pdo->prepare("
                        SELECT id FROM maintenance_alerts 
                        WHERE vehicle_id = ? AND alert_type = 'mileage' AND status = 'active'
                    ");
                    $stmt_alert_check->execute([$booking['vehicle_id']]);
                    if (!$stmt_alert_check->fetch()) {
                        $desc = "รถยนต์ทะเบียน " . $veh['license_plate'] . " (" . $veh['brand_model'] . ") ถึงกำหนดเช็คศูนย์ที่ระยะ " . number_format($next_service) . " กม. (เลขไมล์ปัจจุบัน: " . number_format($end_mileage) . " กม.)";
                        $stmt_alert_ins = $pdo->prepare("
                            INSERT INTO maintenance_alerts (vehicle_id, alert_type, description, due_mileage, status)
                            VALUES (?, 'mileage', ?, ?, 'active')
                        ");
                        $stmt_alert_ins->execute([$booking['vehicle_id'], $desc, $next_service]);
                    }
                }
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'ปิดทริปการเดินทางและบันทึกเลขไมล์สำเร็จ'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            $pdo->rollBack();
            echo json_encode(['status' => 'error', 'message' => 'เกิดข้อผิดพลาดในการบันทึกไมล์: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'get_driver_recommendations':
        $date = isset($_GET['date']) ? trim($_GET['date']) : '';
        if (empty($date)) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณาระบุวันที่ต้องการเดินทาง'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $day_of_week = date('N', strtotime($date)); 
            
            $saturday_driver_id = null;
            if ($day_of_week == 7) { 
                $saturday_date = date('Y-m-d', strtotime('-1 day', strtotime($date)));
                $stmt_sat = $pdo->prepare("
                    SELECT driver_id 
                    FROM bookings 
                    WHERE DATE(start_datetime) = ? AND status IN ('approved', 'completed') AND driver_id IS NOT NULL
                    LIMIT 1
                ");
                $stmt_sat->execute([$saturday_date]);
                $saturday_driver_id = $stmt_sat->fetchColumn();
            }

            $drivers = $pdo->query("
                SELECT d.id, d.name, d.phone, d.status,
                       (SELECT COUNT(*) FROM bookings b WHERE b.driver_id = d.id AND b.status IN ('approved', 'completed') AND b.destination LIKE '%ต่างจังหวัด%') as out_of_town_count,
                       (SELECT MAX(b.end_datetime) FROM bookings b WHERE b.driver_id = d.id AND b.status IN ('approved', 'completed') AND b.destination LIKE '%ต่างจังหวัด%') as last_out_of_town_date
                FROM drivers d
                WHERE d.status = 'active'
                ORDER BY d.name ASC
            ")->fetchAll();

            $stmt_busy = $pdo->prepare("
                SELECT DISTINCT driver_id 
                FROM bookings 
                WHERE DATE(start_datetime) = ? AND status IN ('approved', 'completed') AND driver_id IS NOT NULL
            ");
            $stmt_busy->execute([$date]);
            $busy_driver_ids = $stmt_busy->fetchAll(PDO::FETCH_COLUMN);

            $recommendations = [];
            foreach ($drivers as $d) {
                $is_available = !in_array($d['id'], $busy_driver_ids);
                $is_saturday_locked = ($saturday_driver_id && $d['id'] == $saturday_driver_id);
                
                $recommendations[] = [
                    'id' => $d['id'],
                    'name' => $d['name'],
                    'phone' => $d['phone'],
                    'out_of_town_count' => intval($d['out_of_town_count']),
                    'last_out_of_town_date' => $d['last_out_of_town_date'],
                    'is_available' => $is_available,
                    'is_saturday_locked' => $is_saturday_locked
                ];
            }

            usort($recommendations, function($a, $b) {
                if ($a['is_available'] !== $b['is_available']) {
                    return $b['is_available'] <=> $a['is_available']; 
                }
                if ($a['is_saturday_locked'] !== $b['is_saturday_locked']) {
                    return $b['is_saturday_locked'] <=> $a['is_saturday_locked']; 
                }
                if ($a['out_of_town_count'] !== $b['out_of_town_count']) {
                    return $a['out_of_town_count'] <=> $b['out_of_town_count'];
                }
                if (empty($a['last_out_of_town_date']) && !empty($b['last_out_of_town_date'])) return -1;
                if (!empty($a['last_out_of_town_date']) && empty($b['last_out_of_town_date'])) return 1;
                if (empty($a['last_out_of_town_date']) && empty($b['last_out_of_town_date'])) return 0;
                return strtotime($a['last_out_of_town_date']) <=> strtotime($b['last_out_of_town_date']);
            });

            echo json_encode(['status' => 'success', 'recommendations' => $recommendations], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'get_available_vehicles':
        $date = isset($_GET['date']) ? trim($_GET['date']) : '';
        if (empty($date)) {
            echo json_encode(['status' => 'error', 'message' => 'กรุณาระบุวันที่ต้องการเดินทาง'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        try {
            $vehicles = $pdo->query("SELECT * FROM vehicles WHERE status = 'available' ORDER BY license_plate ASC")->fetchAll();
            
            $stmt_busy = $pdo->prepare("
                SELECT DISTINCT vehicle_id 
                FROM bookings 
                WHERE DATE(start_datetime) = ? AND status IN ('approved', 'completed') AND vehicle_id IS NOT NULL
            ");
            $stmt_busy->execute([$date]);
            $busy_vehicle_ids = $stmt_busy->fetchAll(PDO::FETCH_COLUMN);

            $list = [];
            foreach ($vehicles as $v) {
                $list[] = [
                    'id' => $v['id'],
                    'license_plate' => $v['license_plate'],
                    'province' => $v['province'],
                    'brand_model' => $v['brand_model'],
                    'type' => $v['type'],
                    'seats' => $v['seats'],
                    'current_mileage' => $v['current_mileage'],
                    'is_available' => !in_array($v['id'], $busy_vehicle_ids)
                ];
            }
            echo json_encode(['status' => 'success', 'vehicles' => $list], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // --- 7. DASHBOARD & CONFLICTS ENDPOINTS ---
    case 'get_dashboard_data':
        try {
            $today_str = date('Y-m-d');
            
            $total_vehicles = $pdo->query("SELECT COUNT(*) FROM vehicles WHERE status != 'retired'")->fetchColumn();
            $available_vehicles = $pdo->query("SELECT COUNT(*) FROM vehicles WHERE status = 'available'")->fetchColumn();
            $active_drivers = $pdo->query("SELECT COUNT(*) FROM drivers WHERE status = 'active'")->fetchColumn();
            
            $stmt_today_bookings = $pdo->prepare("
                SELECT COUNT(*) FROM bookings 
                WHERE DATE(start_datetime) = ? AND status IN ('approved', 'completed')
            ");
            $stmt_today_bookings->execute([$today_str]);
            $bookings_today = $stmt_today_bookings->fetchColumn();

            $bookings_pending = $pdo->query("
                SELECT COUNT(*) FROM bookings WHERE status = 'pending_admin'
            ")->fetchColumn();

            $active_trips = $pdo->query("
                SELECT b.*, d.name as driver_name, v.license_plate, v.brand_model
                FROM bookings b
                LEFT JOIN drivers d ON b.driver_id = d.id
                LEFT JOIN vehicles v ON b.vehicle_id = v.id
                WHERE b.travel_status = 'driving'
                ORDER BY b.start_datetime DESC
            ")->fetchAll();

            $alerts = [];
            
            $mileage_alerts = $pdo->query("
                SELECT m.*, v.license_plate, v.brand_model 
                FROM maintenance_alerts m
                JOIN vehicles v ON m.vehicle_id = v.id
                WHERE m.status = 'active'
            ")->fetchAll();
            foreach ($mileage_alerts as $ma) {
                $alerts[] = [
                    'type' => 'mileage',
                    'title' => 'ถึงระยะเช็คศูนย์บริการ',
                    'description' => $ma['description'],
                    'severity' => 'danger',
                    'vehicle_id' => $ma['vehicle_id'],
                    'alert_id' => $ma['id']
                ];
            }

            $vehicles = $pdo->query("SELECT id, license_plate, brand_model, tax_expiry, prb_expiry, insurance_expiry FROM vehicles WHERE status != 'retired'")->fetchAll();
            $today = new DateTime();
            foreach ($vehicles as $v) {
                $tax = new DateTime($v['tax_expiry']);
                $prb = new DateTime($v['prb_expiry']);
                $ins = new DateTime($v['insurance_expiry']);
                
                $diff_tax = $today->diff($tax)->format("%r%a");
                $diff_prb = $today->diff($prb)->format("%r%a");
                $diff_ins = $today->diff($ins)->format("%r%a");

                if ($diff_tax <= 60) {
                    $sev = $diff_tax <= 30 ? 'danger' : 'warning';
                    $days_lbl = $diff_tax < 0 ? 'หมดอายุแล้ว ' . abs($diff_tax) . ' วัน' : 'จะหมดอายุใน ' . $diff_tax . ' วัน';
                    $alerts[] = [
                        'type' => 'document_tax',
                        'title' => 'ภาษีรถยนต์ใกล้หมดอายุ',
                        'description' => "รถยนต์ " . $v['license_plate'] . " (" . $v['brand_model'] . ") ภาษี$days_lbl (หมดอายุ: " . $v['tax_expiry'] . ")",
                        'severity' => $sev,
                        'vehicle_id' => $v['id']
                    ];
                }
                if ($diff_prb <= 60) {
                    $sev = $diff_prb <= 30 ? 'danger' : 'warning';
                    $days_lbl = $diff_prb < 0 ? 'หมดอายุแล้ว ' . abs($diff_prb) . ' วัน' : 'จะหมดอายุใน ' . $diff_prb . ' วัน';
                    $alerts[] = [
                        'type' => 'document_prb',
                        'title' => 'พรบ.รถยนต์ใกล้หมดอายุ',
                        'description' => "รถยนต์ " . $v['license_plate'] . " (" . $v['brand_model'] . ") พรบ.$days_lbl (หมดอายุ: " . $v['prb_expiry'] . ")",
                        'severity' => $sev,
                        'vehicle_id' => $v['id']
                    ];
                }
                if ($diff_ins <= 60) {
                    $sev = $diff_ins <= 30 ? 'danger' : 'warning';
                    $days_lbl = $diff_ins < 0 ? 'หมดอายุแล้ว ' . abs($diff_ins) . ' วัน' : 'จะหมดอายุใน ' . $diff_ins . ' วัน';
                    $alerts[] = [
                        'type' => 'document_insurance',
                        'title' => 'ประกันภัยใกล้หมดอายุ',
                        'description' => "รถยนต์ " . $v['license_plate'] . " (" . $v['brand_model'] . ") ประกันภัย$days_lbl (หมดอายุ: " . $v['insurance_expiry'] . ")",
                        'severity' => $sev,
                        'vehicle_id' => $v['id']
                    ];
                }
            }

            $drivers = $pdo->query("SELECT id, name, license_expiry FROM drivers WHERE status = 'active'")->fetchAll();
            foreach ($drivers as $d) {
                $lic = new DateTime($d['license_expiry']);
                $diff_lic = $today->diff($lic)->format("%r%a");
                if ($diff_lic <= 30) {
                    $sev = $diff_lic <= 10 ? 'danger' : 'warning';
                    $days_lbl = $diff_lic < 0 ? 'หมดอายุแล้ว ' . abs($diff_lic) . ' วัน' : 'จะหมดอายุใน ' . $diff_lic . ' วัน';
                    $alerts[] = [
                        'type' => 'driver_license',
                        'title' => 'ใบอนุญาตขับขี่ใกล้หมดอายุ',
                        'description' => "คนขับ " . $d['name'] . " ใบขับขี่$days_lbl (หมดอายุ: " . $d['license_expiry'] . ")",
                        'severity' => $sev,
                        'driver_id' => $d['id']
                    ];
                }
            }

            $conflicts = $pdo->query("
                SELECT b1.id AS booking_id, b1.driver_id, d.name AS driver_name,
                       b1.start_datetime AS start1, b1.end_datetime AS end1, b1.destination AS dest1, b1.job_type AS type1, b1.purpose AS purpose1,
                       b2.id AS adhoc_booking_id, b2.start_datetime AS start2, b2.end_datetime AS end2, b2.destination AS dest2, b2.job_type AS type2, b2.purpose AS purpose2,
                       DATE(b1.start_datetime) as conflict_date
                FROM bookings b1
                JOIN bookings b2 ON b1.driver_id = b2.driver_id AND DATE(b1.start_datetime) = DATE(b2.start_datetime) AND b1.id < b2.id
                JOIN drivers d ON b1.driver_id = d.id
                WHERE b1.status IN ('approved', 'completed') AND b2.status IN ('approved', 'completed')
                  AND b1.job_type = 'routine' AND b2.job_type = 'adhoc'
            ")->fetchAll();

            foreach ($conflicts as &$c) {
                $c_date = $c['conflict_date'];
                
                $stmt_busy = $pdo->prepare("
                    SELECT DISTINCT driver_id 
                    FROM bookings 
                    WHERE DATE(start_datetime) = ? AND status IN ('approved', 'completed') AND driver_id IS NOT NULL
                ");
                $stmt_busy->execute([$c_date]);
                $busy_ids = $stmt_busy->fetchAll(PDO::FETCH_COLUMN);

                $stmt_avail = $pdo->query("SELECT id, name FROM drivers WHERE status = 'active'");
                $avail_drivers = [];
                while ($dr = $stmt_avail->fetch()) {
                    if (!in_array($dr['id'], $busy_ids)) {
                        $avail_drivers[] = $dr;
                    }
                }
                $c['available_replacements'] = $avail_drivers;
            }

            echo json_encode([
                'status' => 'success',
                'stats' => [
                    'total_vehicles' => $total_vehicles,
                    'available_vehicles' => $available_vehicles,
                    'active_drivers' => $active_drivers,
                    'bookings_today' => $bookings_today,
                    'bookings_pending' => $bookings_pending
                ],
                'active_trips' => $active_trips,
                'alerts' => $alerts,
                'conflicts' => $conflicts
            ], JSON_UNESCAPED_UNICODE);

        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'resolve_conflict':
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'สิทธิ์ไม่เพียงพอ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $booking_id = isset($input_data['booking_id']) ? intval($input_data['booking_id']) : 0;
        $driver_id = isset($input_data['driver_id']) ? intval($input_data['driver_id']) : null;

        if ($booking_id <= 0 || !$driver_id) {
            echo json_encode(['status' => 'error', 'message' => 'ข้อมูลผู้ขับทดแทนไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("UPDATE bookings SET driver_id = ? WHERE id = ?");
            $stmt->execute([$driver_id, $booking_id]);

            $stmt2 = $pdo->prepare("UPDATE routine_schedules SET driver_id = ? WHERE booking_id = ?");
            $stmt2->execute([$driver_id, $booking_id]);

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'เปลี่ยนตัวคนขับทดแทนสําเร็จเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            $pdo->rollBack();
            echo json_encode(['status' => 'error', 'message' => 'เปลี่ยนคนขับล้มเหลว: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // --- 8. REPORTS & EXPORTS ENDPOINTS ---
    case 'get_reports':
        try {
            $vehicle_stats = $pdo->query("
                SELECT v.id, v.license_plate, v.province, v.brand_model, v.type,
                       COUNT(b.id) as total_trips,
                       SUM(CASE WHEN b.end_mileage IS NOT NULL AND b.start_mileage IS NOT NULL THEN (b.end_mileage - b.start_mileage) ELSE 0 END) as total_distance
                FROM vehicles v
                LEFT JOIN bookings b ON v.id = b.vehicle_id AND b.status = 'completed'
                WHERE v.status != 'retired'
                GROUP BY v.id
                ORDER BY total_trips DESC
            ")->fetchAll();

            $driver_stats = $pdo->query("
                SELECT d.id, d.name, d.phone, d.status,
                       COUNT(b.id) as total_trips,
                       SUM(CASE WHEN b.destination LIKE '%ต่างจังหวัด%' THEN 1 ELSE 0 END) as out_of_town_trips,
                       (SELECT MAX(b2.end_datetime) FROM bookings b2 WHERE b2.driver_id = d.id AND b2.status = 'completed' AND b2.destination LIKE '%ต่างจังหวัด%') as last_out_of_town
                FROM drivers d
                LEFT JOIN bookings b ON d.id = b.driver_id AND b.status = 'completed'
                GROUP BY d.id
                ORDER BY out_of_town_trips ASC, last_out_of_town ASC
            ")->fetchAll();

            echo json_encode([
                'status' => 'success',
                'vehicle_stats' => $vehicle_stats,
                'driver_stats' => $driver_stats
            ], JSON_UNESCAPED_UNICODE);
        } catch (\PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'export_report':
        try {
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="fleetflow_report_' . date('Ymd_His') . '.csv"');
            echo "\xEF\xBB\xBF";

            $output = fopen('php://output', 'w');

            fputcsv($output, ['รายงานสถิติการใช้งานยานพาหนะ (สรุปผลสะสม)']);
            fputcsv($output, ['ทะเบียนรถ', 'จังหวัด', 'ยี่ห้อ/รุ่น', 'ประเภท', 'จำนวนทริปที่ขับขี่', 'ระยะทางวิ่งสะสม (กม.)']);

            $vehicle_stats = $pdo->query("
                SELECT v.license_plate, v.province, v.brand_model, v.type,
                       COUNT(b.id) as total_trips,
                       SUM(CASE WHEN b.end_mileage IS NOT NULL AND b.start_mileage IS NOT NULL THEN (b.end_mileage - b.start_mileage) ELSE 0 END) as total_distance
                FROM vehicles v
                LEFT JOIN bookings b ON v.id = b.vehicle_id AND b.status = 'completed'
                WHERE v.status != 'retired'
                GROUP BY v.id
                ORDER BY total_trips DESC
            ")->fetchAll();

            foreach ($vehicle_stats as $vs) {
                $type_lbl = $vs['type'] === 'sedan' ? 'รถเก๋ง' : ($vs['type'] === 'van' ? 'รถตู้' : 'รถกระบะ');
                fputcsv($output, [
                    $vs['license_plate'],
                    $vs['province'],
                    $vs['brand_model'],
                    $type_lbl,
                    $vs['total_trips'],
                    $vs['total_distance']
                ]);
            }

            fputcsv($output, []);
            fputcsv($output, []);

            fputcsv($output, ['รายงานสถิติและความเท่าเทียมของพนักงานขับรถ']);
            fputcsv($output, ['ชื่อ-นามสกุลคนขับ', 'เบอร์โทรศัพท์', 'สถานะ', 'จำนวนงานขับสะสมทั้งหมด', 'จำนวนทริปต่างจังหวัด', 'เดินทางต่างจังหวัดล่าสุด']);

            $driver_stats = $pdo->query("
                SELECT d.name, d.phone, d.status,
                       COUNT(b.id) as total_trips,
                       SUM(CASE WHEN b.destination LIKE '%ต่างจังหวัด%' THEN 1 ELSE 0 END) as out_of_town_trips,
                       (SELECT MAX(b2.end_datetime) FROM bookings b2 WHERE b2.driver_id = d.id AND b2.status = 'completed' AND b2.destination LIKE '%ต่างจังหวัด%') as last_out_of_town
                FROM drivers d
                LEFT JOIN bookings b ON d.id = b.driver_id AND b.status = 'completed'
                GROUP BY d.id
                ORDER BY out_of_town_trips ASC, last_out_of_town ASC
            ")->fetchAll();

            foreach ($driver_stats as $ds) {
                $status_lbl = $ds['status'] === 'active' ? 'พร้อมขับงาน' : ($ds['status'] === 'vacation' ? 'ลาพักร้อน' : 'ลาป่วย');
                fputcsv($output, [
                    $ds['name'],
                    $ds['phone'],
                    $status_lbl,
                    $ds['total_trips'],
                    $ds['out_of_town_trips'],
                    $ds['last_out_of_town'] ? $ds['last_out_of_town'] : '-'
                ]);
            }

            fclose($output);
            exit;
        } catch (\PDOException $e) {
            http_response_code(500);
            echo "เกิดข้อผิดพลาดในการส่งออกรายงาน: " . $e->getMessage();
            exit;
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'ไม่พบ API action ที่ต้องการ'], JSON_UNESCAPED_UNICODE);
        break;
}
