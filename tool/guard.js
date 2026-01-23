(function() {
    // --- 1. AYARLAR ---
    const CONFIG = {
        user: "inspro",
        pass: "inspro44"
    };

    // --- 2. KONTROL ---
    if (localStorage.getItem('optimizi_session') === '1') return;

    // Scroll Kilitle
    document.body.style.overflow = 'hidden'; 
    window.scrollTo(0, 0);

    // --- 3. CSS (ECO-TECH SAAS THEME) ---
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap');

        /* Ana Kapsayıcı */
        #eco-guard-root {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: #02040a; /* Ultra Dark Navy */
            z-index: 2147483647;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Manrope', sans-serif;
            overflow: hidden;
        }

        /* --- ARKA PLAN ENERJİ DALGALARI --- */
        .energy-wave {
            position: absolute;
            width: 150%; height: 150%;
            background: radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15), transparent 60%),
                        radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1), transparent 50%);
            animation: pulseWave 10s ease-in-out infinite alternate;
            z-index: 0;
            pointer-events: none;
        }
        
        .grid-overlay {
            position: absolute; width: 100%; height: 100%;
            background-image: 
                linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
            z-index: 1;
        }

        /* --- STATUS BADGES (Sol Üst) --- */
        .sys-status {
            position: absolute; top: 30px; left: 30px; z-index: 10;
            display: flex; gap: 15px;
        }
        .badge {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: #10b981;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
            display: flex; align-items: center; gap: 6px;
            backdrop-filter: blur(4px);
        }
        .dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; animation: blink 2s infinite; }

        /* --- LOGIN PANELİ --- */
        .saas-card {
            position: relative; z-index: 10;
            width: 400px;
            background: rgba(15, 23, 42, 0.6); /* Yarı saydam koyu */
            backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-top: 1px solid rgba(255, 255, 255, 0.15); /* Üstten ışık vurmuş gibi */
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 50px 100px -20px rgba(0,0,0,0.7);
            text-align: center;
            overflow: hidden;
        }

        /* Enerji Çizgisi (Kartın üstünde) */
        .saas-card::before {
            content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
            background: linear-gradient(90deg, transparent, #10b981, transparent);
            animation: scanline 3s linear infinite;
        }

        .brand-area { margin-bottom: 30px; }
        .logo-main {
            font-size: 28px; font-weight: 800; color: #fff;
            letter-spacing: -0.03em;
            display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .logo-icon {
            color: #10b981; /* Optimizi Yeşili */
            font-size: 24px;
        }
        .brand-tag {
            color: #64748b; font-size: 13px; font-weight: 500; margin-top: 5px;
        }

        /* Form Elemanları */
        .input-group { position: relative; margin-bottom: 16px; text-align: left; }
        
        .saas-input {
            width: 100%;
            background: rgba(2, 6, 23, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
            padding: 14px 16px;
            border-radius: 12px;
            font-size: 15px;
            transition: all 0.3s ease;
            outline: none;
            box-sizing: border-box;
        }
        .saas-input:focus {
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
            background: rgba(2, 6, 23, 0.8);
        }
        .saas-input::placeholder { color: #475569; font-weight: 500; }

        .saas-btn {
            width: 100%;
            margin-top: 10px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #fff;
            padding: 16px;
            border: none; border-radius: 12px;
            font-size: 16px; font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.3);
            position: relative; overflow: hidden;
        }
        .saas-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 30px -5px rgba(16, 185, 129, 0.4);
        }
        .saas-btn::after { /* Shine effect */
            content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transform: skewX(-20deg);
            transition: 0.5s;
        }
        .saas-btn:hover::after { left: 150%; transition: 0.7s ease-in-out; }

        .error-msg {
            color: #ef4444; font-size: 13px; margin-bottom: 15px; font-weight: 600;
            display: none; background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 8px;
        }

        /* Animations */
        @keyframes pulseWave { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.1); opacity: 0.8; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes scanline { 0% { left: -100%; } 100% { left: 100%; } }
    `;
    document.head.appendChild(style);

    // --- 4. HTML YAPISI ---
    const overlay = document.createElement('div');
    overlay.id = 'eco-guard-root';
    overlay.innerHTML = `
        <div class="energy-wave"></div>
        <div class="grid-overlay"></div>

        <div class="sys-status">
            <div class="badge"><div class="dot"></div> SYSTEM ONLINE</div>
            <div class="badge" style="border-color: rgba(59, 130, 246, 0.3); color: #60a5fa;">
                ⚡ ENERGY SAVING: ON
            </div>
        </div>

        <div class="saas-card" id="saas-card-box">
            <div class="brand-area">
                <div class="logo-main">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="logo-icon"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>
                    Optimizi.App
                </div>
                <div class="brand-tag">Professional Calculation Engine</div>
            </div>

            <div id="saas-err" class="error-msg">Kimlik doğrulama başarısız.</div>

            <div class="input-group">
                <input type="text" id="s_user" class="saas-input" placeholder="Access ID" autocomplete="off">
            </div>
            <div class="input-group">
                <input type="password" id="s_pass" class="saas-input" placeholder="Secure Key" autocomplete="new-password">
            </div>

            <button id="s_btn" class="saas-btn">Dashboard Giriş</button>
            
            <div style="margin-top: 20px; font-size: 11px; color: #475569;">
                v2.4.1 Stable • Secure Connection
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // --- 5. MANTIK ---
    function tryLogin() {
        const u = document.getElementById('s_user').value.trim();
        const p = document.getElementById('s_pass').value.trim();
        const err = document.getElementById('saas-err');

        if(u === CONFIG.user && p === CONFIG.pass) {
            localStorage.setItem('optimizi_session', '1');
            
            // Başarılı Animasyonu
            const btn = document.getElementById('s_btn');
            btn.innerHTML = 'Doğrulanıyor...';
            btn.style.background = '#10b981';
            
            // Panelin yok oluşu
            const card = document.getElementById('saas-card-box');
            card.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            card.style.transform = 'translateY(20px) scale(0.95)';
            card.style.opacity = '0';
            
            overlay.style.transition = 'opacity 0.6s ease';
            overlay.style.opacity = '0';

            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = 'auto'; // Scroll AÇ
            }, 600);

        } else {
            err.style.display = 'block';
            document.getElementById('s_pass').value = '';
            
            // Profesyonel titreme efekti
            const card = document.getElementById('saas-card-box');
            card.animate([
                { transform: 'translate(0, 0)' },
                { transform: 'translate(-4px, 0)' },
                { transform: 'translate(4px, 0)' },
                { transform: 'translate(0, 0)' }
            ], { duration: 250 });
            
            document.getElementById('s_pass').focus();
        }
    }

    document.getElementById('s_btn').addEventListener('click', tryLogin);
    
    ['s_user', 's_pass'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if(e.key === 'Enter') tryLogin();
        });
    });

    setTimeout(() => document.getElementById('s_user').focus(), 100);

})();
