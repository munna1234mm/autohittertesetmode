/**
 * Auto Hitter - Button Nuker (Universal Hunter)
 * Injected by background worker for maximum reliability.
 */
(function() {
    const report = (text, status = "") => {
        try { chrome.runtime.sendMessage({ type: "MA_STATUS", text: text, status: status }); } catch(e){}
    };
    
    if (window._nukerRunning) return;
    window._nukerRunning = true;

    const simulateClick = (el) => {
        ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
    };

    const isStartElement = (el) => {
        if (!el || el.offsetWidth === 0) return false;
        const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
        const val = (el.value || "").toString().toLowerCase();
        const id = (el.id || "").toLowerCase();
        const cls = (el.className || "").toString().toLowerCase();
        const aria = (el.getAttribute("aria-label") || "").toLowerCase();
        
        const keys = ["start", "play", "hit", "run", "go", "btn-start", "start-btn"];
        return keys.some(k => txt === k || val === k || id.includes(k) || cls.includes(k) || aria.includes(k));
    };

    const nukeStart = () => {
        if (window._nuked) return;
        
        // Search Current Window DOM
        const elements = document.querySelectorAll("button, div, span, a, input, [role='button']");
        for (const el of elements) {
            if (isStartElement(el)) {
                window._nuked = true;
                report("Nuker Target Found in Frame: " + window.location.hostname + ". Forcing Start!", "success");
                simulateClick(el);
            }
        }
        
        // Also search Shadow DOMs (recursively)
        const findInShadows = (root) => {
            if (!root) return;
            Array.from(root.querySelectorAll("*")).forEach(node => {
                if (node.shadowRoot) findInShadows(node.shadowRoot);
                if (isStartElement(node)) {
                    window._nuked = true;
                    report("Nuker Target Found in Shadow DOM. Forcing Start!", "success");
                    simulateClick(node);
                }
            });
        };
        findInShadows(document);
    };

    // Extreme pulse
    setInterval(nukeStart, 1000);
    nukeStart();
    console.log("[Auto Hitter] Nuker active in frame: " + window.location.href);
})();
