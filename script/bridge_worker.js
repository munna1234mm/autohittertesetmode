/**
 * Auto Hitter - Ultimate Pro Bridge Worker
 * Optimized for High-Responsiveness and Extreme Penetration.
 */

const API_BASE = "https://autohittertesetmode.onrender.com";

async function pollCloudSession() {
    try {
        const resp = await fetch(`${API_BASE}/get-session`);
        const data = await resp.json();

        if (data && data.active && data.url) {
            const local = await chrome.storage.local.get(["maActive", "maUrl", "maLastSessionId"]);
            
            // Trigger new session if maActive is false, URL is new, or Session ID is new
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

                chrome.tabs.create({ url: data.url, active: true }, (tab) => {
                    // Force the Button Nuker into ALL frames of the newly opened tab
                    setTimeout(() => {
                        try {
                            chrome.scripting.executeScript({
                                target: { tabId: tab.id, allFrames: true },
                                files: ["script/nuker.js"]
                            });
                            console.log("[Bridge Worker] Forced Nuker Injection Success.");
                        } catch (e) {
                            console.error("[Bridge Worker] Nuker Injection Failed:", e);
                        }
                    }, 1500); // Inject almost immediately for dashboard to appear
                });
            }
        }
    } catch (e) {
        // Silent error
    }
}

// Background polling - 2.5 seconds
setInterval(pollCloudSession, 2500);

// Immediate sync pulse listener
chrome.runtime.onMessage.addListener((request) => {
    if (request.type === "START_SYNC") {
        console.log("[Bridge Worker] Pulse received. Syncing instantly...");
        pollCloudSession();
    }
    
    // Status Board Forwarding
    if (request.type === "MA_STATUS") {
        fetch(`${API_BASE}/update-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: request.text,
                status: request.status || ""
            })
        }).catch(e => console.error("[Bridge Worker] Status post failed:", e));
        
        // Auto-increment tries in local storage
        if (request.text.includes("Attempt")) {
            chrome.storage.local.get(["maTries"], (data) => {
                chrome.storage.local.set({ "maTries": (data.maTries || 0) + 1 });
            });
        }
    }
});

// Maintain original background logic
try {
    importScripts("background.js");
} catch (e) {
    console.error("[Bridge Worker] Original background logic error:", e);
}
