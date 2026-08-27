# DAPONCHECK: Mobile Image-Based Quality Checker for Betel Leaf Processing

A capstone project that provides a mobile-friendly web application for analyzing betel leaf quality using image capture and upload functionality.

## Features

- **Image Capture**: Access device camera to capture betel leaf images
- **Image Upload**: Upload existing images for quality analysis
- **Quality Analysis**: Simulated ML analysis with grade assignment (A, B, C, D)
- **Activity Tracking**: View history of all quality checks with filtering
- **Statistics Dashboard**: Summary of total checks and grade distribution
- **Settings Management**: Configure camera, analysis, and notification preferences
- **Database Integration**: MySQL database via XAMPP for data persistence

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: PHP 7.4+
- **Database**: MySQL (via XAMPP)
- **Icons**: Font Awesome 6.4.0
- **Design**: Custom betel leaf-themed CSS

## Prerequisites

- XAMPP (or any PHP/MySQL server)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Text editor or IDE (VS Code, Sublime Text, etc.)

## Installation Instructions

### 1. Install XAMPP

1. Download XAMPP from [https://www.apachefriends.org/](https://www.apachefriends.org/)
2. Run the installer and follow the setup wizard
3. Start Apache and MySQL services from XAMPP Control Panel

### 2. Setup Database

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Click on the "SQL" tab
3. Copy and paste the contents of `database.sql`
4. Click "Go" to execute the SQL script
5. This will create the `daponcheck_db` database with all required tables

### 3. Deploy Project Files

1. Navigate to XAMPP htdocs folder:
   - Windows: `C:\xampp\htdocs\`
   - Mac: `/Applications/XAMPP/htdocs/`
   - Linux: `/opt/lampp/htdocs/`

2. Create a new folder named `daponcheck`

3. Copy all project files to the `daponcheck` folder:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `api-client.js`
   - `config.php`
   - `api.php`
   - `database.sql` (for reference)

### 4. Configure Database Connection

Open `config.php` and verify the database credentials:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'daponcheck_db');
```

- Default XAMPP MySQL username: `root`
- Default XAMPP MySQL password: (empty)
- Database name: `daponcheck_db`

### 5. Access the Application

Open your web browser and navigate to:
```
http://localhost/daponcheck/
```

## Project Structure

```
daponcheck/
├── index.html          # Main HTML file
├── styles.css          # Custom CSS styling
├── script.js           # Frontend JavaScript
├── api-client.js       # API client for backend communication
├── config.php          # Database configuration
├── api.php             # PHP backend API
├── database.sql        # MySQL database schema
└── README.md           # This file
```

## Database Schema

### quality_checks Table
- `id` (VARCHAR, Primary Key) - Unique identifier
- `type` (ENUM) - 'captured' or 'uploaded'
- `image_data` (TEXT) - Base64 encoded image
- `file_name` (VARCHAR) - Original filename
- `file_size` (INT) - File size in bytes
- `dimensions` (VARCHAR) - Image dimensions
- `grade` (ENUM) - Quality grade (A, B, C, D)
- `confidence` (DECIMAL) - Analysis confidence score
- `characteristics` (JSON) - Leaf characteristics
- `timestamp` (DATETIME) - Creation timestamp
- `notes` (TEXT) - Additional notes

### settings Table
- `setting_key` (VARCHAR, Primary Key) - Setting identifier
- `setting_value` (TEXT) - Setting value
- `updated_at` (DATETIME) - Last update timestamp

### statistics Table
- `id` (INT, Primary Key) - Statistics record ID
- `total_checks` (INT) - Total quality checks
- `grade_a` (INT) - Count of A grades
- `grade_b` (INT) - Count of B grades
- `grade_c` (INT) - Count of C grades
- `grade_d` (INT) - Count of D grades
- `captured_count` (INT) - Count of captured images
- `uploaded_count` (INT) - Count of uploaded images
- `updated_at` (DATETIME) - Last update timestamp

## API Endpoints

### Quality Checks
- `GET api.php?action=get_quality_checks` - Get all quality checks
- `GET api.php?action=get_quality_check&id={id}` - Get specific check
- `POST api.php?action=add_quality_check` - Add new quality check
- `PUT api.php?action=update_quality_check&id={id}` - Update quality check
- `DELETE api.php?action=delete_quality_check&id={id}` - Delete quality check
- `GET api.php?action=get_checks_by_type&type={type}` - Get checks by type
- `GET api.php?action=get_checks_by_grade&grade={grade}` - Get checks by grade
- `GET api.php?action=get_recent_checks&limit={limit}` - Get recent checks

### Settings
- `GET api.php?action=get_settings` - Get all settings
- `GET api.php?action=get_setting&key={key}` - Get specific setting
- `POST api.php?action=update_setting` - Update single setting
- `POST api.php?action=update_settings` - Update multiple settings
- `POST api.php?action=reset_settings` - Reset to defaults

### Statistics
- `GET api.php?action=get_statistics` - Get statistics
- `DELETE api.php?action=clear_history` - Clear all history

### Search
- `GET api.php?action=search&q={query}` - Search quality checks

### Database Info
- `GET api.php?action=db_info` - Get database information

## Usage Guide

### Capturing Images
1. Navigate to the "Capture" tab
2. Click "Start Camera" to access device camera
3. Position betel leaf in camera frame
4. Click "Capture" to take photo
5. Click "Analyze Quality" to process the image
6. View analysis results with grade and characteristics

### Uploading Images
1. Navigate to the "Upload" tab
2. Drag and drop image or click to browse
3. Select betel leaf image file
4. Click "Analyze Quality" to process
5. View analysis results

### Viewing Activity
1. Navigate to the "Activity" tab
2. View recent quality checks
3. Filter by type: All, Captured, or Uploaded
4. View statistics summary at bottom

### Managing Settings
1. Navigate to the "Settings" tab
2. Configure camera settings (resolution, flash, focus)
3. Adjust analysis settings (sensitivity, auto-analysis)
4. Manage notification preferences
5. Clear history if needed

## Troubleshooting

### Database Connection Issues
- Ensure Apache and MySQL are running in XAMPP
- Verify database credentials in `config.php`
- Check that `daponcheck_db` exists in phpMyAdmin

### Camera Not Working
- Ensure browser has camera permissions
- Try using HTTPS if deployed on a server
- Check if device has a camera available

### API Errors
- Check browser console for error messages
- Verify `api.php` is in the correct location
- Ensure PHP is enabled in XAMPP

### Images Not Saving
- Check MySQL max_allowed_packet setting
- Verify database table has sufficient storage
- Check PHP upload_max_filesize setting

## Development Notes

### Quality Analysis
The current implementation uses simulated analysis. To integrate actual ML:
1. Replace simulated analysis in `script.js` with API calls to ML service
2. Update `api.php` to handle ML model predictions
3. Store actual confidence scores and characteristics

### Image Storage
Images are currently stored as base64 in the database. For production:
1. Implement file upload to server directory
2. Store file paths in database instead of base64
3. Add image compression and optimization

### Security Enhancements
For production deployment:
1. Add user authentication
2. Implement CSRF protection
3. Add input validation and sanitization
4. Use prepared statements (already implemented)
5. Enable HTTPS

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This is a capstone project for educational purposes.

## Credits

**Project Title**: DAPONCHECK: A Mobile Image-Based Quality Checker for Betel Leaf Processing

**Development Team**: DAPONCHECK Team

**Year**: 2024

## Support

For issues or questions, please contact the development team or refer to the project documentation.
