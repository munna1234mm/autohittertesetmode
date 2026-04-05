/**
 * Auto Hitter - Extreme Full Penetration Engine
 * Support for Shadow DOM Interception & Blank Frames.
 */
(function() {
    const report = (text, status = "") => {
        try { chrome.runtime.sendMessage({ type: "MA_STATUS", text: text, status: status }); } catch(e){}
    };

    // 1. Instant Start Mechanism (Universal Hunter)
    const simulateClick = (el) => {
        ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
    };

    const findDeepButton = (root) => {
        if (!root) return null;
        
        // Search current root (Document or ShadowRoot)
        const allElements = Array.from(root.querySelectorAll("*"));
        for (const el of allElements) {
            const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
            const val = (el.value || "").toString().toLowerCase();
            const aria = (el.getAttribute("aria-label") || "").toLowerCase();
            
            if (txt === "start" || val === "start" || aria === "start" || txt === "play" || (txt.includes("start") && txt.length < 15)) {
                if (el.offsetWidth > 0 || el.offsetHeight > 0) return el;
            }
            
            // Recurse into Open Shadow DOM
            if (el.shadowRoot) {
                const found = findDeepButton(el.shadowRoot);
                if (found) return found;
            }
        }
        return null;
    };

    const ultimateAction = () => {
        if (window._actionDone) return;

        // 1. Normal DOM Search
        let btn = findDeepButton(document);
        
        // 2. Intercepted Shadow DOM Search (The Secret Weapon)
        if (!btn && window._interceptedRoots && window._interceptedRoots.length > 0) {
            for (const root of window._interceptedRoots) {
                btn = findDeepButton(root);
                if (btn) break;
            }
        }

        if (btn) {
            window._actionDone = true;
            report("Extreme Hunter Active: START button forced.", "success");
            simulateClick(btn);
            console.log("[Auto Hitter] Shadow/Blank penetration success.");
        }
    };

    // Fast Polling
    setInterval(ultimateAction, 800);
    new MutationObserver(ultimateAction).observe(document.documentElement, { childList: true, subtree: true });

    // 2. Stripe Page Logic
    const handleStripe = async () => {
        if (!window.location.href.includes("stripe.com") && !window.location.href.includes("about:blank")) return;
        
        const data = await chrome.storage.local.get(["maActive", "maBin", "maCount", "maTries"]);
        if (!data || !data.maActive) return;

        // Force reload/retry logic if failure detected
        const err = document.querySelector(".FieldError, .Error, [role='alert'], .messaging-message, .p-Icon--error");
        if (err && err.offsetParent !== null && !window._reloading) {
            const txt = err.innerText.toLowerCase();
            const failKeys = ["decline", "invalid", "expired", "check", "try again", "error", "failure"];
            if (failKeys.some(k => txt.includes(k)) && !txt.includes("required")) {
                window._reloading = true;
                if (data.maCount - data.maTries > 1) { // -1 because tries increments in handleStripeFlow (worker)
                    setTimeout(() => location.reload(), 3000);
                } else {
                    chrome.storage.local.set({ maActive: false });
                }
            }
        }
    };

    setInterval(handleStripe, 2500);

    // Initial Status Report
    if (window.location.href === "about:blank") report("Active in Blank/Hidden Frame.", "success");
    else report("Active on Page: " + window.location.hostname, "success");

    ultimateAction();
})();
