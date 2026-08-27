<?php
// DAPONCHECK API - PHP Backend for XAMPP/MySQL
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

require_once 'config.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get request URI path
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/daponcheck/api.php', '', $path);
$path = str_replace('/api.php', '', $path);

// Get action from URL parameter or path
$action = isset($_GET['action']) ? $_GET['action'] : '';

$conn = getConnection();

try {
    switch ($action) {
        // Quality Checks Operations
        case 'get_quality_checks':
            getQualityChecks($conn);
            break;
            
        case 'get_quality_check':
            $id = $_GET['id'] ?? '';
            getQualityCheckById($conn, $id);
            break;
            
        case 'add_quality_check':
            addQualityCheck($conn);
            break;
            
        case 'update_quality_check':
            $id = $_GET['id'] ?? '';
            updateQualityCheck($conn, $id);
            break;
            
        case 'delete_quality_check':
            $id = $_GET['id'] ?? '';
            deleteQualityCheck($conn, $id);
            break;
            
        case 'get_checks_by_type':
            $type = $_GET['type'] ?? '';
            getQualityChecksByType($conn, $type);
            break;
            
        case 'get_checks_by_grade':
            $grade = $_GET['grade'] ?? '';
            getQualityChecksByGrade($conn, $grade);
            break;
            
        case 'get_recent_checks':
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            getRecentQualityChecks($conn, $limit);
            break;
            
        // Settings Operations
        case 'get_settings':
            getSettings($conn);
            break;
            
        case 'get_setting':
            $key = $_GET['key'] ?? '';
            getSetting($conn, $key);
            break;
            
        case 'update_setting':
            updateSetting($conn);
            break;
            
        case 'update_settings':
            updateSettings($conn);
            break;
            
        case 'reset_settings':
            resetSettings($conn);
            break;
            
        // Statistics Operations
        case 'get_statistics':
            getStatistics($conn);
            break;
            
        case 'clear_history':
            clearHistory($conn);
            break;
            
        // Search Operations
        case 'search':
            $query = $_GET['q'] ?? '';
            searchQualityChecks($conn, $query);
            break;
            
        // Database Info
        case 'db_info':
            getDatabaseInfo($conn);
            break;
            
        default:
            sendResponse(false, 'Invalid action');
    }
} catch (Exception $e) {
    sendResponse(false, 'Error: ' . $e->getMessage());
}

$conn->close();

// Quality Checks Functions
function getQualityChecks($conn) {
    $sql = "SELECT * FROM quality_checks ORDER BY timestamp DESC";
    $result = $conn->query($sql);
    
    $checks = [];
    while ($row = $result->fetch_assoc()) {
        $row['characteristics'] = json_decode($row['characteristics'], true);
        $checks[] = $row;
    }
    
    sendResponse(true, 'Quality checks retrieved', $checks);
}

function getQualityCheckById($conn, $id) {
    if (empty($id)) {
        sendResponse(false, 'ID is required');
    }
    
    $stmt = $conn->prepare("SELECT * FROM quality_checks WHERE id = ?");
    $stmt->bind_param("s", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $row['characteristics'] = json_decode($row['characteristics'], true);
        sendResponse(true, 'Quality check retrieved', $row);
    } else {
        sendResponse(false, 'Quality check not found');
    }
    
    $stmt->close();
}

