/**
 * Auto Hitter - Extreme Interception Script
 * Runs at document_start to capture Closed Shadow Roots.
 */
(function() {
    window._interceptedRoots = window._interceptedRoots || [];

    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
        const shadowRoot = originalAttachShadow.apply(this, arguments);
        // Save a reference to ALL shadow roots, regardless of "open" or "closed"
        window._interceptedRoots.push(shadowRoot);
        return shadowRoot;
    };

    console.log("[Auto Hitter] Shadow Interception Active.");
})();
