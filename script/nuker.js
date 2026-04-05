/**
 * Auto Hitter - High-Performance Dashboard Controller
 * Handles BIN injection, Retry management, and Smart Start.
 */
(function() {
    const report = (text, status = "") => {
        try { chrome.runtime.sendMessage({ type: "MA_STATUS", text: text, status: status }); } catch(e){}
    };
    
    if (window._controllerRunning) return;
    window._controllerRunning = true;

    const simulateClick = (el) => {
        ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
    };

    const findElements = (root) => {
        const nodes = Array.from(root.querySelectorAll("*"));
        const results = { bin: null, start: null };
        
        for (const node of nodes) {
            if (node.shadowRoot) {
                const sub = findElements(node.shadowRoot);
                if (sub.bin) results.bin = sub.bin;
                if (sub.start) results.start = sub.start;
            }
            
            const txt = (node.innerText || node.textContent || "").trim().toLowerCase();
            const val = (node.value || "").toString().toLowerCase();
            const placeholder = (node.getAttribute("placeholder") || "").toLowerCase();
            
            // 1. Detect BIN Input (Large Numeric Target)
            if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") {
                if (placeholder.includes("bin") || placeholder.includes("enter") || node.id.includes("bin")) {
                    results.bin = node;
                } else if (!results.bin && node.offsetHeight > 30 && node.offsetWidth > 100) {
                    results.bin = node; // Fallback to first prominent input
                }
            }
            
            // 2. Detect START Button
            if (txt === "start" || val === "start" || node.getAttribute("aria-label") === "Start" || (txt.includes("start") && txt.length < 15)) {
                if (node.offsetWidth > 0) results.start = node;
            }
        }
        return results;
    };

    const runController = async () => {
        const data = await chrome.storage.local.get(["maActive", "maBin", "maCount", "maTries"]);
        if (!data || !data.maActive) return;

        // 1. Success Detector (No reload)
        if (window.location.href.includes("success") || window.location.href.includes("thanks")) {
            if (!window._successReported) {
                window._successReported = true;
                report("Hit SUCCESS! Order page detected. Stopping.", "success");
                chrome.storage.local.set({ maActive: false });
            }
            return;
        }

        // 2. Failure Detector (No reload)
        const errorEl = document.querySelector(".FieldError, .Error, [role='alert'], .messaging-message, .p-Icon--error");
        if (errorEl && errorEl.offsetParent !== null && !window._hitTriggeredForThisTry) {
            const errText = errorEl.innerText.toLowerCase();
            const failKeys = ["decline", "invalid", "expired", "check", "try again", "error", "failure"];
            if (failKeys.some(k => errText.includes(k)) && !errText.includes("required")) {
                if (!window._failureReported) {
                    window._failureReported = true;
                    report("Hit Failed: " + errorEl.innerText, "error");
                    
                    // Check if we should retry
                    if (data.maCount - data.maTries > 0) {
                        report("Retrying sequentially in 8s... (No Reload)", "success");
                        setTimeout(() => {
                            window._hitTriggeredForThisTry = false; // Reset for next attempt
                            window._failureReported = false;
                            console.log("[Auto Hitter] Resetting for sequential attempt...");
                        }, 8000);
                    } else {
                        report("Max retries reached. Stopping.", "error");
                        chrome.storage.local.set({ maActive: false });
                    }
                }
                return; // Wait for reset
            }
        }

        const ui = findElements(document);
        
        // 3. Inject BIN if needed
        if (ui.bin && data.maBin && ui.bin.value !== data.maBin) {
            console.log("[Auto Hitter] Injecting BIN: " + data.maBin);
            ui.bin.value = data.maBin;
            ui.bin.dispatchEvent(new Event('input', { bubbles: true }));
            ui.bin.dispatchEvent(new Event('change', { bubbles: true }));
            report("BIN " + data.maBin + " Injected Successfully.", "success");
        }

        // 4. Trigger START at current try
        if (ui.start && !window._hitTriggeredForThisTry && !window._failureReported) {
            window._hitTriggeredForThisTry = true;
            report("Attempt " + (data.maTries + 1) + "/" + data.maCount + " starting now...", "success");
            
            // Brief delay for BIN
            setTimeout(() => {
                simulateClick(ui.start);
                console.log("[Auto Hitter] FORCED START Pulsed.");
            }, 3000);
        }
    };

    // Extreme polling
    setInterval(runController, 1500);
    setTimeout(runController, 1000);
    
    console.log("[Auto Hitter] Sequential Controller Active in Frame: " + window.location.hostname);
})();
