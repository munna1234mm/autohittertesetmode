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

        const ui = findElements(document);
        
        // 1. Inject BIN if needed
        if (ui.bin && data.maBin && ui.bin.value !== data.maBin) {
            console.log("[Auto Hitter] Injecting BIN: " + data.maBin);
            ui.bin.value = data.maBin;
            ui.bin.dispatchEvent(new Event('input', { bubbles: true }));
            ui.bin.dispatchEvent(new Event('change', { bubbles: true }));
            report("BIN " + data.maBin + " Injected Successfully.", "success");
        }

        // 2. Trigger START at current try
        if (ui.start && !window._hitTriggeredForThisTry) {
            window._hitTriggeredForThisTry = true;
            report("Attempt " + (data.maTries + 1) + "/" + data.maCount + " starting now...", "success");
            
            // Brief delay to ensure BIN is registered
            setTimeout(() => {
                simulateClick(ui.start);
                console.log("[Auto Hitter] FORCED START Pulsed.");
            }, 3000);
        }
    };

    // Extreme polling
    setInterval(runController, 1500);
    setTimeout(runController, 3000);
    
    console.log("[Auto Hitter] Controller Active in Frame: " + window.location.hostname);
})();
