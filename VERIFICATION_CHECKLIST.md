# DAPONCHECK - Model Functionality Verification Checklist

## ✅ Pre-Launch Checklist

### Files & Structure
- [ ] Model file exists: `model/BetelLeafDataset_model.tflite`
- [ ] Labels file exists: `model/labels.txt`
- [ ] All project files in place (index.html, script.js, api.php, etc.)
- [ ] `ml-model.js` file created successfully
- [ ] Documentation files present (ML_MODEL_SETUP.md, QUICK_START.md)

### Server Setup
- [ ] XAMPP installed and services running
- [ ] Apache server started
- [ ] MySQL database server started
- [ ] Database `daponcheck_db` created
- [ ] Tables created from `database.sql`
- [ ] Project folder in `htdocs` directory

### Database Verification
```sql
-- Open phpMyAdmin and verify:
-- 1. Database exists: daponcheck_db
-- 2. Tables exist:
--    - quality_checks
--    - settings
--    - statistics
-- 3. Run query to verify:
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'daponcheck_db';
```

## 🧪 Functionality Tests

### Test 1: Model Loading
1. Open browser developer tools: **F12**
2. Go to **Console** tab
3. Navigate to: `http://localhost/daponcheck/`
4. Look for message: **"Model ready for inference"**
   - ✅ SUCCESS: Message appears with no errors
   - ❌ FAILED: Error about TensorFlow.js or model loading

### Test 2: Check Model Status
In browser console, run:
```javascript
console.log(betelLeafModel.getStatus());
```
Expected output:
```
{
  isLoaded: true,
  isLoading: false,
  model: "Available",
  labels: ["high", "medium", "not_betel_leaf", "poor"]
}
```

### Test 3: Camera Functionality
1. Click **"Capture"** tab
2. Click **"Start Camera"** button
3. Allow browser camera permission
   - ✅ SUCCESS: Camera video feed appears
   - ❌ FAILED: No video feed or permission denied

### Test 4: Analyze Camera Image
1. With camera running, click **"Capture"** button
2. Click **"Analyze Quality"** button
3. Wait for analysis (should take 1-5 seconds)
   - ✅ SUCCESS: Grade (A/B/C/D) appears with confidence %
   - ❌ FAILED: Error message or "falls back to simulated"

### Test 5: Upload & Analyze
1. Click **"Upload"** tab
2. Drag & drop or upload a betel leaf image
3. Click **"Analyze Quality"** button
4. Check result display
   - ✅ SUCCESS: Quality grade and characteristics shown
   - ❌ FAILED: Error or no results

### Test 6: Database Storage
1. Complete analysis (camera or upload)
2. Click **"Activity"** tab
3. Verify your result appears in the list
   - ✅ SUCCESS: New result visible with timestamp
   - ❌ FAILED: Result not appearing in activity

### Test 7: Statistics
1. Complete at least 3 analyses (mix of grades)
2. Check statistics cards at bottom of Activity
3. Verify counts match completed analyses
   - ✅ SUCCESS: Total checks and grade counts correct
   - ❌ FAILED: Statistics not updating

### Test 8: Settings
1. Click **"Settings"** tab
2. Modify settings (resolution, sensitivity, etc.)
3. Settings should auto-save
4. Refresh page (F5)
5. Settings should persist
   - ✅ SUCCESS: Settings retained after refresh
   - ❌ FAILED: Settings reset after refresh

## 🔍 Detailed Verification Tests

### Test Model Predictions Directly
```javascript
// In browser console:
const testImageUrl = 'https://via.placeholder.com/224';
betelLeafModel.analyzeImage(testImageUrl)
  .then(result => console.log('Analysis:', result))
  .catch(error => console.error('Error:', error));
```

Expected output includes:
- `success: true`
- `grade: 'A'/'B'/'C'/'D'`
- `confidence: 0-100`
- `characteristics: {...}`

### Test Database Connection
```sql
-- In phpMyAdmin SQL tab:
SELECT COUNT(*) as total_checks FROM quality_checks;
SELECT * FROM quality_checks ORDER BY timestamp DESC LIMIT 1;
```

