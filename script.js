// Database Keys (fallback to localStorage if SQL fails)
const DB_KEYS = {
    QUALITY_CHECKS: 'daponcheck_quality_checks',
    SETTINGS: 'daponcheck_settings',
    STATISTICS: 'daponcheck_statistics'
};

// API Configuration
const API_CONFIG = {
    baseUrl: 'http://localhost/daponcheck/api.php',
    useLocalStorage: false // Set to true to fallback to localStorage
};

// Test database connection on load
async function testDatabaseConnection() {
    if (API_CONFIG.useLocalStorage) {
        console.log('Using localStorage as database');
        initializeLocalStorage();
        return;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}?action=get_statistics`);
        const result = await response.json();
        
        if (result.success) {
            console.log('✓ SQL database connected successfully');
            console.log('Database info:', result.data);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.warn('✗ SQL database connection failed:', error.message);
        console.warn('Falling back to localStorage...');
        API_CONFIG.useLocalStorage = true;
        initializeLocalStorage();
    }
}

// Initialize database
function initializeDatabase() {
    // Try to connect to SQL database first
    if (!API_CONFIG.useLocalStorage) {
        console.log('Attempting to connect to SQL database...');
    } else {
        console.log('Using localStorage as database');
        initializeLocalStorage();
    }
}

// Initialize localStorage as fallback
function initializeLocalStorage() {
    // Initialize settings if not exists
    if (!localStorage.getItem(DB_KEYS.SETTINGS)) {
        const defaultSettings = {
            cameraResolution: 'medium',
            flashMode: 'false',
            autoFocus: 'true',
            analysisSensitivity: 'medium',
            autoAnalysis: 'true',
            showConfidence: 'true',
            pushNotifications: 'true',
            soundAlerts: 'false',
            saveHistory: 'true'
        };
        localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }
    
    // Initialize statistics if not exists
    if (!localStorage.getItem(DB_KEYS.STATISTICS)) {
        const defaultStats = {
            total_checks: 0,
            grade_a: 0,
            grade_b: 0,
            grade_c: 0,
            grade_d: 0,
            captured_count: 0,
            uploaded_count: 0
        };
        localStorage.setItem(DB_KEYS.STATISTICS, JSON.stringify(defaultStats));
    }
}

// Quality Check Functions
function addQualityCheck(checkData) {
    const checks = JSON.parse(localStorage.getItem(DB_KEYS.QUALITY_CHECKS) || '[]');
    
    // Optimize image data by compressing or removing it to save space
    const optimizedCheckData = { ...checkData };
    if (optimizedCheckData.imageData && optimizedCheckData.imageData.length > 50000) {
        // If image data is too large, remove it and keep only metadata
        optimizedCheckData.imageData = null;
        optimizedCheckData.imageRemoved = true;
    }
    
    const newCheck = {
        id: generateId(),
        ...optimizedCheckData,
        timestamp: new Date().toISOString()
    };
    
    // Keep only last 20 entries to prevent quota issues
    if (checks.length >= 20) {
        checks.pop(); // Remove oldest entry
    }
    
    checks.unshift(newCheck);
    
    try {
        localStorage.setItem(DB_KEYS.QUALITY_CHECKS, JSON.stringify(checks));
        updateStatistics(newCheck);
        return newCheck;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.warn('Storage quota exceeded, clearing oldest entries');
            // Clear half of the entries and retry
            const reducedChecks = checks.slice(0, Math.floor(checks.length / 2));
            localStorage.setItem(DB_KEYS.QUALITY_CHECKS, JSON.stringify(reducedChecks));
            updateStatistics(newCheck);
            return newCheck;
        }
        throw error;
    }
}

function getQualityChecks() {
    return JSON.parse(localStorage.getItem(DB_KEYS.QUALITY_CHECKS) || '[]');
}

function getRecentQualityChecks(limit = 50) {
    const checks = getQualityChecks();
    return checks.slice(0, limit);
}

function deleteQualityCheck(id) {
    const checks = getQualityChecks();
    const filtered = checks.filter(check => check.id !== id);
    localStorage.setItem(DB_KEYS.QUALITY_CHECKS, JSON.stringify(filtered));
}

function clearHistory() {
    localStorage.setItem(DB_KEYS.QUALITY_CHECKS, JSON.stringify([]));
    localStorage.setItem(DB_KEYS.STATISTICS, JSON.stringify({
        total_checks: 0,
        grade_a: 0,
        grade_b: 0,
        grade_c: 0,
        grade_d: 0,
        captured_count: 0,
        uploaded_count: 0
    }));
}

// Settings Functions
function getSettings() {
    return JSON.parse(localStorage.getItem(DB_KEYS.SETTINGS) || '{}');
}

function updateSettings(settings) {
    const currentSettings = getSettings();
    const updated = { ...currentSettings, ...settings };
    localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(updated));
}

// Statistics Functions
function getStatistics() {
    return JSON.parse(localStorage.getItem(DB_KEYS.STATISTICS) || '{}');
}

function updateStatistics(check) {
    const stats = getStatistics();
    stats.total_checks = (stats.total_checks || 0) + 1;
    stats[`grade_${check.grade.toLowerCase()}`] = (stats[`grade_${check.grade.toLowerCase()}`] || 0) + 1;
    stats[`${check.type}_count`] = (stats[`${check.type}_count`] || 0) + 1;
    localStorage.setItem(DB_KEYS.STATISTICS, JSON.stringify(stats));
}

// Helper Functions
function generateId() {
    return 'qc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// TensorFlow Lite Model Loading
let tfliteModel = null;
let modelLoaded = false;
let modelInfo = null;
let classLabels = [];

// Load labels from labels.txt
async function loadLabels() {
    try {
        const response = await fetch('model/labels.txt');
        const text = await response.text();
        classLabels = text.split('\n').map(label => label.trim()).filter(label => label.length > 0);
        console.log('Labels loaded:', classLabels);
        return true;
    } catch (error) {
        console.warn('Labels file not found, using default labels:', error.message);
        classLabels = ['High', 'Medium', 'Not_Betel_Leaf', 'Poor'];
        return false;
    }
}

// Load TFLite model
async function loadTFLiteModel() {
    try {
        // Load labels first
        await loadLabels();
        
        // Try to load the CNN model from file
        tfliteModel = await tf.loadTFLiteModel('model/BetelLeafDataset_model.tflite');
        modelLoaded = true;
        
        // Get model input/output info
        const inputs = tfliteModel.inputLayers;
        const outputs = tfliteModel.outputLayers;
        
        modelInfo = {
            inputShape: inputs[0].shape,
            outputShape: outputs[0].shape,
            inputName: inputs[0].name,
            outputName: outputs[0].name
        };
        
        console.log('CNN TFLite model loaded successfully');
        console.log('Model info:', modelInfo);
        console.log('Class labels:', classLabels);
        return true;
    } catch (error) {
        console.warn('CNN TFLite model not found, falling back to canvas analysis:', error.message);
        modelLoaded = false;
        return false;
    }
}

// Preprocess image for CNN TFLite model
function preprocessImage(imageData, targetSize = [224, 224]) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = targetSize[0];
            canvas.height = targetSize[1];
            
            // Resize and maintain aspect ratio (center crop)
            const scale = Math.max(targetSize[0] / img.width, targetSize[1] / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (targetSize[0] - scaledWidth) / 2;
            const y = (targetSize[1] - scaledHeight) / 2;
            
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, targetSize[0], targetSize[1]);
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            
            const imageDataObj = ctx.getImageData(0, 0, targetSize[0], targetSize[1]);
            const pixels = imageDataObj.data;
            
            // Convert to tensor and normalize [0,1] for CNN
            const tensor = tf.tidy(() => {
                const rgbArray = new Float32Array(targetSize[0] * targetSize[1] * 3);
                for (let i = 0; i < pixels.length; i += 4) {
                    const idx = (i / 4) * 3;
                    rgbArray[idx] = pixels[i] / 255.0;     // R
                    rgbArray[idx + 1] = pixels[i + 1] / 255.0; // G
                    rgbArray[idx + 2] = pixels[i + 2] / 255.0; // B
                }
                return tf.tensor3d(rgbArray, [targetSize[0], targetSize[1], 3]);
            });
            
            resolve(tensor);
        };
        img.src = imageData;
    });
}

// Run CNN TFLite model inference
async function runTFLiteInference(imageData) {
    try {
        if (!modelLoaded || !tfliteModel) {
            throw new Error('CNN Model not loaded');
        }
        
        // Use model info if available, otherwise use defaults
        const inputSize = modelInfo ? modelInfo.inputShape.slice(1, 3) : [224, 224];
        const inputTensor = await preprocessImage(imageData, inputSize);
        const input = inputTensor.expandDims(0); // Add batch dimension [1, H, W, 3]
        
        // Run inference
        const output = await tfliteModel.predict(input);
        
        // Clean up tensors
        inputTensor.dispose();
        input.dispose();
        
        return output;
    } catch (error) {
        console.error('CNN TFLite inference error:', error);
        throw error;
    }
}

// Map CNN model output to grade using loaded labels
function mapModelOutputToGrade(output) {
    // CNN output is probabilities for classes
    const probabilities = Array.from(output.dataSync());
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    const maxProbability = probabilities[maxIndex];
    
    // Use loaded labels or fallback to defaults
    const label = classLabels[maxIndex] || `Class ${maxIndex}`;
    
    // Map label to grade letter based on actual label content
    let grade;
    switch(label) {
        case 'High':
            grade = 'A';
            break;
        case 'Medium':
            grade = 'B';
            break;
        case 'Poor':
            grade = 'C';
            break;
        case 'Not_Betel_Leaf':
            grade = 'D';
            break;
        default:
            grade = 'D';
    }
    
    // Calculate confidence as percentage (100% based on model)
    const confidence = (maxProbability * 100).toFixed(2);
    
    return {
        grade: grade,
        gradeLabel: label.replace('_', ' '), // Replace underscores with spaces for display
        confidence: parseFloat(confidence),
        probabilities: probabilities,
        classIndex: maxIndex
    };
}

// Betel Leaf Quality Grading Model (fallback)
const QUALITY_MODEL = {
    // Grade definitions with specific criteria
    grades: {
        A: {
            name: 'Excellent Quality',
            minScore: 85,
            color: { greenMin: 0.45, yellowMax: 0.15, brownMax: 0.05 },
            texture: { edgeMax: 0.12 },
            size: { minArea: 600000 },
            freshness: 'High',
            confidence: { min: 90, max: 98 }
        },
        B: {
            name: 'Good Quality',
            minScore: 70,
            color: { greenMin: 0.30, yellowMax: 0.25, brownMax: 0.10 },
            texture: { edgeMax: 0.20 },
            size: { minArea: 400000 },
            freshness: 'Moderate',
            confidence: { min: 80, max: 92 }
        },
        C: {
            name: 'Fair Quality',
            minScore: 55,
            color: { greenMin: 0.20, yellowMax: 0.35, brownMax: 0.20 },
            texture: { edgeMax: 0.35 },
            size: { minArea: 250000 },
            freshness: 'Low',
            confidence: { min: 70, max: 85 }
        },
        D: {
            name: 'Poor Quality',
            minScore: 0,
            color: { greenMin: 0, yellowMax: 1.0, brownMax: 0.40 },
            texture: { edgeMax: 1.0 },
            size: { minArea: 0 },
            freshness: 'Very Low',
            confidence: { min: 60, max: 80 }
        }
    },
    
    // Weight factors for scoring
    weights: {
        color: 0.35,      // 35% weight for color analysis
        texture: 0.30,    // 30% weight for texture analysis
        size: 0.15,       // 15% weight for size
        freshness: 0.20   // 20% weight for freshness
    },
    
    // Scoring thresholds
    thresholds: {
        excellent: 85,
        good: 70,
        fair: 55,
        poor: 0
    }
};

// Image Analysis Functions
async function analyzeImage(imageData) {
    try {
        // Try TFLite model first if available
        if (modelLoaded && tfliteModel) {
            console.log('Using TFLite model for analysis');
            const modelOutput = await runTFLiteInference(imageData);
            const modelResult = mapModelOutputToGrade(modelOutput);
            
            // Get additional characteristics using canvas analysis
            const characteristics = await getImageCharacteristics(imageData);
            
            return {
                grade: modelResult.grade,
                gradeLabel: modelResult.gradeLabel,
                confidence: parseFloat(modelResult.confidence),
                characteristics: characteristics,
                qualityClass: modelResult.grade === 'A' ? 'excellent' : modelResult.grade === 'B' ? 'good' : modelResult.grade === 'C' ? 'fair' : 'poor',
                usingModel: true,
                probabilities: modelResult.probabilities
            };
        }
    } catch (error) {
        console.warn('TFLite model inference failed, falling back to canvas分析:', error.message);
    }
    
    // Fallback to canvas-based analysis
    console.log('Using canvas-based analysis');
    return analyzeImageCanvas(imageData);
}

// Canvas-based analysis (fallback)
function analyzeImageCanvas(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageDataObj.data;
            
            // Analyze color distribution
            const colorAnalysis = analyzeColors(pixels);
            
            // Analyze texture/edges
            const textureAnalysis = analyzeTexture(pixels, canvas.width, canvas.height);
            
            // Calculate size
            const sizeAnalysis = analyzeSize(canvas.width, canvas.height);
            
            // Calculate weighted quality score based on model
            const qualityScore = calculateWeightedScore(colorAnalysis, textureAnalysis, sizeAnalysis);
            
            // Determine grade based on model thresholds
            const grade = determineGradeByModel(qualityScore, colorAnalysis, textureAnalysis, sizeAnalysis);
            
            resolve({
                grade: grade,
                gradeLabel: QUALITY_MODEL.grades[grade].name,
                confidence: calculateConfidence(qualityScore, grade),
                characteristics: {
                    color: colorAnalysis.dominantColor,
                    texture: textureAnalysis.textureQuality,
                    size: sizeAnalysis.sizeCategory,
                    freshness: colorAnalysis.freshnessLevel
                },
                qualityClass: grade === 'A' ? 'excellent' : grade === 'B' ? 'good' : grade === 'C' ? 'fair' : 'poor',
                score: qualityScore,
                scores: {
                    color: colorAnalysis.score,
                    texture: textureAnalysis.score,
                    size: sizeAnalysis.score,
                    freshness: colorAnalysis.freshnessScore
                },
                usingModel: false
            });
        };
        img.src = imageData;
    });
}

// Get image characteristics for display
async function getImageCharacteristics(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageDataObj.data;
            
            const colorAnalysis = analyzeColors(pixels);
            const textureAnalysis = analyzeTexture(pixels, canvas.width, canvas.height);
            const sizeAnalysis = analyzeSize(canvas.width, canvas.height);
            
            resolve({
                color: colorAnalysis.dominantColor,
                texture: textureAnalysis.textureQuality,
                size: sizeAnalysis.sizeCategory,
                freshness: colorAnalysis.freshnessLevel
            });
        };
        img.src = imageData;
    });
}

// Show improved analysis result
function showAnalysisResult(result) {
    const gradeColors = {
        'A': '#00c853',
        'B': '#ffab00',
        'C': '#ff9100',
        'D': '#ff5252'
    };
    
    const gradeIcons = {
        'A': 'fa-check-circle',
        'B': 'fa-thumbs-up',
        'C': 'fa-exclamation-circle',
        'D': 'fa-times-circle'
    };
    
    const modelInfo = result.usingModel ? 
        '<p style="color: #666; font-size: 0.9em; margin-top: 10px;"><i class="fas fa-robot"></i> Analysis by TFLite Model</p>' : 
        '<p style="color: #666; font-size: 0.9em; margin-top: 10px;"><i class="fas fa-image"></i> Analysis by Canvas Processing</p>';
    
    const confidenceDisplay = document.getElementById('showConfidence')?.checked ? 
        `<div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 8px;">
            <strong>Model Confidence:</strong> ${result.confidence.toFixed(2)}%
            <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; margin-top: 5px;">
                <div style="width: ${result.confidence}%; height: 100%; background: ${gradeColors[result.grade]}; border-radius: 4px;"></div>
            </div>
        </div>` : '';
    
    const characteristicsHTML = result.grade !== 'D' ? `
        <div style="margin-top: 15px;">
            <h4 style="margin-bottom: 10px; color: #333;">Leaf Characteristics:</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="padding: 8px; background: #f9f9f9; border-radius: 6px;">
                    <strong>Color:</strong> ${result.characteristics.color}
                </div>
                <div style="padding: 8px; background: #f9f9f9; border-radius: 6px;">
                    <strong>Texture:</strong> ${result.characteristics.texture}
                </div>
                <div style="padding: 8px; background: #f9f9f9; border-radius: 6px;">
                    <strong>Size:</strong> ${result.characteristics.size}
                </div>
                <div style="padding: 8px; background: #f9f9f9; border-radius: 6px;">
                    <strong>Freshness:</strong> ${result.characteristics.freshness}
                </div>
            </div>
        </div>
    ` : '<p style="margin-top: 15px; color: #ff5252;"><strong>This image does not appear to be a betel leaf.</strong></p>';
    
    const resultHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 4em; color: ${gradeColors[result.grade]}; margin-bottom: 10px;">
                <i class="fas ${gradeIcons[result.grade]}"></i>
            </div>
            <h2 style="color: ${gradeColors[result.grade]}; margin: 0 0 10px 0;">Grade ${result.grade}</h2>
            <h3 style="color: #333; margin: 0 0 15px 0;">${result.gradeLabel}</h3>
            ${confidenceDisplay}
            ${characteristicsHTML}
            ${modelInfo}
        </div>
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white; padding: 30px; border-radius: 20px; max-width: 400px;
        width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    `;
    modalContent.innerHTML = resultHTML;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
        margin-top: 20px; padding: 10px 30px; background: ${gradeColors[result.grade]};
        color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;
    `;
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    };
}

function analyzeColors(pixels) {
    let greenPixels = 0;
    let yellowPixels = 0;
    let brownPixels = 0;
    let totalPixels = pixels.length / 4;
    
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Check for healthy green
        if (g > r + 30 && g > b + 30 && g > 100) {
            greenPixels++;
        }
        // Check for yellowing
        else if (r > 150 && g > 100 && b < 100 && r > g) {
            yellowPixels++;
        }
        // Check for browning
        else if (r > 80 && g > 40 && b < 60 && r > g * 1.5) {
            brownPixels++;
        }
    }
    
    const greenRatio = greenPixels / totalPixels;
    const yellowRatio = yellowPixels / totalPixels;
    const brownRatio = brownPixels / totalPixels;
    
    let dominantColor, freshnessLevel, freshnessScore;
    
    // Calculate color score based on model
    let colorScore = 0;
    if (greenRatio >= QUALITY_MODEL.grades.A.color.greenMin) {
        colorScore = 100;
        dominantColor = 'Healthy Green';
        freshnessLevel = 'High';
        freshnessScore = 100;
    } else if (greenRatio >= QUALITY_MODEL.grades.B.color.greenMin) {
        colorScore = 75;
        dominantColor = 'Moderately Green';
        freshnessLevel = 'Moderate';
        freshnessScore = 75;
    } else if (greenRatio >= QUALITY_MODEL.grades.C.color.greenMin) {
        colorScore = 50;
        dominantColor = 'Slightly Pale';
        freshnessLevel = 'Low';
        freshnessScore = 50;
    } else {
        colorScore = 25;
        dominantColor = 'Poor Color';
        freshnessLevel = 'Very Low';
        freshnessScore = 25;
    }
    
    // Penalize for yellowing and browning
    colorScore -= (yellowRatio * 50);
    colorScore -= (brownRatio * 70);
    colorScore = Math.max(0, Math.min(100, colorScore));
    
    return { greenRatio, yellowRatio, brownRatio, dominantColor, freshnessLevel, score: colorScore, freshnessScore };
}

function analyzeTexture(pixels, width, height) {
    let edgeCount = 0;
    let totalEdges = 0;
    
    // Simple edge detection using Sobel-like approach
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const rightIdx = (y * width + (x + 1)) * 4;
            const downIdx = ((y + 1) * width + x) * 4;
            
            const currentGray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
            const rightGray = (pixels[rightIdx] + pixels[rightIdx + 1] + pixels[rightIdx + 2]) / 3;
            const downGray = (pixels[downIdx] + pixels[downIdx + 1] + pixels[downIdx + 2]) / 3;
            
            const diff = Math.abs(currentGray - rightGray) + Math.abs(currentGray - downGray);
            
            if (diff > 30) {
                edgeCount++;
            }
            totalEdges++;
        }
    }
    
    const edgeRatio = edgeCount / totalEdges;
    let textureQuality, textureScore;
    
    // Calculate texture score based on model
    if (edgeRatio <= QUALITY_MODEL.grades.A.texture.edgeMax) {
        textureScore = 100;
        textureQuality = 'Smooth';
    } else if (edgeRatio <= QUALITY_MODEL.grades.B.texture.edgeMax) {
        textureScore = 75;
        textureQuality = 'Minor Imperfections';
    } else if (edgeRatio <= QUALITY_MODEL.grades.C.texture.edgeMax) {
        textureScore = 50;
        textureQuality = 'Rough Spots';
    } else {
        textureScore = 25;
        textureQuality = 'Damaged';
    }
    
    return { edgeRatio, textureQuality, score: textureScore };
}

function analyzeSize(width, height) {
    const area = width * height;
    let sizeCategory, sizeScore;
    
    // Calculate size score based on model
    if (area >= QUALITY_MODEL.grades.A.size.minArea) {
        sizeScore = 100;
        sizeCategory = 'Large';
    } else if (area >= QUALITY_MODEL.grades.B.size.minArea) {
        sizeScore = 75;
        sizeCategory = 'Medium';
    } else if (area >= QUALITY_MODEL.grades.C.size.minArea) {
        sizeScore = 50;
        sizeCategory = 'Small';
    } else {
        sizeScore = 25;
        sizeCategory = 'Very Small';
    }
    
    return { area, sizeCategory, score: sizeScore };
}

function calculateWeightedScore(colorAnalysis, textureAnalysis, sizeAnalysis) {
    const weights = QUALITY_MODEL.weights;
    
    // Calculate weighted score
    const colorScore = colorAnalysis.score * weights.color;
    const textureScore = textureAnalysis.score * weights.texture;
    const sizeScore = sizeAnalysis.score * weights.size;
    const freshnessScore = colorAnalysis.freshnessScore * weights.freshness;
    
    const totalScore = colorScore + textureScore + sizeScore + freshnessScore;
    
    return Math.round(totalScore);
}

function determineGradeByModel(score, colorAnalysis, textureAnalysis, sizeAnalysis) {
    // Check against model criteria for each grade
    for (const [grade, criteria] of Object.entries(QUALITY_MODEL.grades)) {
        if (score >= criteria.minScore &&
            colorAnalysis.greenRatio >= criteria.color.greenMin &&
            colorAnalysis.yellowRatio <= criteria.color.yellowMax &&
            colorAnalysis.brownRatio <= criteria.color.brownMax &&
            textureAnalysis.edgeRatio <= criteria.texture.edgeMax &&
            sizeAnalysis.area >= criteria.size.minArea) {
            return grade;
        }
    }
    
    // Fallback to score-based grading
    if (score >= QUALITY_MODEL.thresholds.excellent) return 'A';
    if (score >= QUALITY_MODEL.thresholds.good) return 'B';
    if (score >= QUALITY_MODEL.thresholds.fair) return 'C';
    return 'D';
}

function calculateConfidence(score, grade) {
    const gradeCriteria = QUALITY_MODEL.grades[grade];
    const confidenceRange = gradeCriteria.confidence;
    
    // Calculate confidence based on how close score is to minimum for that grade
    const scoreDifference = score - gradeCriteria.minScore;
    const maxDifference = 100 - gradeCriteria.minScore;
    const normalizedScore = scoreDifference / maxDifference;
    
    const confidence = confidenceRange.min + (normalizedScore * (confidenceRange.max - confidenceRange.min));
    
    return Math.round(confidence);
}

// API-like interface for compatibility
const api = {
    addQualityCheck: async (data) => {
        if (API_CONFIG.useLocalStorage) {
            return addQualityCheck(data);
        }
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}?action=add_quality_check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) return result.data;
            throw new Error(result.message);
        } catch (error) {
            console.warn('API error, falling back to localStorage:', error.message);
            API_CONFIG.useLocalStorage = true;
            return addQualityCheck(data);
        }
    },
    getQualityChecks: async () => {
        if (API_CONFIG.useLocalStorage) {
            return getQualityChecks();
        }
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}?action=get_quality_checks`);
            const result = await response.json();
            if (result.success) return result.data;
            throw new Error(result.message);
        } catch (error) {
            console.warn('API error, falling back to localStorage:', error.message);
            API_CONFIG.useLocalStorage = true;
            return getQualityChecks();
        }
    },
    getRecentQualityChecks: async (limit) => {
        if (API_CONFIG.useLocalStorage) {
            return getRecentQualityChecks(limit);
        }
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}?action=get_recent_checks&limit=${limit}`);
            const result = await response.json();
            if (result.success) return result.data;
            throw new Error(result.message);
        } catch (error) {
            console.warn('API error, falling back to localStorage:', error.message);
            API_CONFIG.useLocalStorage = true;
            return getRecentQualityChecks(limit);
        }
    },
    deleteQualityCheck: async (id) => {
        if (API_CONFIG.useLocalStorage) {
            return deleteQualityCheck(id);
        }
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}?action=delete_quality_check&id=${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) return result.data;
            throw new Error(result.message);
        } catch (error) {
            console.warn('API error, falling back to localStorage:', error.message);
            API_CONFIG.useLocalStorage = true;
            return deleteQualityCheck(id);
        }
    },
    clearHistory: async () => {
        if (API_CONFIG.useLocalStorage) {
            return clearHistory();
        }
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}?action=clear_history`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) return result.data;
            throw new Error(result.message);
        } catch (error) {
            console.warn('API error, falling back to localStorage:', error.message);
            API_CONFIG.useLocalStorage = true;
            return clearHistory();
        }
    },
    getSettings: async () => {
        if (API_CONFIG.useLocalStorage) {
            return getSettings();
        }
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}?action=get_settings`);
            const result = await response.json();
            if (result.success) return result.data;
            throw new Error(result.message);
        } catch (error) {
            console.warn('API error, falling back to localStorage:', error.message);
            API_CONFIG.useLocalStorage = true;
            return getSettings();
        }
    },
    updateSettings: async (settings) => {
        if (API_CONFIG.useLocalStorage) {
            return updateSettings(settings);
        }
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}?action=update_settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const result = await response.json();
            if (result.success) return result.data;
            throw new Error(result.message);
        } catch (error) {
            console.warn('API error, falling back to localStorage:', error.message);
            API_CONFIG.useLocalStorage = true;
            return updateSettings(settings);
        }
    },
    getStatistics: async () => {
        if (API_CONFIG.useLocalStorage) {
            return getStatistics();
        }
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}?action=get_statistics`);
            const result = await response.json();
            if (result.success) return result.data;
            throw new Error(result.message);
        } catch (error) {
            console.warn('API error, falling back to localStorage:', error.message);
            API_CONFIG.useLocalStorage = true;
            return getStatistics();
        }
    }
};

