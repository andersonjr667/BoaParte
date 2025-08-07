const fs = require('fs-extra');
const path = require('path');

const logsPath = path.join(__dirname, '..', 'db', 'logs.json');

async function saveLog(logEntry) {
    try {
        // Ensure logs.json exists
        await fs.ensureFile(logsPath);
        
        // Read existing logs
        let logs = [];
        try {
            const content = await fs.readFile(logsPath, 'utf8');
            logs = JSON.parse(content);
        } catch (error) {
            logs = [];
        }

        // Add new log with timestamp
        const newLog = {
            ...logEntry,
            timestamp: new Date().toISOString(),
            id: Date.now().toString()
        };

        logs.unshift(newLog); // Add to beginning of array

        // Keep only last 1000 logs
        if (logs.length > 1000) {
            logs = logs.slice(0, 1000);
        }

        // Save back to file
        await fs.writeFile(logsPath, JSON.stringify(logs, null, 2));
        
        return newLog;
    } catch (error) {
        console.error('Error saving log:', error);
        throw error;
    }
}

module.exports = { saveLog };