# DAPONCHECK - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- XAMPP installed and running (or any PHP 7.4+ server with MySQL)
- All project files in place
- TensorFlow Lite model file: `model/BetelLeafDataset_model.tflite`

### Step 1: Start XAMPP Services
```bash
# Windows: Open XAMPP Control Panel and click "Start" for Apache and MySQL
# Mac/Linux: Run 'sudo /path/to/xampp/xampp start'
```

### Step 2: Setup Database
1. Open browser: `http://localhost/phpmyadmin`
2. Click "SQL" tab at top
3. Copy all content from `database.sql`
4. Paste into the text area
5. Click "Go" button

### Step 3: Launch Application
1. Navigate to: `http://localhost/daponcheck/`
2. Wait for model to load (check browser console if needed)
3. You're ready to analyze betel leaves!

## 📸 How to Use

### Method 1: Camera Capture
1. Click **"Capture"** tab
2. Click **"Start Camera"** button
3. Position betel leaf in view
4. Click **"Capture"** button
5. Click **"Analyze Quality"**
6. View your grade and detailed characteristics

### Method 2: Upload Image
1. Click **"Upload"** tab
2. Drag & drop image or click to browse
3. Click **"Analyze Quality"**
4. Results appear immediately

### View Results
- Click **"Activity"** tab to see all analyses
- Filter by "All", "Captured", or "Uploaded"
- See statistics dashboard below

## 🎯 Quality Grades

| Grade | Label | What It Means |
|-------|-------|---------------|
| **A** | Excellent | Premium quality betel leaf |
| **B** | Good | High quality with minor issues |
| **C** | Fair | Lower quality or significant defects |
| **D** | Not Betel Leaf | Image doesn't show betel leaf |

## ⚙️ Settings (Optional)

Click **"Settings"** tab to customize:
- Camera resolution (High/Medium/Low)
- Analysis sensitivity
- Auto-analysis after capture
- Notifications and alerts
- Data storage preferences

## 🔍 Troubleshooting

### Camera Won't Start
- ✅ Check browser permissions (allow camera access)
- ✅ Try different browser
- ✅ Ensure camera works in other apps

### Model Not Analyzing
- ✅ Check browser console (F12 → Console tab)
- ✅ Look for errors about TensorFlow.js
- ✅ Ensure model file exists in `/model/` folder
- ✅ Try refreshing page (F5)

### Database Connection Error
- ✅ Verify XAMPP MySQL is running
- ✅ Check database was created (phpmyadmin)
- ✅ Verify config.php has correct credentials

### Slow Performance
- ✅ Use latest Chrome, Firefox, or Edge
- ✅ Close other browser tabs
- ✅ Ensure system has adequate RAM
- ✅ Check internet connection for CDN libraries

## 📋 Features

✅ Real-time ML model predictions (runs in browser)  
✅ Camera and upload image support  
✅ Detailed quality analysis with confidence scores  
✅ Full activity history with database persistence  
✅ Statistics dashboard  
✅ Customizable settings  
✅ Responsive mobile-friendly design  

## 🛠️ Technical Details

- **Frontend:** HTML5, CSS3, JavaScript ES6+
- **ML Framework:** TensorFlow.js + TFLite
- **Backend:** PHP 7.4+
- **Database:** MySQL 5.7+
- **Browser Support:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 📚 Learn More

- [Full ML Setup Guide](ML_MODEL_SETUP.md)
- [API Documentation](README.md)
- [TensorFlow.js Docs](https://js.tensorflow.org/)

## 🎓 About DAPONCHECK

DAPONCHECK is a capstone project for automated betel leaf quality grading using machine learning. It demonstrates:
- Real-time image analysis with mobile-friendly UI
- ML model deployment in web browsers
- Cloud-free analysis (model runs locally)
- Database-backed result persistence

---

**Ready to analyze betel leaves? Start the application and capture your first image!** 🍃