// DOM Elements
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

// Camera Elements
const cameraFeed = document.getElementById('cameraFeed');
const captureCanvas = document.getElementById('captureCanvas');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const startCameraBtn = document.getElementById('startCamera');
const captureBtn = document.getElementById('captureBtn');
const stopCameraBtn = document.getElementById('stopCamera');
const capturedImageContainer = document.getElementById('capturedImageContainer');
const capturedImage = document.getElementById('capturedImage');
const analyzeCapturedBtn = document.getElementById('analyzeCaptured');
const retakePhotoBtn = document.getElementById('retakePhoto');

// Upload Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadedImageContainer = document.getElementById('uploadedImageContainer');
const uploadedImage = document.getElementById('uploadedImage');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const imageDimensions = document.getElementById('imageDimensions');
const analyzeUploadedBtn = document.getElementById('analyzeUploaded');
const clearUploadBtn = document.getElementById('clearUpload');

// Activity Elements
const filterBtns = document.querySelectorAll('.filter-btn');
const activityItems = document.querySelectorAll('.activity-item');

// Settings Elements
const clearHistoryBtn = document.getElementById('clearHistory');

// Camera Stream
let cameraStream = null;

// Current captured/uploaded image data
let currentImageData = null;
let currentFileType = null;
let currentFileName = null;
let currentFileSize = null;
let currentDimensions = null;

// Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetSection = btn.dataset.section;
        
        // Update active button
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active section
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetSection) {
                section.classList.add('active');
            }
        });
        
        // Stop camera if leaving capture section
        if (targetSection !== 'capture' && cameraStream) {
            stopCamera();
        }
    });
});

// Camera Functions
async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraFeed.srcObject = cameraStream;
        cameraFeed.style.display = 'block';
        cameraPlaceholder.style.display = 'none';
        
        startCameraBtn.disabled = true;
        captureBtn.disabled = false;
        stopCameraBtn.disabled = false;
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please ensure camera permissions are granted.');
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        cameraFeed.srcObject = null;
        cameraFeed.style.display = 'none';
        cameraPlaceholder.style.display = 'flex';
        
        startCameraBtn.disabled = false;
        captureBtn.disabled = true;
        stopCameraBtn.disabled = true;
    }
}

function captureImage() {
    if (!cameraStream) return;
    
    const context = captureCanvas.getContext('2d');
    captureCanvas.width = cameraFeed.videoWidth;
    captureCanvas.height = cameraFeed.videoHeight;
    context.drawImage(cameraFeed, 0, 0);
    
    currentImageData = captureCanvas.toDataURL('image/png');
    currentFileType = 'captured';
    currentFileName = null;
    currentFileSize = null;
    currentDimensions = `${cameraFeed.videoWidth} x ${cameraFeed.videoHeight}`;
    
    capturedImage.src = currentImageData;
    capturedImageContainer.style.display = 'block';
}

startCameraBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', captureImage);
stopCameraBtn.addEventListener('click', stopCamera);

retakePhotoBtn.addEventListener('click', () => {
    capturedImageContainer.style.display = 'none';
    capturedImage.src = '';
    
    // Clear current data
    currentImageData = null;
    currentFileType = null;
    currentFileName = null;
    currentFileSize = null;
    currentDimensions = null;
});

analyzeCapturedBtn.addEventListener('click', async () => {
    if (!currentImageData) return;
    
    analyzeCapturedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    analyzeCapturedBtn.disabled = true;
    
    try {
        // Use real image analysis (TFLite model prioritized)
        const analysisResult = await analyzeImage(currentImageData);
        
        // Save to database
        await api.addQualityCheck({
            type: currentFileType,
            imageData: currentImageData,
            fileName: currentFileName,
            fileSize: currentFileSize,
            dimensions: currentDimensions,
            grade: analysisResult.grade,
            gradeLabel: analysisResult.gradeLabel,
            confidence: analysisResult.confidence,
            characteristics: analysisResult.characteristics,
            qualityClass: analysisResult.qualityClass,
            imageRemoved: currentImageData && currentImageData.length > 50000
        });
        
        // Refresh activity list
        await loadActivityFromDatabase();
        
        analyzeCapturedBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Quality';
        analyzeCapturedBtn.disabled = false;
        
        // Display detailed analysis result with improved UI
        showAnalysisResult(analysisResult);
        
        // Clear current data
        currentImageData = null;
        currentFileType = null;
        currentFileName = null;
        currentFileSize = null;
        currentDimensions = null;
        
    } catch (error) {
        console.error('Analysis error:', error);
        analyzeCapturedBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Quality';
        analyzeCapturedBtn.disabled = false;
        alert('Analysis failed: ' + error.message + '\n\nPlease try again.');
    }
});

