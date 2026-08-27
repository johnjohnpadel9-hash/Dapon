-- DAPONCHECK Database Schema
-- This SQL script creates the database structure for the Betel Leaf Quality Checker application
-- Updated for CNN model with labels: High, Medium, Not_Betel_Leaf, Poor

-- Create database
CREATE DATABASE IF NOT EXISTS daponcheck_db;
USE daponcheck_db;

-- Quality checks table
CREATE TABLE IF NOT EXISTS quality_checks (
    id VARCHAR(50) PRIMARY KEY,
    type ENUM('captured', 'uploaded') NOT NULL,
    image_data TEXT,
    file_name VARCHAR(255),
    file_size INT,
    dimensions VARCHAR(50),
    grade ENUM('A', 'B', 'C', 'D') NOT NULL,
    grade_label VARCHAR(50),
    confidence DECIMAL(5,2),
    characteristics JSON,
    quality_class VARCHAR(20),
    image_removed BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_grade (grade),
    INDEX idx_quality_class (quality_class),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Statistics table
CREATE TABLE IF NOT EXISTS statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    total_checks INT DEFAULT 0,
    grade_a INT DEFAULT 0,
    grade_b INT DEFAULT 0,
    grade_c INT DEFAULT 0,
    grade_d INT DEFAULT 0,
    captured_count INT DEFAULT 0,
    uploaded_count INT DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default statistics
INSERT INTO statistics (id, total_checks, grade_a, grade_b, grade_c, grade_d, captured_count, uploaded_count) 
VALUES (1, 0, 0, 0, 0, 0, 0, 0)
ON DUPLICATE KEY UPDATE id=id;

-- Insert default settings
INSERT INTO settings (setting_key, setting_value) VALUES
('cameraResolution', 'medium'),
('flashMode', 'false'),
('autoFocus', 'true'),
('analysisSensitivity', 'medium'),
('autoAnalysis', 'true'),
('showConfidence', 'true'),
('pushNotifications', 'true'),
('soundAlerts', 'false'),
('saveHistory', 'true')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- Sample data for testing (optional)
-- INSERT INTO quality_checks (id, type, image_data, grade, confidence, characteristics) VALUES
-- ('sample1', 'captured', NULL, 'A', 95.00, '{"color": "Healthy Green", "texture": "Smooth", "size": "Large", "freshness": "High"}'),
-- ('sample2', 'uploaded', NULL, 'B', 87.00, '{"color": "Slightly Pale", "texture": "Minor Imperfections", "size": "Medium", "freshness": "Moderate"}');
