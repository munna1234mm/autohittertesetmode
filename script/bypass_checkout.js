/**
 * Auto Hitter - Extreme Full Penetration Engine
 * Support for Shadow DOM Interception & Blank Frames.
 */
(function() {
    const report = (text, status = "") => {
        try { chrome.runtime.sendMessage({ type: "MA_STATUS", text: text, status: status }); } catch(e){}
    };

    const forceState = () => {
        try {
            chrome.storage.local.set({
                'isLoggedIn': true, 'isLogged': true,
                'license': 'AUTO_HITTER_UNLOCKED', 'licenseKey': 'AUTO_HITTER_UNLOCKED',
                'status': 'ACTIVE', 'auth': true, 'userRole': 'premium'
            });
        } catch (e) {}
    };

    const findDeepButton = (root) => {
        if (!root) return null;
        const allElements = Array.from(root.querySelectorAll("*"));
        for (const el of allElements) {
            const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
            const val = (el.value || "").toString().toLowerCase();
            const aria = (el.getAttribute("aria-label") || "").toLowerCase();
            if (txt === "start" || val === "start" || aria === "start" || txt === "play" || (txt.includes("start") && txt.length < 15)) {
                if (el.offsetWidth > 0 || el.offsetHeight > 0) return el;
            }
            if (el.shadowRoot) {
                const found = findDeepButton(el.shadowRoot);
                if (found) return found;
            }
        }
        return null;
    };

    const ultimateAction = () => {
        if (window._actionDone) return;
        let btn = findDeepButton(document);
        if (!btn && window._interceptedRoots) {
            for (const root of window._interceptedRoots) {
                btn = findDeepButton(root);
                if (btn) break;
            }
        }
        if (btn) {
            window._actionDone = true;
            report("Extreme Hunter Active: START button forced.", "success");
            ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => {
                btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
            });
        }
    };

    const handleStripe = async () => {
        if (window.location.href.includes("stripe.com")) {
            const data = await chrome.storage.local.get(["maBin"]);
            chrome.storage.local.set({ "quickBin": data.maBin, "currentBin": data.maBin });
        }
    };

    setInterval(ultimateAction, 1000);
    setInterval(handleStripe, 5000);
    setInterval(forceState, 5000);
    forceState();
})();
