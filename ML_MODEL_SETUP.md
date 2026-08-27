# DAPONCHECK - ML Model Integration Guide

## Overview

The DAPONCHECK application now includes functional betel leaf quality grading using TensorFlow Lite machine learning models. This guide explains how to set up and use the ML model for production deployment.

## Model Information

**Model Name:** betel_leaf_quality_model.tflite  
**Framework:** TensorFlow Lite  
**Input Size:** 224x224 pixels (RGB images)  
**Output:** 4 classifications - high, medium, poor, not_betel_leaf  

### Quality Grades Mapping

| Model Output | Grade | Label | Description |
|---|---|---|---|
| high | A | Excellent | Vibrant green, smooth texture, large size |
| medium | B | Good | Yellowish green, slightly rough, medium size |
| poor | C | Fair | Pale/yellowish, rough texture, small size |
| not_betel_leaf | D | Not Betel Leaf | Not a valid betel leaf |

## Prerequisites

### Required Software
- XAMPP 7.4+ (PHP 7.4+, MySQL 5.7+) or compatible PHP/MySQL server
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (optional, for model conversion/optimization)

### Required Files
- `betel_leaf_quality_model.tflite` - Located in `/model/` directory
- `labels.txt` - Quality class labels

## Installation Steps

### 1. Initial Setup
```bash
# Place files in XAMPP htdocs
# Windows: C:\xampp\htdocs\daponcheck\
# Linux/Mac: /Applications/XAMPP/htdocs/daponcheck/

# Ensure directory structure:
daponcheck/
├── model/
│   ├── betel_leaf_quality_model.tflite
│   └── labels.txt
├── index.html
├── api.php
├── config.php
├── script.js
├── api-client.js
├── ml-model.js
├── styles.css
└── database.sql
```

### 2. Database Setup
```sql
-- Open phpMyAdmin: http://localhost/phpmyadmin
-- Create database and import database.sql
-- Required table: quality_checks (must have these fields)
CREATE TABLE quality_checks (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(50),
    image_data LONGBLOB,
    file_name VARCHAR(255),
    file_size INT,
    dimensions VARCHAR(50),
    grade VARCHAR(10),
    confidence INT,
    characteristics JSON,
    notes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Start Services
```bash
# Start XAMPP
# Windows: Run XAMPP Control Panel, start Apache and MySQL
# Linux: sudo /opt/lampp/lampp start
# Mac: sudo /Applications/XAMPP/xampp start

# Access application
# http://localhost/daponcheck/
```

## Technical Architecture

### Frontend ML Integration

The ML model runs entirely in the browser using TensorFlow.js with TFLite support:

**Libraries:**
- TensorFlow.js 4.10.0+
- TensorFlow.js TFLite 0.0.1-alpha.8+

**Key Components:**

1. **ml-model.js** - ML model manager
   - `BetelLeafQualityModel` class handles model loading and inference
   - Automatic model initialization on page load
   - Image preprocessing (resizing, normalization)
   - Fallback to simulated analysis if model fails

2. **script.js** - Updated analysis functions
   - `analyzeCapturedBtn` - Analyzes camera-captured images
   - `analyzeUploadedBtn` - Analyzes uploaded images
   - Both use `betelLeafModel.analyzeImage()` for real ML predictions

3. **api-client.js** - Database communication
   - Sends analysis results to backend for storage
   - Retrieves historical data

### Backend

**PHP API** (api.php):
- Stores quality check results in MySQL
- Retrieves check history
- Manages statistics and settings
- Supports filtering by type, grade, date range

## Usage

### For End Users

1. **Camera Capture Method:**
   - Navigate to "Capture" section
   - Click "Start Camera"
   - Take photo of betel leaf
   - Click "Capture" button
   - Click "Analyze Quality"
   - View results with grade and characteristics

2. **File Upload Method:**
   - Navigate to "Upload" section
   - Drag and drop image or click to browse
   - Click "Analyze Quality"
   - View results

3. **View Results:**
   - Results show in "Activity" section
   - Displays grade (A, B, C, D), confidence %, and characteristics
   - Historical data persists in database

### For Developers

#### Loading and Using the Model

```javascript
// Model is automatically loaded on page load
// Check model status
if (betelLeafModel && betelLeafModel.isLoaded) {
    console.log('Model ready');
}

