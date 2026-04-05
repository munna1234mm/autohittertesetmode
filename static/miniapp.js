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
        
        if (startBtn.textContent === 'STOP') {
            // Stop logic
            addLog('Stopping session...', 'error');
            try {
                await fetch(`${API_URL}/clear-session`, { method: 'POST' });
                startBtn.textContent = 'START';
                startBtn.classList.remove('stop');
                statusDot.style.display = 'none';
            } catch(e) {}
            return;
        }

        // Start logic
        const url = document.getElementById('targetUrl').value.trim();
        const bin = document.getElementById('bin').value.trim();
        const tries = document.getElementById('tries').value;

        if (!url.startsWith('http')) {
            addLog('Invalid Stripe URL!', 'error');
            return;
        }

        addLog('Connecting to Cloud Server...', 'success');
        
        try {
            const resp = await fetch(`${API_URL}/start-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, bin, count: tries })
            });
            const data = await resp.json();
            
            addLog('Session synced with Cloud Extension.', 'success');
            startBtn.textContent = 'STOP';
            startBtn.classList.add('stop');
            statusDot.style.display = 'block';
            
        } catch (err) {
            addLog('Cloud Server connection failed. Retrying...', 'error');
        }
    });

    // Periodically poll the Python server for status updates (logs from content scripts)
    const pollLogs = async () => {
        try {
            const resp = await fetch(`${API_URL}/get-session`);
            const data = await resp.json();
            
            if (data.active) {
                // Keep UI updated if active
                startBtn.textContent = 'STOP';
                startBtn.classList.add('stop');
                statusDot.style.display = 'block';
            } else {
                startBtn.textContent = 'START';
                startBtn.classList.remove('stop');
                statusDot.style.display = 'none';
            }
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
                startBtn.textContent = 'START';
                startBtn.classList.remove('stop');
                statusDot.style.display = 'none';
            }
        }
    });

    // Check initial state
    pollLogs();
})();
