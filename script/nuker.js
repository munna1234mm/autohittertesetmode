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
                if (sub.result) results.result = sub.result;
            }
            
            const txt = (node.innerText || node.textContent || "").trim();
            const lowerTxt = txt.toLowerCase();
            const val = (node.value || "").toString().toLowerCase();
            const placeholder = (node.getAttribute("placeholder") || "").toLowerCase();
            
            // 1. Detect BIN Input
            if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") {
                if (placeholder.includes("bin") || placeholder.includes("enter") || node.id.includes("bin")) {
                    results.bin = node;
                }
            }
            
            // 2. Detect START Button
            if (lowerTxt === "start" || val === "start" || (lowerTxt.includes("start") && lowerTxt.length < 15)) {
                if (node.offsetWidth > 0) results.start = node;
            }

            // 3. Detect Result Popups (like "do_not_honor", "success", "insufficient_funds")
            if (txt.includes("_") || txt.includes(" ") || txt.length > 3) {
                if (node.offsetWidth > 0 && node.offsetParent !== null) {
                    const style = window.getComputedStyle(node);
                    if (style.position === "fixed" || style.zIndex > 1000 || node.className.includes("notification") || node.className.includes("alert")) {
                        if (!results.result || txt.length < results.result.length) {
                             results.result = txt; // Smaller text is usually the error code
                        }
                    }
                }
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

        // 2. Failure/Result Detector (No reload)
        const errorEl = document.querySelector(".FieldError, .Error, [role='alert'], .messaging-message, .p-Icon--error");
        const ui = findElements(document);
        const result = ui.result || (errorEl && errorEl.offsetParent !== null ? errorEl.innerText : null);

        if (result && !window._hitTriggeredForThisTry) {
            const lowerRes = result.toLowerCase();
            const failKeys = ["decline", "invalid", "expired", "check", "try again", "error", "failure", "honor", "funds"];
            if (failKeys.some(k => lowerRes.includes(k)) && !lowerRes.includes("required")) {
                if (!window._failureReported) {
                    window._failureReported = true;
                    report("Hit Result [" + (data.maTries) + "]: " + result, "error");
                    
                    // Check if we should retry
                    if (data.maCount - data.maTries > 0) {
                        report("Sequential retry in 8s... (No Reload)", "success");
                        setTimeout(() => {
                            window._hitTriggeredForThisTry = false; // Reset
                            window._failureReported = false;
                        }, 8000);
                    } else {
                        report("Finished all " + data.maCount + " tries.", "error");
                        chrome.storage.local.set({ maActive: false });
                    }
                }
                return;
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
