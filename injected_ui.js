// injected_ui.js
// V1.1: Added "Reset Min/Max on Toggle" feature

(function() {
    // --- 1. Initialization Checks ---
    if (document.getElementById('g-meter-root')) return;
    if (!document.body) return;

    // --- 2. Inject CSS for the Slider Toggle ---
    const style = document.createElement('style');
    style.innerHTML = `
        .g-switch {
            position: relative;
            display: inline-block;
            width: 24px;
            height: 14px;
            margin-right: 6px;
            vertical-align: middle;
        }
        .g-switch input { opacity: 0; width: 0; height: 0; }
        .g-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(255, 255, 255, 0.2);
            transition: .3s;
            border-radius: 34px;
        }
        .g-slider:before {
            position: absolute;
            content: "";
            height: 10px;
            width: 10px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }
        input:checked + .g-slider { background-color: #33ffbb; }
        input:checked + .g-slider:before { transform: translateX(10px); }
    `;
    document.head.appendChild(style);

    // --- 3. Create the Blackout Overlay ---
    const blackoutLayer = document.createElement('div');
    blackoutLayer.id = 'g-loc-overlay';
    Object.assign(blackoutLayer.style, {
        position: 'fixed',
        top: '0', left: '0', width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: '2147483640',
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.95) 100%)',
        opacity: '0', transition: 'opacity 0.2s ease-out'
    });
    document.body.appendChild(blackoutLayer);

    // --- 4. Create the HUD Container ---
    const container = document.createElement('div');
    container.id = 'g-meter-root';
    Object.assign(container.style, {
        position: 'fixed', top: '10px', left: '10px', width: '160px', padding: '8px 10px',
        backgroundColor: 'rgba(10, 20, 40, 0.25)', backdropFilter: 'blur(8px)', webkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(100, 200, 255, 0.2)', boxShadow: '0 0 10px rgba(100, 200, 255, 0.05)',
        color: '#e0f0ff', fontFamily: '"Courier New", Consolas, monospace', borderRadius: '6px',
        zIndex: '2147483647', pointerEvents: 'auto'
    });

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
            <span style="font-weight:bold; color:#8ab; font-size:11px; letter-spacing:1px;">G-LOAD</span>
            <span id="g-current" style="font-weight:bold; font-size:18px; text-shadow: 0 0 5px currentColor;">1.0</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:9px; color:#8ab; margin-bottom:5px;">
            <span>MIN: <span id="g-min" style="color:#fff">1.0</span></span>
            <span>MAX: <span id="g-max" style="color:#fff">1.0</span></span>
        </div>
        <canvas id="g-graph" width="140" height="30" style="background:rgba(0, 0, 0, 0.1); border-radius:3px; border:1px solid rgba(100, 200, 255, 0.1);"></canvas>
        <div style="margin-top:5px; display:flex; justify-content:flex-end; align-items:center;">
            <label class="g-switch">
                <input type="checkbox" id="g-loc-toggle" checked>
                <span class="g-slider"></span>
            </label>
            <span style="font-size:9px; color:#aaa;">Blackout / Reset</span>
        </div>
    `;
    document.body.appendChild(container);

    // --- 5. Logic Loop ---
    let maxRecord = 1.0;
    let minRecord = 1.0;
    const history = new Array(80).fill(1.0); 
    
    const canvas = document.getElementById('g-graph');
    const ctx = canvas.getContext('2d');
    const blackoutToggle = document.getElementById('g-loc-toggle');

    // NEW FEATURE: Reset Min/Max when toggle is clicked
    if (blackoutToggle) {
        blackoutToggle.addEventListener('change', function() {
            maxRecord = 1.0;
            minRecord = 1.0;
            // Visual feedback (flash the text briefly)
            document.getElementById('g-max').style.color = '#33ffbb';
            document.getElementById('g-min').style.color = '#33ffbb';
            setTimeout(() => {
                document.getElementById('g-max').style.color = '#fff';
                document.getElementById('g-min').style.color = '#fff';
            }, 300);
        });
    }

    function gameLoop() {
        if (typeof geofs === 'undefined' || !geofs.animation || !geofs.animation.values) {
            container.style.display = 'none'; 
            requestAnimationFrame(gameLoop);
            return;
        }
        container.style.display = 'block';

        let currentG = 1.0;
        const simValues = geofs.animation.values;

        if (simValues.loadFactor !== undefined) currentG = simValues.loadFactor;
        else if (simValues.accZ !== undefined) currentG = simValues.accZ / 9.81;
        currentG = parseFloat(currentG);

        // Blackout Logic
        if (blackoutToggle && blackoutToggle.checked) {
            if (currentG > 9.0) {
                let intensity = (currentG - 9.0) / 6.0; 
                if (intensity > 1.0) intensity = 1.0; 
                blackoutLayer.style.opacity = intensity;
                const visionRadius = 80 - (60 * intensity); 
                blackoutLayer.style.background = `radial-gradient(ellipse at center, transparent ${visionRadius}%, rgba(0,0,0,0.95) 100%)`;
            } else if (currentG < -3.0) {
                let intensity = Math.abs(currentG + 3.0) / 3.0;
                if (intensity > 1.0) intensity = 1.0;
                blackoutLayer.style.opacity = intensity;
                const visionRadius = 80 - (60 * intensity);
                blackoutLayer.style.background = `radial-gradient(ellipse at center, transparent ${visionRadius}%, rgba(200,0,0,0.6) 100%)`;
            } else {
                blackoutLayer.style.opacity = '0';
            }
        } else {
            blackoutLayer.style.opacity = '0';
        }

        // Update Records
        if (currentG > maxRecord) maxRecord = currentG;
        if (currentG < minRecord) minRecord = currentG;

        // UI Updates
        const gText = document.getElementById('g-current');
        gText.innerText = currentG.toFixed(1);
        document.getElementById('g-min').innerText = minRecord.toFixed(1);
        document.getElementById('g-max').innerText = maxRecord.toFixed(1);

        if (currentG > 5.0 || currentG < -2.0) {
            gText.style.color = '#ff3333'; container.style.borderColor = 'rgba(255, 50, 50, 0.4)';
        } else {
            gText.style.color = '#33ffbb'; container.style.borderColor = 'rgba(100, 200, 255, 0.2)';
        }

        history.push(currentG);
        history.shift(); 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const baseLineY = canvas.height - 10; 
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)'; 
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, baseLineY); ctx.lineTo(canvas.width, baseLineY); ctx.stroke();
        
        ctx.shadowBlur = 6;
        const barWidth = canvas.width / history.length;
        for (let i = 0; i < history.length; i++) {
            const val = history[i];
            const height = (val - 1) * 10; 
            if (val > 5.0 || val < -2.0) { ctx.fillStyle = '#ff3333'; ctx.shadowColor = '#ff0000'; }
            else { ctx.fillStyle = '#33ffbb'; ctx.shadowColor = '#33ffbb'; }
            ctx.fillRect(i * barWidth, baseLineY, barWidth - 0.5, -height);
        }
        ctx.shadowBlur = 0;
        requestAnimationFrame(gameLoop);
    }
    gameLoop();
})();