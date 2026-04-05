/**
 * Auto Hitter - Standalone Mini App Controller (Cloud Synced)
 * Optimized for Bottom-Scroll and Live Results.
 */
(function() {
    const logBoard = document.getElementById('logs');
    const hitForm = document.getElementById('hitForm');
    const startBtn = document.getElementById('startBtn');
    const statusDot = document.getElementById('statusDot');
    const API_URL = 'https://autohittertesetmode.onrender.com';

    let lastLogCount = 0;

    const renderLogs = (logs) => {
        if (!logs || logs.length === lastLogCount) return;
        
        // Show only new logs or full list if forced
        logBoard.innerHTML = '';
        logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = 'log-entry ' + (log.status || '');
            const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            entry.textContent = `[${timeStr}] ${log.text}`;
            logBoard.appendChild(entry); // Append to bottom
        });
        
        lastLogCount = logs.length;
        // Auto-scroll to bottom
        logBoard.scrollTop = logBoard.scrollHeight;
    };

    hitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('targetUrl').value.trim();
        const bin = document.getElementById('bin').value.trim();
        const tries = document.getElementById('tries').value;

        if (!url.startsWith('http')) return;

        try {
            await fetch(`${API_URL}/start-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, bin, count: tries })
            });

            chrome.storage.local.set({
                'maActive': true, 'maUrl': url, 'maBin': bin, 'maCount': parseInt(tries), 'maTries': 0
            }, () => {
                chrome.tabs.create({ url: url, active: true });
            });
        } catch (err) {
            console.error("Server Down");
        }
    });

    // Main Cloud Pulser
    const pollLogs = async () => {
        try {
            const resp = await fetch(`${API_URL}/get-session`);
            const data = await resp.json();
            
            if (data.active) {
                startBtn.textContent = 'SESSION ACTIVE';
                startBtn.disabled = true;
                statusDot.style.display = 'block';
            } else {
                startBtn.textContent = 'START AUTOMATION';
                startBtn.disabled = false;
                statusDot.style.display = 'none';
            }

            if (data.status_logs) renderLogs(data.status_logs);
        } catch(e){}
    };

    // Fast Polling - 1.5 seconds for UI responsiveness
    setInterval(pollLogs, 1500);

    // Immediate local listener as a backup
    chrome.runtime.onMessage.addListener((request) => {
        if (request.type === 'MA_STATUS') {
            // Forwarding to server is handled by Background Worker for reliability
            // This listener is just for immediate feedback
            const entry = document.createElement('div');
            entry.className = 'log-entry ' + (request.status || '');
            const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            entry.textContent = `[${timeStr}] ${request.text}`;
            logBoard.appendChild(entry);
            logBoard.scrollTop = logBoard.scrollHeight;
        }
    });

    pollLogs();
})();
