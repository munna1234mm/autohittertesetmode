/**
 * Auto Hitter - Cloud Bridge Service Worker
 * This worker polls the Render API and triggers automation tabs.
 */

const API_BASE = "https://autohittertesetmode.onrender.com";

async function pollCloudSession() {
    try {
        const resp = await fetch(`${API_BASE}/get-session`);
        const data = await resp.json();

        if (data && data.active && data.url) {
            const local = await chrome.storage.local.get(["maActive", "maUrl", "maLastSessionId"]);
            
            // Only trigger if no session is currently active locally OR if session_id is new
            if (!local.maActive || local.maUrl !== data.url || local.maLastSessionId !== data.session_id) {
                console.log("[Bridge Worker] Starting new sequential session. Opening single tab...");
                
                await chrome.storage.local.set({
                    "maActive": true,
                    "maUrl": data.url,
                    "maBin": data.bin,
                    "maCount": parseInt(data.count),
                    "maTries": 0,
                    "maLastSessionId": data.session_id
                });

                chrome.tabs.create({ url: data.url, active: true });
            }
        }
    } catch (e) {
        // Silent error
    }
}

// Polling interval (2.5 seconds)
setInterval(pollCloudSession, 2500);

// Immediate sync listener
chrome.runtime.onMessage.addListener((request) => {
    if (request.type === "START_SYNC") {
        console.log("[Bridge Worker] Pulse received. Syncing now...");
        pollCloudSession();
    }
});

// Maintain original extension logic
try {
    importScripts("background.js");
} catch (e) {
    console.error("[Bridge Worker] Original logic error:", e);
}
