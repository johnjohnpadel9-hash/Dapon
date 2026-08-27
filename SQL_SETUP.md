# SQL Database Setup Guide for DAPONCHECK

This guide explains how to set up the MySQL database for the DAPONCHECK application using XAMPP.

## Prerequisites

- XAMPP installed on your computer
- Basic knowledge of MySQL/phpMyAdmin

## Setup Instructions

### 1. Start XAMPP Services

1. Open XAMPP Control Panel
2. Start Apache and MySQL services
3. Ensure both services are running (green indicator)

### 2. Create Database

**Option A: Using phpMyAdmin (Recommended)**

1. Open your browser and go to: `http://localhost/phpmyadmin`
2. Click on "Databases" tab
3. Create a new database named: `daponcheck_db`
4. Click "Create"

**Option B: Using MySQL Command Line**

```bash
# Open MySQL command line
mysql -u root -p

# Create database
CREATE DATABASE daponcheck_db;
USE daponcheck_db;
```

### 3. Import Database Schema

**Option A: Using phpMyAdmin**

1. Select the `daponcheck_db` database
2. Click on "Import" tab
3. Choose the `database.sql` file from your DAPONCHECK folder
4. Click "Go" to import

**Option B: Using MySQL Command Line**

```bash
mysql -u root -p daponcheck_db < database.sql
```

### 4. Configure Application

The application is configured to use the SQL database by default. The configuration is in `script.js`:

```javascript
const API_CONFIG = {
    baseUrl: 'http://localhost/daponcheck/api.php',
    useLocalStorage: false // Set to true to use localStorage instead
};
```

### 5. Deploy PHP Files

Ensure the following files are in your XAMPP htdocs folder:

```
C:/xampp/htdocs/daponcheck/
├── index.html
├── script.js
├── styles.css
├── config.php
├── api.php
├── database.sql
└── model/
    ├── BetelLeafDataset_model.tflite
    └── labels.txt
```

### 6. Access the Application

Open your browser and navigate to: `http://localhost/daponcheck`

## Database Schema

The database consists of three main tables:

### quality_checks
- Stores all quality check results
- Includes image data, grades, confidence scores, and characteristics
- Supports both captured and uploaded images

### settings
- Stores application settings
- Includes camera, analysis, and notification preferences

### statistics
- Stores aggregated statistics
- Tracks total checks and grade distributions

## Troubleshooting

### Connection Issues

If you see "API error, falling back to localStorage" in the console:

1. Check that Apache and MySQL are running in XAMPP
2. Verify the database exists in phpMyAdmin
3. Check that the PHP files are in the correct location
4. Ensure the API URL in `script.js` matches your setup

### Database Import Errors

If the import fails:

1. Check that the database name matches exactly: `daponcheck_db`
2. Ensure you have proper permissions in phpMyAdmin
3. Try dropping the database and recreating it before import

### Permission Issues

If you get permission errors:

1. Check that MySQL user has proper privileges
2. Default XAMPP user is `root` with no password
3. Update credentials in `config.php` if needed

## Switching Between SQL and LocalStorage

To use localStorage instead of SQL database:

1. Open `script.js`
2. Change `useLocalStorage: false` to `useLocalStorage: true`
3. Refresh the application

The application will automatically fallback to localStorage if the SQL database is unavailable.

## Database Maintenance

### Backup Database

```bash
# Using mysqldump
mysqldump -u root -p daponcheck_db > backup.sql

# Using phpMyAdmin
# Export the database from phpMyAdmin interface
```

### Clear History

The application includes a "Clear History" button in the Activity section that will:
- Delete all quality check records
- Reset statistics to zero
- Maintain settings

### Performance Optimization

The database includes indexes for:
- Type (captured/uploaded)
- Grade (A/B/C/D)
- Quality class
- Timestamp

This ensures fast queries even with large datasets.

## Security Notes

- Default XAMPP MySQL setup has no password for root user
- For production, set a strong MySQL password
- Update credentials in `config.php`
- Consider using environment variables for sensitive data
- Enable HTTPS in production

## Support

For issues with:
- **XAMPP**: Check XAMPP documentation
- **MySQL**: Check MySQL documentation
- **PHP**: Check PHP documentation
- **Application**: Review console logs for error messages