function addQualityCheck($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        sendResponse(false, 'Invalid data');
    }
    
    $id = $data['id'] ?? generateId();
    $type = $data['type'] ?? '';
    $imageData = $data['imageData'] ?? null;
    $fileName = $data['fileName'] ?? null;
    $fileSize = $data['fileSize'] ?? null;
    $dimensions = $data['dimensions'] ?? null;
    $grade = $data['grade'] ?? '';
    $gradeLabel = $data['gradeLabel'] ?? $data['grade_label'] ?? null;
    $qualityClass = $data['qualityClass'] ?? $data['quality_class'] ?? '';
    $confidence = $data['confidence'] ?? null;
    $characteristics = json_encode($data['characteristics'] ?? []);
    $imageRemoved = $data['imageRemoved'] ?? $data['image_removed'] ?? false;
    $notes = $data['notes'] ?? null;
    
    if (empty($type) || empty($grade)) {
        sendResponse(false, 'Type and grade are required');
    }
    
    $stmt = $conn->prepare("INSERT INTO quality_checks (id, type, image_data, file_name, file_size, dimensions, grade, grade_label, quality_class, confidence, characteristics, image_removed, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssissdsdiss", $id, $type, $imageData, $fileName, $fileSize, $dimensions, $grade, $gradeLabel, $qualityClass, $confidence, $characteristics, $imageRemoved, $notes);
    
    if ($stmt->execute()) {
        updateStatistics($conn, $type, $grade);
        sendResponse(true, 'Quality check added', ['id' => $id]);
    } else {
        sendResponse(false, 'Failed to add quality check');
    }
    
    $stmt->close();
}

function updateQualityCheck($conn, $id) {
    if (empty($id)) {
        sendResponse(false, 'ID is required');
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        sendResponse(false, 'Invalid data');
    }
    
    $updateFields = [];
    $types = "";
    $values = [];
    
    foreach ($data as $key => $value) {
        if ($key === 'characteristics') {
            $updateFields[] = "$key = ?";
            $types .= "s";
            $values[] = json_encode($value);
        } else {
            $updateFields[] = "$key = ?";
            $types .= "s";
            $values[] = $value;
        }
    }
    
    if (empty($updateFields)) {
        sendResponse(false, 'No fields to update');
    }
    
    $sql = "UPDATE quality_checks SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $types .= "s";
    $values[] = $id;
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$values);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Quality check updated');
    } else {
        sendResponse(false, 'Failed to update quality check');
    }
    
    $stmt->close();
}

function deleteQualityCheck($conn, $id) {
    if (empty($id)) {
        sendResponse(false, 'ID is required');
    }
    
    // Get check info before deletion
    $stmt = $conn->prepare("SELECT type, grade FROM quality_checks WHERE id = ?");
    $stmt->bind_param("s", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $type = $row['type'];
        $grade = $row['grade'];
        
        $stmt->close();
        
        // Delete the record
        $deleteStmt = $conn->prepare("DELETE FROM quality_checks WHERE id = ?");
        $deleteStmt->bind_param("s", $id);
        
        if ($deleteStmt->execute()) {
            decrementStatistics($conn, $type, $grade);
            sendResponse(true, 'Quality check deleted');
        } else {
            sendResponse(false, 'Failed to delete quality check');
        }
        
        $deleteStmt->close();
    } else {
        $stmt->close();
        sendResponse(false, 'Quality check not found');
    }
}

function getQualityChecksByType($conn, $type) {
    if (empty($type)) {
        sendResponse(false, 'Type is required');
    }
    
    $stmt = $conn->prepare("SELECT * FROM quality_checks WHERE type = ? ORDER BY timestamp DESC");
    $stmt->bind_param("s", $type);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $checks = [];
    while ($row = $result->fetch_assoc()) {
        $row['characteristics'] = json_decode($row['characteristics'], true);
        $checks[] = $row;
    }
    
    sendResponse(true, 'Quality checks retrieved', $checks);
    $stmt->close();
}

function getQualityChecksByGrade($conn, $grade) {
    if (empty($grade)) {
        sendResponse(false, 'Grade is required');
    }
    
    $stmt = $conn->prepare("SELECT * FROM quality_checks WHERE grade = ? ORDER BY timestamp DESC");
    $stmt->bind_param("s", $grade);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $checks = [];
    while ($row = $result->fetch_assoc()) {
        $row['characteristics'] = json_decode($row['characteristics'], true);
        $checks[] = $row;
    }
    
    sendResponse(true, 'Quality checks retrieved', $checks);
    $stmt->close();
}

