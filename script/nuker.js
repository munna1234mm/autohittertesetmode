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

    const showOnPageLog = (text, status = "") => {
        if (!document.body) {
            setTimeout(() => showOnPageLog(text, status), 500);
            return;
        }
        let board = document.getElementById("ah-onpage-board");
        if (!board) {
            board = document.createElement("div");
            board.id = "ah-onpage-board";
            board.style = "position:fixed;bottom:20px;left:20px;width:320px;height:180px;background:rgba(0,0,0,0.9);color:#0f0;font-family:monospace;font-size:12px;padding:10px;border:1px solid #333;border-radius:8px;z-index:999999;overflow-y:auto;box-shadow:0 10px 30px rgba(0,0,0,0.5);";
            board.innerHTML = "<div style='color:#fff;border-bottom:1px solid #333;margin-bottom:5px;padding-bottom:5px;font-weight:bold;display:flex;justify-content:space-between;'><span>AUTO HITTER LIVE LOGS</span><span style='color:#0f0;'>●</span></div><div id='ah-logs-container'></div>";
            document.body.appendChild(board);
        }
        const container = document.getElementById("ah-logs-container");
        if (container) {
            const entry = document.createElement("div");
            entry.style = "margin-bottom:3px; border-left: 2px solid " + (status === "error" ? "#f00" : "#0f0") + "; padding-left: 5px;";
            entry.textContent = `> ${text}`;
            container.appendChild(entry);
            board.scrollTop = container.scrollHeight;
        }
    };

    const runController = async () => {
        const data = await chrome.storage.local.get(["maActive", "maBin", "maCount", "maTries"]);
        if (!data || !data.maActive) {
            const b = document.getElementById("ah-onpage-board");
            if (b) b.remove();
            return;
        }

        // 1. Success/Status Monitor
        const txt = document.body.innerText || "";
        if (txt.includes("success") || txt.includes("thanks")) {
            if (!window._successReported) {
                window._successReported = true;
                const msg = "Hit SUCCESS! Order page detected. Stopping.";
                report(msg, "success");
                showOnPageLog(msg, "success");
                chrome.storage.local.set({ maActive: false }); setTimeout(() => { chrome.runtime.sendMessage({ type: "CLOSE_TAB" }); }, 1500);
            }
            return;
        }

        // 2. Failure Detector
        const errorEl = document.querySelector(".FieldError, .Error, [role='alert'], .messaging-message, .p-Icon--error");
        const ui = findElements(document);
        const result = ui.result || (errorEl && errorEl.offsetParent !== null ? errorEl.innerText : null);

        if (result && !window._hitTriggeredForThisTry) {
            const lowerRes = result.toLowerCase();
            const failKeys = ["decline", "invalid", "expired", "check", "try again", "error", "failure", "honor", "funds"];
            if (failKeys.some(k => lowerRes.includes(k)) && !lowerRes.includes("required")) {
                if (!window._failureReported) {
                    window._failureReported = true;
                    const msg = "Hit Result [" + (data.maTries) + "]: " + result;
                    report(msg, "error");
                    showOnPageLog(msg, "error");
                    
                    if (data.maCount - data.maTries > 0) {
                        const rMsg = "Sequential retry in 8s...";
                        report(rMsg, "success");
                        showOnPageLog(rMsg, "success");
                        setTimeout(() => {
                            window._hitTriggeredForThisTry = false;
                            window._failureReported = false;
                        }, 8000);
                    } else {
                        const fMsg = "Finished all " + data.maCount + " tries. Closing in 5s...";
                        report(fMsg, "error");
                        showOnPageLog(fMsg, "error");
                        chrome.storage.local.set({ maActive: false }); 
                        setTimeout(() => { chrome.runtime.sendMessage({ type: "CLOSE_TAB" }); }, 5000);
                    }
                }
                return;
            }
        }

        // 3. Smart Dash Controller (Infinite Hunter until 'Running')
        if (ui.bin && data.maBin && ui.bin.value !== data.maBin) {
            ui.bin.value = data.maBin;
            ui.bin.dispatchEvent(new Event('input', { bubbles: true }));
            ui.bin.dispatchEvent(new Event('change', { bubbles: true }));
            const bMsg = "BIN " + data.maBin + " Re-verified.";
            report(bMsg, "success");
            showOnPageLog(bMsg, "success");
        }

        const statusText = (document.body.innerText || "").toLowerCase();
        const isRunning = statusText.includes("running") || statusText.includes("stop");

        if (ui.start && !isRunning && !window._failureReported) {
            if (!window._lastClickTime || Date.now() - window._lastClickTime > 4000) {
                window._lastClickTime = Date.now();
                const pMsg = "Attempting DASHBOARD START (Infinite Hunter Pulse)...";
                report(pMsg, "success");
                showOnPageLog(pMsg, "success");
                simulateClick(ui.start);
            }
        }
    };

    // Fast polling for instant reaction
    setInterval(runController, 1500);
    setTimeout(runController, 1000);
    
    console.log("[Auto Hitter] Infinite Hunter Active in Frame: " + window.location.hostname);
})();
