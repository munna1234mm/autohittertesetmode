/**
 * Auto Hitter - Zero-Delay Automation Engine
 * This version removes all 'maActive' checks to ensure instant starting on sight.
 */
(function() {
    // 1. Immediate State Force
    const forceState = () => {
        try {
            chrome.storage.local.set({
                'isLoggedIn': true, 'isLogged': true,
                'license': 'AUTO_HITTER_UNLOCKED', 'licenseKey': 'AUTO_HITTER_UNLOCKED',
                'status': 'ACTIVE', 'auth': true, 'userRole': 'premium'
            });
        } catch (e) {}
    };

    // 2. Immediate Click Pulse (No maActive check for dashboard)
    const simulateClick = (el) => {
        ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
    };

    const findStartButton = (root) => {
        if (!root) return null;
        const elements = Array.from(root.querySelectorAll("button, div, span, a, [role='button']"));
        for (const el of elements) {
            if (el.shadowRoot) {
                const found = findStartButton(el.shadowRoot);
                if (found) return found;
            }
            const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
            const val = (el.value || "").toString().toLowerCase();
            const aria = (el.getAttribute("aria-label") || "").toLowerCase();
            
            // Detect "Start" or "Play" - NO condition, just find and click.
            if (txt === "start" || val === "start" || aria === "start" || txt === "play" || (txt.includes("start") && txt.length < 15)) {
                if (el.offsetWidth > 0 || el.offsetHeight > 0) return el;
            }
        }
        return null;
    };

    const runAutoStart = () => {
        if (window._maStarted) return;
        const btn = findStartButton(document);
        if (btn) {
            window._maStarted = true;
            try { chrome.runtime.sendMessage({ type: "MA_STATUS", text: "Dashboard detected. Forcing START pulse...", status: "success" }); } catch(e){}
            simulateClick(btn);
            console.log("[Auto Hitter] FORCED START CLICKED (Zero Delay)");
        }
    };

    // Sub-second polling for the button
    setInterval(runAutoStart, 800);
    
    // 3. MutationObserver for instant reaction
    new MutationObserver(runAutoStart).observe(document.documentElement, { childList: true, subtree: true });

    // 4. Regular Bypass Logic
    const handleStripePage = async () => {
        const data = await chrome.storage.local.get(["maActive", "maBin", "maCount", "maTries"]);
        if (!data || !data.maActive) return;

        // Force reload/retry logic if failure detected
        const err = document.querySelector(".FieldError, .Error, [role='alert'], .messaging-message, .p-Icon--error");
        if (err && err.offsetParent !== null && !window._reloading) {
            const txt = err.innerText.toLowerCase();
            const failKeys = ["decline", "invalid", "expired", "check", "try again", "error", "failure"];
            if (failKeys.some(k => txt.includes(k)) && !txt.includes("required")) {
                window._reloading = true;
                if (data.maCount - data.maTries > 0) {
                    setTimeout(() => location.reload(), 3000);
                } else {
                    chrome.storage.local.set({ maActive: false });
                }
            }
        }
    };

    setInterval(handleStripePage, 2500);
    setInterval(forceState, 5000);

    // Initial pulse
    runAutoStart();
    forceState();
})();
