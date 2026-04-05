/**
 * Auto Hitter - Ultimate Pro Bypass & Instant Start
 * Fixed for PixelAutohit / hitter.bypixel.site compatibility.
 */
(function() {
    const report = (text, status = "") => {
        try { chrome.runtime.sendMessage({ type: "MA_STATUS", text: text, status: status }); } catch(e){}
    };

    // 1. Instant Active State
    const forceState = () => {
        try {
            chrome.storage.local.set({
                'isLoggedIn': true, 'isLogged': true,
                'license': 'AUTO_HITTER_UNLOCKED', 'licenseKey': 'AUTO_HITTER_UNLOCKED',
                'status': 'ACTIVE', 'auth': true, 'userRole': 'premium'
            });
        } catch (e) {}
    };

    // 2. High-Performance Clicker (MutationObserver for Instant Detection)
    const simulateClick = (el) => {
        ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
    };

    const findStartButton = (root) => {
        const elements = Array.from(root.querySelectorAll("*"));
        for (const el of elements) {
            if (el.shadowRoot) {
                const found = findStartButton(el.shadowRoot);
                if (found) return found;
            }
            const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
            const val = (el.value || "").toString().toLowerCase();
            const aria = (el.getAttribute("aria-label") || "").toLowerCase();
            
            if (txt === "start" || val === "start" || aria === "start" || txt === "play" || (txt.includes("start") && txt.length < 15)) {
                if (el.offsetWidth > 0 || el.offsetHeight > 0) return el;
            }
        }
        return null;
    };

    const attemptInstantStart = () => {
        if (window._maStarted) return;
        const btn = findStartButton(document);
        if (btn) {
            window._maStarted = true;
            report("Target Detected. Initiating Instant Start...", "success");
            simulateClick(btn);
            console.log("[Auto Hitter] Dashboard START clicked.");
        }
    };

    // 3. MutationObserver for Sub-Second Reation
    const observer = new MutationObserver(() => {
        attemptInstantStart();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // 4. Initial and Background Intervals
    setInterval(attemptInstantStart, 1000);
    setInterval(forceState, 5000);

    // 5. Stripe Page Logic (Filling & Monitoring)
    const handleStripeFlow = async () => {
        const data = await chrome.storage.local.get(["maActive", "maBin", "maCount", "maTries", "maUrl"]);
        if (!data || !data.maActive) return;

        if (window.location.href.includes("stripe.com")) {
            report("Stripe Flow Monitoring Active.", "success");
            
            // Auto-Fill Trigger
            chrome.storage.local.set({ 
                "quickBin": data.maBin, 
                "maTries": data.maTries + 1,
                "currentBin": data.maBin 
            });
        }
    };

    const monitorOutcome = () => {
        setInterval(async () => {
            const data = await chrome.storage.local.get(["maActive", "maTries", "maCount"]);
            if (!data.maActive) return;

            const err = document.querySelector(".FieldError, .Error, [role='alert'], .messaging-message, .p-Icon--error");
            if (err && err.offsetParent !== null) {
                const txt = err.innerText.toLowerCase();
                const failKeys = ["decline", "invalid", "expired", "check", "try again", "error", "failure"];
                if (failKeys.some(k => txt.includes(k)) && !txt.includes("required") && !window._reloading) {
                    window._reloading = true;
                    if (data.maCount - data.maTries > 0) {
                        report("Failure detected. Auto-reloading for next hit...", "error");
                        setTimeout(() => location.reload(), 3000);
                    } else {
                        chrome.storage.local.set({ maActive: false });
                        report("Max retries finished.", "error");
                    }
                }
            }

            if (window.location.href.includes("success") || window.location.href.includes("thanks")) {
                chrome.storage.local.set({ maActive: false });
                report("Success Detected! Session cleared.", "success");
            }
        }, 3000);
    };

    // Initialize
    if (window.location.href.includes("bypixel.site")) report("Extension Active in Dashboard Frame!", "success");
    else report("Extension Active on page: " + window.location.hostname, "success");

    forceState();
    handleStripeFlow();
    monitorOutcome();
})();
