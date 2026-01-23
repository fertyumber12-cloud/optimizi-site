(function() {
    // --- AYARLAR ---
    const CONFIG = {
        user: "inspro",
        pass: "inspro44", 
    };

    // 1. Zaten giriş yapılmışsa dur
    if (localStorage.getItem('optimizi_session') === '1') {
        return; 
    }

    // Scroll Kilitle (JS ile)
    document.body.style.overflow = 'hidden'; 

    // 2. CSS - Sci-Fi & Tech UI
    const style = document.createElement('style');
    style.innerHTML = `
        /* Ana Konteyner */
        #optimizi-guard-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            z-index: 2147483647; 
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', system-ui, sans-serif;
            overflow: hidden;
        }

        /* --- ARKA PLAN HALKALARI (GYROSCOPE) --- */
        .orbit-container {
            position: absolute;
            width: 600px; height: 600px;
            display: flex; justify-content: center; align-items: center;
            z-index: 0;
            opacity: 0.4;
            pointer-events: none; /* Tıklamayı engellemesin */
        }
        
        .orbit-ring {
            position: absolute;
            border-radius: 50%;
            border: 1px solid rgba(99, 102, 241, 0.3);
            box-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
        }

        .ring-1 {
            width: 100%; height: 100%;
            border-top: 2px solid #6366f1;
            border-bottom: 2px solid transparent;
            animation: spin-right 12s linear infinite;
        }
        
        .ring-2 {
            width: 70%; height: 70%;
            border: 1px solid rgba(249, 115, 22, 0.2);
            border-left: 2px solid #f97316;
            border-right: 2px solid transparent;
            animation: spin-left 8s linear infinite;
        }

        .ring-3 {
            width: 40%; height: 40%;
            border: 1px dashed rgba(255, 255, 255, 0.4);
            animation: spin-right 20s linear infinite;
        }

        /* --- FAKE DATA GÖRSELLERİ --- */
        .tech-stat {
            position: absolute;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            color: rgba(148, 163, 184, 0.5);
            line-height: 1.4;
            pointer-events: none;
        }
        .stat-tl { top: 20px; left: 20px; text-align: left; }
        .stat-br { bottom: 20px; right: 20px; text-align: right; }
        
        .blinking { animation: blink 2s infinite; }

        /* --- KART TASARIMI --- */
        .guard-card {
            background: rgba(30, 41, 59, 0.7); /* Koyu Cam */
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            padding: 2.5rem; 
            border-radius: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            width: 90%; max-width: 360px; 
            text-align: center;
            z-index: 10;
            position: relative;
        }

        .logo-text {
            font-size: 1.8rem; font-weight: 800; color: #fff; 
            margin-bottom: 0.5rem; letter-spacing: -0.02em;
        }
        
        .logo-sub {
            font-size: 0.75rem; color: #94a3b8; letter-spacing: 0.1em;
            text-transform: uppercase; margin-bottom: 2rem;
        }

        .guard-inp {
            width: 100%; padding: 0.9rem 1rem; margin-bottom: 0.8rem;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 0.75rem;
            background-color: rgba(15, 23, 42, 0.6); 
            color: #e2e8f0 !important; 
            font-size: 0.9rem;
            outline: none; transition: all 0.2s ease;
        }

        .guard-inp:focus { 
            background-color: rgba(15, 23, 42, 0.9);
            border-color: #6366f1; 
            box-shadow: 0 0 0 2px rgba(99,102,241,0.2); 
        }
        
        .guard-btn {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white; width: 100%; padding: 1rem; border: none;
            border-radius: 0.75rem; font-weight: 600; cursor: pointer;
            margin-top: 0.5rem; letter-spacing: 0.03em;
            box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
            transition: all 0.2s;
        }
        
        .guard-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 0 25px rgba(99, 102, 241, 0.6);
        }

        .guard-err { 
            color: #fca5a5; font-size: 0.8rem; margin-bottom: 1rem; 
            display: none;
        }

        /* Animasyonlar */
        @keyframes spin-right { 100% { transform: rotate(360deg); } }
        @keyframes spin-left { 100% { transform: rotate(-360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    `;
    document.head.appendChild(style);

    // 3. HTML Yapısı (Veriler + Halkalar + Form)
    const overlay = document.createElement('div');
    overlay.id = 'optimizi-guard-overlay';
    overlay.innerHTML = `
        <div class="orbit-container">
            <div class="orbit-ring ring-1"></div>
            <div class="orbit-ring ring-2"></div>
            <div class="orbit-ring ring-3"></div>
        </div>

        <div class="tech-stat stat-tl">
            SYSTEM: SECURE<br>
            CORE: OPTIMIZI_V2<br>
            <span class="blinking">STATUS: LOCKED</span>
        </div>

        <div class="tech-stat stat-br">
            CALC_ENGINE: READY<br>
            MEM: 1024MB OK<br>
            ID: 44-XF-92
        </div>

        <div class="guard-card">
            <div class="logo-text">Optimizi.App</div>
            <div class="logo-sub">Engineering Access Portal</div>
            
            <input type="text" id="g_user" class="guard-inp" placeholder="Operator ID" autocomplete="off">
            <input type="password" id="g_pass" class="guard-inp" placeholder="Passcode" autocomplete="new-password">

            <div id="g_err" class="guard-err">Erişim Reddedildi.</div>
            
            <button id="g_btn" class="guard-btn">Sistemi Başlat</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // 4. Mantık
    function attemptLogin() {
        const u = document.getElementById('g_user').value;
        const p = document.getElementById('g_pass').value;
        const err = document.getElementById('g_err');

        if(u === CONFIG.user && p === CONFIG.pass) {
            localStorage.setItem('optimizi_session', '1');
            
            // Çıkış Efekti: Halkalar hızlanıp kaybolsun
            const rings = document.querySelector('.orbit-container');
            rings.style.transition = 'transform 0.8s ease, opacity 0.8s';
            rings.style.transform = 'scale(3) rotate(45deg)'; // İçine giriyormuş gibi efekt
            rings.style.opacity = '0';

            overlay.style.transition = 'opacity 0.6s ease';
            overlay.style.opacity = '0';
            
            setTimeout(() => { 
                overlay.remove(); 
                document.body.style.overflow = 'auto'; // Scroll kilidini aç
            }, 600);
        } else {
            err.style.display = 'block';
            err.innerText = '> ERİŞİM REDDEDİLDİ <';
            
            // Titreme efekti
            document.querySelector('.guard-card').animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, 
                { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }
            ], { duration: 200, iterations: 2 });
            
            document.getElementById('g_pass').value = '';
            document.getElementById('g_pass').focus();
        }
    }

    document.getElementById('g_btn').addEventListener('click', attemptLogin);

    [document.getElementById('g_user'), document.getElementById('g_pass')].forEach(inp => {
        inp.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') attemptLogin();
        });
    });

    setTimeout(() => document.getElementById('g_user').focus(), 100);

})();
