/**
 * Auto Hitter - Standalone Mini App Controller (Python Service Integrated)
 */
(function() {
    const logBoard = document.getElementById('logs');
    const hitForm = document.getElementById('hitForm');
    const startBtn = document.getElementById('startBtn');
    const statusDot = document.getElementById('statusDot');
    const API_URL = 'https://autohittertesetmode.onrender.com';

    const addLog = (text, type = '') => {
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + type;
        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        entry.textContent = `[${time}] ${text}`;
        logBoard.prepend(entry);
    };

    hitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = document.getElementById('targetUrl').value.trim();
        const bin = document.getElementById('bin').value.trim();
        const tries = document.getElementById('tries').value;

        if (!url.startsWith('http')) {
            addLog('Invalid Stripe URL!', 'error');
            return;
        }

        addLog('Connecting to Python Server...', 'success');
        
        try {
            const resp = await fetch(`${API_URL}/start-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, bin, count: tries })
            });
            const data = await resp.json();
            
            addLog('Session synced with Python API.', 'success');
            startBtn.textContent = 'SESSION ACTIVE';
            startBtn.disabled = true;
            statusDot.style.display = 'block';

            // Also keep local copy for immediate content script access
            chrome.storage.local.set({
                'maActive': true,
                'maUrl': url,
                'maBin': bin,
                'maCount': parseInt(tries),
                'maTries': 0
            }, () => {
                chrome.tabs.create({ url: url, active: true });
            });
            
        } catch (err) {
            addLog('Python Server not running! Check localhost:5000', 'error');
        }
    });

    // Periodically poll the Python server for status updates (logs from content scripts)
    const pollLogs = async () => {
        try {
            const resp = await fetch(`${API_URL}/get-session`);
            const data = await resp.json();
            
            if (data.active) {
                // Keep UI updated if active
                startBtn.textContent = 'SESSION ACTIVE';
                startBtn.disabled = true;
                statusDot.style.display = 'block';
            } else {
                startBtn.textContent = 'START AUTOMATION';
                startBtn.disabled = false;
                statusDot.style.display = 'none';
            }

            // Sync logs (we simple clear and redraw for brevity in this MVP, or prepend new ones)
            // For now, content script messages still come via chrome.runtime, 
            // but we can also pull from Python if multiple users are hit.
        } catch(e){}
    };
    setInterval(pollLogs, 3000);

    // Listen for messages from content scripts and forward to Python
    chrome.runtime.onMessage.addListener((request) => {
        if (request.type === 'MA_STATUS') {
            addLog(request.text, request.status || '');
            
            // Forward to Python Server
            fetch(`${API_URL}/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: request.text, status: request.status })
            }).catch(e => {});

            if (request.text.includes('Stopping') || request.text.includes('Success')) {
                startBtn.textContent = 'START AUTOMATION';
                startBtn.disabled = false;
                statusDot.style.display = 'none';
            }
        }
    });

    // Check initial state
    pollLogs();
})();
