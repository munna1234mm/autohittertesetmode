/**
 * Auto Hitter - Cloud Bridge Service Worker
 * This worker polls the Render API and triggers automation tabs.
 */

const API_BASE = "https://autohittertesetmode.onrender.com";
let lastActiveUrl = null;

async function pollCloudSession() {
    try {
        const resp = await fetch(`${API_BASE}/get-session`);
        const data = await resp.json();

        if (data && data.active && data.url) {
            const local = await chrome.storage.local.get(["maActive", "maUrl", "maLastSessionId"]);
            
            // Only trigger if no session is currently active locally
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
        // Silent error to prevent console clutter
    }
}

// Start polling every 6 seconds
setInterval(pollCloudSession, 2500);`n`nchrome.runtime.onMessage.addListener((request) => {`n    if (request.type === "START_SYNC") {`n        console.log("[Bridge Worker] Immediate sync pulse received.");`n        pollCloudSession();`n    }`n});

// Maintain original extension logic
try {
    importScripts("background.js");
    console.log("[Bridge Worker] Original background logic attached.");
} catch (e) {
    console.error("[Bridge Worker] Failed to load background.js:", e);
}
