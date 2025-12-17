// content.js
// This script bridges the gap between the Chrome Extension world and the webpage world.
// It injects 'injected_ui.js' directly into the DOM so it can access the 'geofs' variable.

(function() {
    console.log("GeoFS G-Meter: Initializing injection...");

    try {
        var script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected_ui.js');
        
        // Clean up the script tag after it has finished loading to keep the DOM tidy
        script.onload = function() {
            this.remove();
            console.log("GeoFS G-Meter: UI script successfully injected.");
        };

        (document.head || document.documentElement).appendChild(script);

    } catch (error) {
        console.error("GeoFS G-Meter: Injection failed.", error);
    }
})();