function getRecentQualityChecks($conn, $limit) {
    $stmt = $conn->prepare("SELECT * FROM quality_checks ORDER BY timestamp DESC LIMIT ?");
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $checks = [];
    while ($row = $result->fetch_assoc()) {
        $row['characteristics'] = json_decode($row['characteristics'], true);
        $checks[] = $row;
    }
    
    sendResponse(true, 'Recent quality checks retrieved', $checks);
    $stmt->close();
}

// Settings Functions
function getSettings($conn) {
    $result = $conn->query("SELECT setting_key as key, setting_value as value FROM settings");
    
    $settings = [];
    while ($row = $result->fetch_assoc()) {
        $settings[$row['key']] = $row['value'];
    }
    
    sendResponse(true, 'Settings retrieved', $settings);
}

function getSetting($conn, $key) {
    if (empty($key)) {
        sendResponse(false, 'Key is required');
    }
    
    $stmt = $conn->prepare("SELECT setting_value as value FROM settings WHERE setting_key = ?");
    $stmt->bind_param("s", $key);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        sendResponse(true, 'Setting retrieved', $row['value']);
    } else {
        sendResponse(false, 'Setting not found');
    }
    
    $stmt->close();
}

function updateSetting($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['key']) || !isset($data['value'])) {
        sendResponse(false, 'Key and value are required');
    }
    
    $key = $data['key'];
    $value = $data['value'];
    
    $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP");
    $stmt->bind_param("sss", $key, $value, $value);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Setting updated');
    } else {
        sendResponse(false, 'Failed to update setting');
    }
    
    $stmt->close();
}

function updateSettings($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !is_array($data)) {
        sendResponse(false, 'Invalid settings data');
    }
    
    $conn->begin_transaction();
    
    try {
        foreach ($data as $key => $value) {
            $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP");
            $stmt->bind_param("sss", $key, $value, $value);
            $stmt->execute();
            $stmt->close();
        }
        
        $conn->commit();
        sendResponse(true, 'Settings updated');
    } catch (Exception $e) {
        $conn->rollback();
        sendResponse(false, 'Failed to update settings: ' . $e->getMessage());
    }
}

function resetSettings($conn) {
    $defaultSettings = [
        'cameraResolution' => 'medium',
        'flashMode' => 'false',
        'autoFocus' => 'true',
        'analysisSensitivity' => 'medium',
        'autoAnalysis' => 'true',
        'showConfidence' => 'true',
        'pushNotifications' => 'true',
        'soundAlerts' => 'false',
        'saveHistory' => 'true'
    ];
    
    $conn->begin_transaction();
    
    try {
        $conn->query("DELETE FROM settings");
        
        foreach ($defaultSettings as $key => $value) {
            $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)");
            $stmt->bind_param("ss", $key, $value);
            $stmt->execute();
            $stmt->close();
        }
        
        $conn->commit();
        sendResponse(true, 'Settings reset to default');
    } catch (Exception $e) {
        $conn->rollback();
        sendResponse(false, 'Failed to reset settings: ' . $e->getMessage());
    }
}

// Statistics Functions
function getStatistics($conn) {
    $result = $conn->query("SELECT * FROM statistics WHERE id = 1");
    
    if ($row = $result->fetch_assoc()) {
        sendResponse(true, 'Statistics retrieved', $row);
    } else {
        sendResponse(false, 'Statistics not found');
    }
}

function clearHistory($conn) {
    $conn->begin_transaction();
    
    try {
        // Delete all quality checks
        $conn->query("DELETE FROM quality_checks");
        
        // Reset statistics
        $conn->query("UPDATE statistics SET total_checks = 0, grade_a = 0, grade_b = 0, grade_c = 0, grade_d = 0, captured_count = 0, uploaded_count = 0 WHERE id = 1");
        
        $conn->commit();
        sendResponse(true, 'History cleared');
    } catch (Exception $e) {
        $conn->rollback();
        sendResponse(false, 'Failed to clear history: ' . $e->getMessage());
    }
}

