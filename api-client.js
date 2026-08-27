/**
 * DAPONCHECK Local Storage Client
 * Stores analysis results in browser's localStorage (no database needed)
 */

class ApiClient {
    constructor() {
        this.storageKey = 'daponcheck_quality_checks';
        this.settingsKey = 'daponcheck_settings';
        this.statsKey = 'daponcheck_stats';
        this.initializeStorage();
    }

    /**
     * Initialize storage with default values
     */
    initializeStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.settingsKey)) {
            localStorage.setItem(this.settingsKey, JSON.stringify({
                cameraResolution: 'medium',
                flashMode: 'false',
                autoFocus: 'true',
                analysisSensitivity: 'medium',
                autoAnalysis: 'true',
                showConfidence: 'true',
                pushNotifications: 'true',
                soundAlerts: 'false',
                saveHistory: 'true'
            }));
        }
        if (!localStorage.getItem(this.statsKey)) {
            localStorage.setItem(this.statsKey, JSON.stringify({
                total_checks: 0,
                grade_a: 0,
                grade_b: 0,
                grade_c: 0,
                grade_d: 0,
                captured_count: 0,
                uploaded_count: 0
            }));
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Get all quality checks
     */
    async getQualityChecks() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error retrieving quality checks:', error);
            return [];
        }
    }

    /**
     * Get quality check by ID
     */
    async getQualityCheckById(id) {
        try {
            const checks = await this.getQualityChecks();
            return checks.find(check => check.id === id) || null;
        } catch (error) {
            console.error('Error retrieving quality check:', error);
            return null;
        }
    }

    /**
     * Add new quality check
     */
    async addQualityCheck(checkData) {
        try {
            const checks = await this.getQualityChecks();
            const newCheck = {
                id: this.generateId(),
                timestamp: new Date().toISOString(),
                ...checkData
            };
            checks.push(newCheck);
            localStorage.setItem(this.storageKey, JSON.stringify(checks));
            
            // Update statistics
            this.updateStats(checkData.type, checkData.grade);
            
            return { id: newCheck.id };
        } catch (error) {
            console.error('Error adding quality check:', error);
            throw error;
        }
    }

    /**
     * Update quality check
     */
    async updateQualityCheck(id, updateData) {
        try {
            const checks = await this.getQualityChecks();
            const index = checks.findIndex(check => check.id === id);
            if (index !== -1) {
                checks[index] = { ...checks[index], ...updateData };
                localStorage.setItem(this.storageKey, JSON.stringify(checks));
                return checks[index];
            }
            throw new Error('Quality check not found');
        } catch (error) {
            console.error('Error updating quality check:', error);
            throw error;
        }
    }

    /**
     * Delete quality check
     */
    async deleteQualityCheck(id) {
        try {
            const checks = await this.getQualityChecks();
            const filtered = checks.filter(check => check.id !== id);
            localStorage.setItem(this.storageKey, JSON.stringify(filtered));
            return { success: true };
        } catch (error) {
            console.error('Error deleting quality check:', error);
            throw error;
        }
    }

    /**
     * Get checks by type
     */
    async getQualityChecksByType(type) {
        try {
            const checks = await this.getQualityChecks();
            return checks.filter(check => check.type === type);
        } catch (error) {
            console.error('Error retrieving checks by type:', error);
            return [];
        }
    }

    /**
     * Get checks by grade
     */
    async getQualityChecksByGrade(grade) {
        try {
            const checks = await this.getQualityChecks();
            return checks.filter(check => check.grade === grade);
        } catch (error) {
            console.error('Error retrieving checks by grade:', error);
            return [];
        }
    }

    /**
     * Get recent quality checks
     */
    async getRecentQualityChecks(limit = 10) {
        try {
            const checks = await this.getQualityChecks();
            return checks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
        } catch (error) {
            console.error('Error retrieving recent checks:', error);
            return [];
        }
    }

    /**
     * Get all settings
     */
    async getSettings() {
        try {
            const data = localStorage.getItem(this.settingsKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error retrieving settings:', error);
            return {};
        }
    }

    /**
     * Get single setting
     */
    async getSetting(key) {
        try {
            const settings = await this.getSettings();
            return settings[key] || null;
        } catch (error) {
            console.error('Error retrieving setting:', error);
            return null;
        }
    }

    /**
     * Update single setting
     */
    async updateSetting(key, value) {
        try {
            const settings = await this.getSettings();
            settings[key] = value;
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
            return { success: true };
        } catch (error) {
            console.error('Error updating setting:', error);
            throw error;
        }
    }

    /**
     * Update multiple settings
     */
    async updateSettings(settings) {
        try {
            const current = await this.getSettings();
            const updated = { ...current, ...settings };
            localStorage.setItem(this.settingsKey, JSON.stringify(updated));
            return { success: true };
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }

    /**
     * Reset settings to default
     */
    async resetSettings() {
        try {
            localStorage.removeItem(this.settingsKey);
            this.initializeStorage();
            return { success: true };
        } catch (error) {
            console.error('Error resetting settings:', error);
            throw error;
        }
    }

    /**
     * Get statistics
     */
    async getStatistics() {
        try {
            const data = localStorage.getItem(this.statsKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error retrieving statistics:', error);
            return {};
        }
    }

    /**
     * Update statistics based on new check
     */
    updateStats(type, grade) {
        try {
            const stats = JSON.parse(localStorage.getItem(this.statsKey)) || {};
            
            stats.total_checks = (stats.total_checks || 0) + 1;
            
            // Update grade counts
            if (grade === 'A') stats.grade_a = (stats.grade_a || 0) + 1;
            else if (grade === 'B') stats.grade_b = (stats.grade_b || 0) + 1;
            else if (grade === 'C') stats.grade_c = (stats.grade_c || 0) + 1;
            else if (grade === 'D') stats.grade_d = (stats.grade_d || 0) + 1;
            
            // Update type counts
            if (type === 'captured') stats.captured_count = (stats.captured_count || 0) + 1;
            else if (type === 'uploaded') stats.uploaded_count = (stats.uploaded_count || 0) + 1;
            
            localStorage.setItem(this.statsKey, JSON.stringify(stats));
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }

    /**
     * Clear all history
     */
    async clearHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
            localStorage.setItem(this.statsKey, JSON.stringify({
                total_checks: 0,
                grade_a: 0,
                grade_b: 0,
                grade_c: 0,
                grade_d: 0,
                captured_count: 0,
                uploaded_count: 0
            }));
            return { success: true };
        } catch (error) {
            console.error('Error clearing history:', error);
            throw error;
        }
    }

    /**
     * Export all data as JSON
     */
    async exportData() {
        try {
            const checks = await this.getQualityChecks();
            const settings = await this.getSettings();
            const stats = await this.getStatistics();
            return {
                checks,
                settings,
                stats,
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    /**
     * Import data from JSON
     */
    async importData(data) {
        try {
            if (data.checks) {
                localStorage.setItem(this.storageKey, JSON.stringify(data.checks));
            }
            if (data.settings) {
                localStorage.setItem(this.settingsKey, JSON.stringify(data.settings));
            }
            if (data.stats) {
                localStorage.setItem(this.statsKey, JSON.stringify(data.stats));
            }
            return { success: true };
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }
}

// Create global API instance
const api = new ApiClient();
