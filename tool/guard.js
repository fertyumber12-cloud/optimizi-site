(function() {
    // --- 1. GÜVENLİK (ANTI-FLASH) ---
    // Sayfa yüklenirken beyaz patlamayı ve içeriğin görünmesini engeller
    const cssHide = document.createElement('style');
    cssHide.innerHTML = `
        html, body { visibility: hidden !important; background: #0f172a !important; }
        #glass-guard-root { visibility: visible !important; }
    `;
    document.head.appendChild(cssHide);

    // --- AYARLAR ---
    const MASTER_CONFIG = {
        user: "inspro",
        pass: "inspro44",
        refreshLimit: 3
    };

    // --- DENEME HESABI ---
    function getTrialCredentials() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return { user: "deneme", pass: "deneme" + day + month };
    }

    // --- SAYAÇ & OTURUM KONTROLÜ ---
    function checkSessionStatus() {
        let count = parseInt(localStorage.getItem('opt_refresh_count') || '0');
        count++; 
        if (count >= MASTER_CONFIG.refreshLimit) {
            sessionStorage.removeItem('optimizi_session');
            count = 0;
        }
        localStorage.setItem('opt_refresh_count', count);

        const isLoggedIn = sessionStorage.getItem('optimizi_session') === '1';
        if (isLoggedIn) {
            cssHide.remove(); 
            document.body.style.visibility = 'visible';
            return true; 
        }
        return false; 
    }

    if (checkSessionStatus()) return;

    // Kilit
    document.body.style.overflow = 'hidden'; 
    window.scrollTo(0, 0);

    // --- TASARIM (GLASSMORPHISM & NEBULA) ---
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');

        #glass-guard-root {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            /* Arka planı hafif karartıyoruz ki cam etkisi belli olsun */
            background-color: rgba(15, 23, 42, 0.6); 
            backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            z-index: 2147483647;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Poppins', sans-serif;
            visibility: visible !important;
            overflow: hidden;
        }

        /* --- ARKA PLAN IŞIKLARI (ORBS) --- */
        .orb {
            position: absolute; border-radius: 50%;
            filter: blur(80px); z-index: 0; opacity: 0.6;
            animation: orbFloat 10s infinite alternate;
        }
        .orb-1 {
            width: 300px; height: 300px;
            background: linear-gradient(#6366f1, #a855f7); /* Mor-Mavi */
            top: 20%; left: 30%;
        }
        .orb-2 {
            width: 250px; height: 250px;
            background: linear-gradient(#ec4899, #f43f5e); /* Pembe-Kırmızı */
            bottom: 20%; right: 30%;
            animation-delay: -5s;
        }

        /* --- CAM KART --- */
        .glass-card {
            position: relative; z-index: 10;
            width: 360px;
            padding: 50px 40px;
            
            /* GLASS EFFECT */
            background: rgba(255, 255, 255, 0.1); /* Çok şeffaf beyaz */
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.4); /* Üstten ışık vurmuş gibi */
            border-left: 1px solid rgba(255, 255, 255, 0.4);
            
            border-radius: 30px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
            text-align: center;
            color: #fff;
        }

        .logo-text {
            font-size: 32px; font-weight: 600; margin-bottom: 5px; letter-spacing: 1px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        .logo-sub {
            font-size: 13px; font-weight: 300; opacity: 0.8; margin-bottom: 40px; letter-spacing: 0.5px;
        }

        /* Input Alanları */
        .input-group {
            position: relative; margin-bottom: 20px;
        }
        .input-icon {
            position: absolute; top: 50%; left: 20px;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.7);
            width: 20px; height: 20px;
        }
        .glass-inp {
            width: 100%;
            padding: 16px 20px 16px 50px; /* İkon için soldan boşluk */
            background: rgba(0, 0, 0, 0.2); /* Hafif karartma */
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 50px; /* Tam yuvarlak */
            color: #fff;
            font-size: 15px; font-family: inherit;
            outline: none; transition: all 0.3s ease;
            box-sizing: border-box;
        }
        .glass-inp::placeholder { color: rgba(255, 255, 255, 0.5); }
        .glass-inp:focus {
            background: rgba(0, 0, 0, 0.4);
            border-color: rgba(255, 255, 255, 0.5);
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
        }

        /* Buton */
        .glass-btn {
            width: 100%;
            padding: 16px; margin-top: 10px;
            border: none; border-radius: 50px;
            background: linear-gradient(90deg, #8b5cf6, #ec4899); /* Mor Gradient */
            color: white; font-size: 16px; font-weight: 600;
            cursor: pointer; letter-spacing: 1px;
            box-shadow: 0 5px 15px rgba(139, 92, 246, 0.4);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .glass-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(139, 92, 246, 0.6);
        }
        .glass-btn:active { transform: scale(0.98); }

        /* Footer */
        .footer-txt {
            margin-top: 30px; font-size: 12px; color: rgba(255, 255, 255, 0.6); line-height: 1.6;
        }
        .footer-link {
            color: #fff; font-weight: 500; text-decoration: none;
            border-bottom: 1px dashed rgba(255,255,255,0.4);
            padding-bottom: 2px;
        }
        
        /* Hata Mesajı */
        .err-glass {
            background: rgba(220, 38, 38, 0.25);
            border: 1px solid rgba(239, 68, 68, 0.5);
            color: #fca5a5; font-size: 13px; padding: 12px;
            border-radius: 15px; margin-bottom: 20px;
            display: none; backdrop-filter: blur(5px);
        }

        @keyframes orbFloat { 0% { transform: translate(0, 0); } 100% { transform: translate(30px, -30px); } }
    `;
    document.head.appendChild(style);

    // --- HTML ---
    const overlay = document.createElement('div');
    overlay.id = 'glass-guard-root';
    overlay.innerHTML = `
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>

        <div class="glass-card" id="glass-card">
            <div class="logo-text">Giriş Yap</div>
            <div class="logo-sub">Optimizi.App Hesaplama Aracı</div>

            <div id="g_err" class="err-glass">Hatalı kullanıcı adı veya şifre.</div>

            <div class="input-group">
                <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input type="text" id="g_user" class="glass-inp" placeholder="Kullanıcı Adı" autocomplete="off">
            </div>

            <div class="input-group">
                <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input type="password" id="g_pass" class="glass-inp" placeholder="Şifre" autocomplete="new-password">
            </div>

            <button id="g_btn" class="glass-btn">GİRİŞ</button>

            <div class="footer-txt">
                Bu araç özel yetki gerektirir.<br>
                Erişim için: <a href="mailto:contact@optimizi.app" class="footer-link">contact@optimizi.app</a>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // --- MANTIK ---
    function doLogin() {
        const u = document.getElementById('g_user').value.trim();
        const p = document.getElementById('g_pass').value.trim();
        const err = document.getElementById('g_err');

        const TRIAL_CONFIG = getTrialCredentials();
        console.log("Deneme Şifresi:", TRIAL_CONFIG.pass); // Test için

        const isMaster = (u === MASTER_CONFIG.user && p === MASTER_CONFIG.pass);
        const isTrial = (u === TRIAL_CONFIG.user && p === TRIAL_CONFIG.pass);

        if(isMaster || isTrial) {
            sessionStorage.setItem('optimizi_session', '1');
            localStorage.setItem('opt_refresh_count', '0');

            // Çıkış Animasyonu
            const card = document.getElementById('glass-card');
            card.style.transition = 'all 0.5s ease';
            card.style.transform = 'scale(0.9) translateY(-20px)';
            card.style.opacity = '0';
            
            overlay.style.transition = 'opacity 0.6s ease';
            overlay.style.opacity = '0';

            setTimeout(() => {
                overlay.remove();
                cssHide.remove();
                document.body.style.overflow = 'auto';
                document.body.style.visibility = 'visible';
            }, 600);

        } else {
            err.style.display = 'block';
            const card = document.getElementById('glass-card');
            card.animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
                { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }
            ], { duration: 300 });
            document.getElementById('g_pass').value = '';
            document.getElementById('g_pass').focus();
        }
    }

    document.getElementById('g_btn').addEventListener('click', doLogin);
    ['g_user', 'g_pass'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if(e.key === 'Enter') doLogin();
        });
    });

    setTimeout(() => document.getElementById('g_user').focus(), 100);

})();