// Search Function
function searchQualityChecks($conn, $query) {
    if (empty($query)) {
        sendResponse(false, 'Search query is required');
    }
    
    $searchPattern = "%$query%";
    
    $stmt = $conn->prepare("SELECT * FROM quality_checks WHERE id LIKE ? OR type LIKE ? OR grade LIKE ? OR file_name LIKE ? OR notes LIKE ? ORDER BY timestamp DESC");
    $stmt->bind_param("sssss", $searchPattern, $searchPattern, $searchPattern, $searchPattern, $searchPattern);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $checks = [];
    while ($row = $result->fetch_assoc()) {
        $row['characteristics'] = json_decode($row['characteristics'], true);
        $checks[] = $row;
    }
    
    sendResponse(true, 'Search results', $checks);
    $stmt->close();
}

// Database Info Function
function getDatabaseInfo($conn) {
    $statsResult = $conn->query("SELECT * FROM statistics WHERE id = 1");
    $stats = $statsResult->fetch_assoc();
    
    $checksResult = $conn->query("SELECT COUNT(*) as count FROM quality_checks");
    $checksCount = $checksResult->fetch_assoc()['count'];
    
    $info = [
        'type' => 'MySQL (XAMPP)',
        'name' => 'daponcheck_db',
        'totalChecks' => $checksCount,
        'statistics' => $stats,
        'tables' => ['quality_checks', 'settings', 'statistics']
    ];
    
    sendResponse(true, 'Database info retrieved', $info);
}

// Helper Functions
function updateStatistics($conn, $type, $grade) {
    $gradeUpper = strtoupper($grade);
    
    $sql = "UPDATE statistics SET 
            total_checks = total_checks + 1,
            captured_count = captured_count + ?,
            uploaded_count = uploaded_count + ?,
            grade_a = grade_a + ?,
            grade_b = grade_b + ?,
            grade_c = grade_c + ?,
            grade_d = grade_d + ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = 1";
    
    $capturedInc = ($type === 'captured') ? 1 : 0;
    $uploadedInc = ($type === 'uploaded') ? 1 : 0;
    $gradeAInc = ($gradeUpper === 'A') ? 1 : 0;
    $gradeBInc = ($gradeUpper === 'B') ? 1 : 0;
    $gradeCInc = ($gradeUpper === 'C') ? 1 : 0;
    $gradeDInc = ($gradeUpper === 'D') ? 1 : 0;
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iiiiii", $capturedInc, $uploadedInc, $gradeAInc, $gradeBInc, $gradeCInc, $gradeDInc);
    $stmt->execute();
    $stmt->close();
}

function decrementStatistics($conn, $type, $grade) {
    $gradeUpper = strtoupper($grade);
    
    $sql = "UPDATE statistics SET 
            total_checks = GREATEST(0, total_checks - 1),
            captured_count = GREATEST(0, captured_count - ?),
            uploaded_count = GREATEST(0, uploaded_count - ?),
            grade_a = GREATEST(0, grade_a - ?),
            grade_b = GREATEST(0, grade_b - ?),
            grade_c = GREATEST(0, grade_c - ?),
            grade_d = GREATEST(0, grade_d - ?),
            updated_at = CURRENT_TIMESTAMP
            WHERE id = 1";
    
    $capturedDec = ($type === 'captured') ? 1 : 0;
    $uploadedDec = ($type === 'uploaded') ? 1 : 0;
    $gradeADec = ($gradeUpper === 'A') ? 1 : 0;
    $gradeBDec = ($gradeUpper === 'B') ? 1 : 0;
    $gradeCDec = ($gradeUpper === 'C') ? 1 : 0;
    $gradeDDec = ($gradeUpper === 'D') ? 1 : 0;
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iiiiii", $capturedDec, $uploadedDec, $gradeADec, $gradeBDec, $gradeCDec, $gradeDDec);
    $stmt->execute();
    $stmt->close();
}

function generateId() {
    return uniqid() . bin2hex(random_bytes(4));
}
?>