// Upload Functions
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#2d5a27';
    uploadArea.style.background = 'rgba(143, 191, 133, 0.2)';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#6b9b63';
    uploadArea.style.background = '#f8f9fa';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#6b9b63';
    uploadArea.style.background = '#f8f9fa';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileUpload(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

function handleFileUpload(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageData = e.target.result;
        currentFileType = 'uploaded';
        currentFileName = file.name;
        currentFileSize = file.size;
        
        uploadedImage.src = currentImageData;
        uploadedImageContainer.style.display = 'block';
        uploadArea.style.display = 'none';
        
        // Display file info
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
            currentDimensions = `${img.width} x ${img.height}`;
            imageDimensions.textContent = `${img.width} x ${img.height} pixels`;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

clearUploadBtn.addEventListener('click', () => {
    uploadedImage.src = '';
    uploadedImageContainer.style.display = 'none';
    uploadArea.style.display = 'block';
    fileInput.value = '';
    fileName.textContent = '';
    fileSize.textContent = '';
    imageDimensions.textContent = '';
    
    // Clear current data
    currentImageData = null;
    currentFileType = null;
    currentFileName = null;
    currentFileSize = null;
    currentDimensions = null;
});

analyzeUploadedBtn.addEventListener('click', async () => {
    if (!currentImageData) return;
    
    analyzeUploadedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    analyzeUploadedBtn.disabled = true;
    
    try {
        // Use real image analysis (TFLite model prioritized)
        const analysisResult = await analyzeImage(currentImageData);
        
        // Save to database
        await api.addQualityCheck({
            type: currentFileType,
            imageData: currentImageData,
            fileName: currentFileName,
            fileSize: currentFileSize,
            dimensions: currentDimensions,
            grade: analysisResult.grade,
            gradeLabel: analysisResult.gradeLabel,
            confidence: analysisResult.confidence,
            characteristics: analysisResult.characteristics,
            qualityClass: analysisResult.qualityClass,
            imageRemoved: currentImageData && currentImageData.length > 50000
        });
        
        // Refresh activity list
        await loadActivityFromDatabase();
        
        analyzeUploadedBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Quality';
        analyzeUploadedBtn.disabled = false;
        
        // Display detailed analysis result with improved UI
        showAnalysisResult(analysisResult);
        
        // Clear current data
        currentImageData = null;
        currentFileType = null;
        currentFileName = null;
        currentFileSize = null;
        currentDimensions = null;
        
    } catch (error) {
        console.error('Analysis error:', error);
        analyzeUploadedBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Quality';
        analyzeUploadedBtn.disabled = false;
        alert('Analysis failed: ' + error.message + '\n\nPlease try again.');
    }
});

// Activity Functions
async function loadActivityFromDatabase() {
    try {
        const checks = await api.getRecentQualityChecks(50);
        renderActivityList(checks);
        await updateStatisticsDisplay();
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

function renderActivityList(checks) {
    const activityList = document.getElementById('activityList');
    
    if (checks.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item" style="justify-content: center; padding: 2rem;">
                <p style="color: var(--medium-gray);">No activity history</p>
            </div>
        `;
        return;
    }
    
    activityList.innerHTML = checks.map(check => {
        const date = new Date(check.timestamp);
        const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const dateString = formatDate(date);
        
        const iconClass = check.type === 'captured' ? 'fa-camera' : 'fa-upload';
        const statusClass = check.grade === 'A' ? 'success' : check.grade === 'B' ? 'warning' : check.grade === 'C' ? 'warning' : 'danger';
        const statusIcon = check.grade === 'A' ? 'fa-check-circle' : check.grade === 'B' ? 'fa-exclamation-circle' : check.grade === 'C' ? 'fa-exclamation-circle' : 'fa-times-circle';
        // Use the stored gradeLabel from the analysis result
        const gradeText = check.gradeLabel || (check.grade === 'A' ? 'High' : check.grade === 'B' ? 'Medium' : check.grade === 'C' ? 'Poor' : 'Not Betel Leaf');
        
        // Add indicator if image was removed due to storage optimization
        const imageNote = check.imageRemoved ? ' <span style="color: #999; font-size: 0.8em;">(Image not saved)</span>' : '';
        
        return `
            <div class="activity-item" data-type="${check.type}" data-id="${check.id}">
                <div class="activity-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="activity-details">
                    <h4>Quality Check - ${check.type.charAt(0).toUpperCase() + check.type.slice(1)}${imageNote}</h4>
                    <p class="activity-result">Grade: ${check.grade} - ${gradeText}</p>
                    <p class="activity-date">${dateString}, ${timeString}</p>
                </div>
                <div class="activity-status ${statusClass}">
                    <i class="fas ${statusIcon}"></i>
                </div>
            </div>
        `;
    }).join('');
}

function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

async function updateStatisticsDisplay() {
    try {
        const stats = await api.getStatistics();
        if (stats) {
            document.getElementById('statTotal').textContent = stats.total_checks;
            document.getElementById('statA').textContent = stats.grade_a;
            document.getElementById('statB').textContent = stats.grade_b;
            document.getElementById('statC').textContent = stats.grade_c;
            // Add grade D tracking for "Not a Betel Leaf"
            if (document.getElementById('statD')) {
                document.getElementById('statD').textContent = stats.grade_d || 0;
            }
        }
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

filterBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        const filter = btn.dataset.filter;
        
        // Update active filter button
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Filter activity items
        const activityItems = document.querySelectorAll('.activity-item');
        activityItems.forEach(item => {
            if (filter === 'all' || item.dataset.type === filter) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
});


// Settings Functions
clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all activity history? This action cannot be undone.')) {
        try {
            await api.clearHistory();
            await loadActivityFromDatabase();
            alert('Activity history has been cleared.');
        } catch (error) {
            console.error('Error clearing history:', error);
            alert('Failed to clear history. Please try again.');
        }
    }
});

// Save settings to database
async function saveSettings() {
    const settings = {
        cameraResolution: document.getElementById('cameraResolution').value,
        flashMode: document.getElementById('flashMode').checked.toString(),
        autoFocus: document.getElementById('autoFocus').checked.toString(),
        analysisSensitivity: document.getElementById('analysisSensitivity').value,
        autoAnalysis: document.getElementById('autoAnalysis').checked.toString(),
        showConfidence: document.getElementById('showConfidence').checked.toString(),
        pushNotifications: document.getElementById('pushNotifications').checked.toString(),
        soundAlerts: document.getElementById('soundAlerts').checked.toString(),
        saveHistory: document.getElementById('saveHistory').checked.toString()
    };
    
    try {
        await api.updateSettings(settings);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Load settings from database
async function loadSettings() {
    try {
        const settings = await api.getSettings();
        
        if (settings) {
            document.getElementById('cameraResolution').value = settings.cameraResolution || 'medium';
            document.getElementById('flashMode').checked = settings.flashMode === 'true';
            document.getElementById('autoFocus').checked = settings.autoFocus === 'true';
            document.getElementById('analysisSensitivity').value = settings.analysisSensitivity || 'medium';
            document.getElementById('autoAnalysis').checked = settings.autoAnalysis === 'true';
            document.getElementById('showConfidence').checked = settings.showConfidence === 'true';
            document.getElementById('pushNotifications').checked = settings.pushNotifications === 'true';
            document.getElementById('soundAlerts').checked = settings.soundAlerts === 'true';
            document.getElementById('saveHistory').checked = settings.saveHistory === 'true';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Add event listeners to all setting inputs
document.querySelectorAll('.setting-select, .toggle-switch input').forEach(input => {
    input.addEventListener('change', saveSettings);
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Test database connection and initialize
    await testDatabaseConnection();
    
    // Try to load TFLite model
    await loadTFLiteModel();
    
    // Load settings
    await loadSettings();
    
    // Load activity from database
    await loadActivityFromDatabase();
    
    // Ensure camera is stopped
    if (cameraStream) {
        stopCamera();
    }
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && cameraStream) {
        stopCamera();
    }
});