Should return your recent analyses.

### Test API Endpoints
In browser, navigate to:
```
http://localhost/daponcheck/api.php?action=get_recent_checks&limit=5
```

Should return JSON with quality check data.

## 🚨 Troubleshooting Guide

### Issue: "Model not loaded, using simulated analysis"

**Root Causes:**
1. TensorFlow.js CDN not loading
2. Model file not found or corrupted
3. Browser doesn't support WebGL

**Solutions:**
```javascript
// Check in console:
console.log('TF:', typeof tf); // Should be 'object'
console.log('TFLite:', typeof tflite); // Should be 'object'
console.log('Model:', betelLeafModel.model); // Should not be null
```

- Clear browser cache: Ctrl+Shift+Delete
- Try different browser (Chrome preferred)
- Check internet connection (CDN libraries needed)
- Verify model file permissions

### Issue: Camera Permission Denied

**Solutions:**
1. Check browser settings → Privacy & security → Camera
2. Allow access to camera for localhost
3. Use HTTPS (if available)
4. Try different browser

### Issue: Slow Analysis (>10 seconds)

**Solutions:**
1. Check system resources (Task Manager)
2. Close unnecessary browser tabs
3. Disable browser extensions
4. Update browser to latest version
5. Check GPU acceleration:
   ```javascript
   console.log(tf.ENV.getBool('WEBGL_UNPACK_FLIP_Y_WEBGL')); 
   ```

### Issue: Database Not Saving Results

**Solutions:**
1. Verify database connection:
   ```php
   // Test in separate file
   require_once 'config.php';
   $conn = getConnection();
   echo $conn ? 'Connected' : 'Failed';
   ```

2. Check MySQL is running
3. Verify table exists and has correct columns
4. Check PHP error logs: `php_error.log`

## 📊 Performance Benchmarks

Expected performance metrics:
- Model loading: 3-10 seconds (first time)
- Image preprocessing: <500ms
- Model inference: 1-3 seconds
- Database save: <200ms
- Total analysis time: 5-15 seconds

If significantly slower, check:
- Browser performance (DevTools → Performance tab)
- System resources
- Network latency (if CDN issue)

## ✨ Advanced Checks

### Memory Usage
```javascript
// Check memory usage:
if (performance.memory) {
  console.log('Memory used:', 
    (performance.memory.usedJSHeapSize / 1048576).toFixed(2), 'MB'
  );
}
```

### Model Input Validation
```javascript
// Check what size image model expects:
console.log('Model input shape:', betelLeafModel.model.inputs[0].shape);
console.log('Model outputs:', betelLeafModel.model.outputs.length);
```

### Tensor Cleanup
```javascript
// Verify no tensor leaks:
console.log('Tensor count:', tf.memory().numTensors);
// Should be low (< 10) after analysis completes
```

## 🎯 Success Criteria

Your DAPONCHECK implementation is **fully functional** when:

- ✅ Model loads without errors
- ✅ Camera capture produces real ML predictions
- ✅ Image upload produces real ML predictions  
- ✅ Results save to database
- ✅ Activity history displays correctly
- ✅ Statistics update accurately
- ✅ Settings persist across sessions
- ✅ Analysis completes in < 15 seconds
- ✅ Multiple analyses produce varying grades
- ✅ Mobile display is responsive

## 📱 Mobile Testing

Test on mobile device:
1. Get local IP: `ipconfig getifaddr en0` (Mac) or check Settings
2. On mobile browser: `http://[YOUR_IP]:80/daponcheck/`
3. Test camera capture on mobile
4. Verify responsive layout

## 🚀 Deployment Verification

Before going live:
- [ ] All 8+ functionality tests pass
- [ ] No console errors (F12 → Console)
- [ ] Database backups created
- [ ] Performance acceptable on target devices
- [ ] Security review (if internet-facing)
- [ ] Documentation reviewed

---

**After passing all checks, your DAPONCHECK betel leaf grading system is ready for production use!** 🎉