// Analyze an image (base64 or URL)
const result = await betelLeafModel.analyzeImage(imageData);
console.log(result);
// Returns:
// {
//   success: true,
//   grade: 'A',
//   gradeLabel: 'Excellent',
//   qualityClass: 'high',
//   confidence: 95,
//   characteristics: {...},
//   allPredictions: [...]
// }
```

#### Model Image Preprocessing

The model expects:
- **Input Format:** Base64 image data or image URL
- **Image Size:** Resized to 224x224 internally
- **Normalization:** Pixel values normalized to [0, 1]
- **Batch Size:** 1 (handled automatically)

## Performance Optimization

### For Better Results

1. **Lighting:** Ensure good natural lighting
2. **Angle:** Photograph leaf from directly above
3. **Background:** Use neutral background
4. **Image Quality:** Use high-resolution images (1080p+)
5. **Cleanliness:** Clean camera lens before capture

### Browser Performance

- Model loads asynchronously (non-blocking)
- Analysis runs on GPU when available
- Memory is properly managed with tensor disposal
- Fallback to simulated results if model loading fails

## Troubleshooting

### Issue: Model Not Loading

**Symptom:** "Model not loaded" message, falls back to simulated analysis

**Solutions:**
1. Check browser console for errors: Right-click → Inspect → Console
2. Verify TensorFlow.js libraries loaded:
   ```javascript
   console.log(tf, tflite);
   ```
3. Ensure CORS is not blocking model access
4. Check if model file exists at `/model/betel_leaf_quality_model.tflite`

### Issue: Incorrect Predictions

**Solutions:**
1. Verify model file is correct and not corrupted
2. Check image quality and lighting
3. Ensure image shows clear view of betel leaf
4. Review model training data requirements

### Issue: Slow Analysis

**Solutions:**
1. Use modern browser (Chrome, Firefox, Edge)
2. Disable other browser tabs/extensions
3. Close other applications
4. Check browser GPU acceleration is enabled

## Deployment

### Production Checklist

- [ ] XAMPP/PHP server running and accessible
- [ ] MySQL database created and tables populated
- [ ] All files in correct directories
- [ ] Model file present and accessible
- [ ] TensorFlow.js CDN accessible (or serve locally)
- [ ] CORS headers properly configured
- [ ] Database credentials in config.php
- [ ] SSL/HTTPS enabled (recommended)
- [ ] Backup database before deployment

### Local Testing

```bash
# Test model loading
# Open browser DevTools (F12)
# Check Console tab for initialization messages
# Should see: "Model ready for inference"

# Test analysis
# Navigate to Capture or Upload section
# Complete an analysis
# Check Activity section for saved result
```

## Model Replacement/Update

To use a different or updated model:

1. **Replace model file:**
   ```bash
   # Place new model at:
   model/betel_leaf_quality_model.tflite
   ```

2. **Update labels if needed:**
   ```bash
   # Edit model/labels.txt with new quality classes
   ```

3. **Update label mapping in ml-model.js:**
   ```javascript
   // Edit this.labels array in BetelLeafQualityModel
   this.labels = ['new_label1', 'new_label2', ...];
   
   // Edit this.gradeMapping for A/B/C/D assignment
   this.gradeMapping = { ... };
   ```

4. **Test the new model thoroughly**

## API Endpoints

### Quality Checks
- `GET /api.php?action=get_quality_checks` - Get all checks
- `POST /api.php?action=add_quality_check` - Add new check
- `GET /api.php?action=get_recent_checks&limit=10` - Get recent checks
- `GET /api.php?action=get_checks_by_grade&grade=A` - Get checks by grade

### Statistics
- `GET /api.php?action=get_statistics` - Get statistics summary
- `POST /api.php?action=clear_history` - Clear all history

## Security Notes

1. **Database:** Default config uses no password (localhost:root)
   - For production: Set strong MySQL password in config.php
   
2. **Image Data:** Large image data (base64) stored in database
   - Consider compression or external storage for production
   
3. **API:** Currently has no authentication
   - Add authentication middleware for production deployment

## Support and Resources

- **TensorFlow.js Docs:** https://js.tensorflow.org/
- **TFLite in Browser:** https://www.tensorflow.org/lite/guide/web
- **XAMPP Setup:** https://www.apachefriends.org/
- **MySQL Docs:** https://dev.mysql.com/doc/

## Version History

**v1.0.0** - Initial release with TFLite model integration
- Real ML model predictions
- Browser-based inference
- Fallback to simulated analysis
- Full database persistence
