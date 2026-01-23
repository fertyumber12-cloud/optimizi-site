(function() {
    // --- AYARLAR ---
    const MASTER_CONFIG = {
        user: "inspro",
        pass: "inspro44"
    };

    // --- DENEME HESABI MANTIĞI ---
    function getTrialCredentials() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0'); 
        
        return {
            user: "deneme",
            pass: "deneme" + day + month 
        };
    }

    // --- KONTROL ---
    if (localStorage.getItem('optimizi_session') === '1') return;

    // Scroll Kilitleme
    document.body.style.overflow = 'hidden'; 
    window.scrollTo(0, 0);

    // --- STİL ---
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        /* Ana Kapsayıcı */
        #data-guard-root {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(255, 255, 255, 0.65);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            z-index: 2147483647;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        }

        /* --- ARKA PLAN SÜZÜLEN GRAFİKLER --- */
        .floating-obj {
            position: absolute; opacity: 0.6; z-index: 0;
            filter: drop-shadow(0 10px 15px rgba(0,0,0,0.05));
            animation: floatAnim 8s ease-in-out infinite;
        }

        .chart-pie {
            width: 120px; height: 120px; border-radius: 50%;
            background: conic-gradient(#3b82f6 0% 30%, #f97316 30% 70%, #e2e8f0 70% 100%);
            top: 15%; left: 10%; animation-delay: 0s;
        }
        .chart-pie::after {
            content: ''; position: absolute; width: 60%; height: 60%; 
            background: rgba(255,255,255,0.8); border-radius: 50%; top: 20%; left: 20%;
        }

        .chart-bar-group {
            display: flex; align-items: flex-end; gap: 8px;
            bottom: 15%; left: 15%; width: 140px; height: 100px; animation-delay: 2s;
        }
        .c-bar { width: 30px; border-radius: 4px 4px 0 0; }
        .cb-1 { height: 40%; background: #cbd5e1; }
        .cb-2 { height: 80%; background: #3b82f6; }
        .cb-3 { height: 60%; background: #94a3b8; }

        .chart-line-loss {
            top: 20%; right: 10%; width: 160px; height: 100px;
            background: rgba(255, 255, 255, 0.5); border-radius: 12px;
            padding: 10px; display: flex; align-items: center; justify-content: center;
            border: 1px solid rgba(0,0,0,0.05); animation-delay: 4s;
        }
        .loss-svg { width: 100%; height: 100%; color: #ef4444; }

        /* --- LOGIN KARTI --- */
        .login-card {
            position: relative; z-index: 10;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 1);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.03);
            padding: 40px; border-radius: 24px; width: 380px; text-align: center;
        }

        .logo-area { 
            /* BURAYI DEĞİŞTİRDİM: Aradaki boşluğu artırdım */
            margin-bottom: 60px; 
        }
        
        .logo-text { font-size: 28px; font-weight: 800; color: #1e293b; letter-spacing: -0.04em; }
        .logo-grad {
            background: linear-gradient(135deg, #2563eb 0%, #f97316 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .logo-sub { font-size: 13px; color: #64748b; font-weight: 500; margin-top: 4px; }

        .inp-field {
            width: 100%; padding: 14px 16px; margin-bottom: 12px;
            border: 1px solid #e2e8f0; background: #fff; border-radius: 12px;
            font-size: 15px; color: #334155; outline: none; transition: all 0.2s;
            box-sizing: border-box;
        }
        .inp-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .inp-field::placeholder { color: #94a3b8; }

        .btn-submit {
            width: 100%; background: #0f172a; color: white; padding: 16px;
            border: none; border-radius: 12px; font-size: 16px; font-weight: 600;
            cursor: pointer; margin-top: 10px; transition: transform 0.1s;
        }
        .btn-submit:active { transform: scale(0.98); }

        .contact-box {
            margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9;
            font-size: 13px; color: #64748b; line-height: 1.5;
        }
        .contact-mail { display: block; color: #3b82f6; font-weight: 600; text-decoration: none; margin-top: 2px; }
        
        .err-msg {
            color: #ef4444; font-size: 13px; margin-bottom: 15px; 
            font-weight: 600; display: none; background: #fef2f2; padding: 10px; border-radius: 8px;
        }

        @keyframes floatAnim {
            0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); }
        }
    `;
    document.head.appendChild(style);

    // --- HTML ---
    const overlay = document.createElement('div');
    overlay.id = 'data-guard-root';
    overlay.innerHTML = `
        <div class="floating-obj chart-pie"></div>
        <div class="floating-obj chart-bar-group">
            <div class="c-bar cb-1"></div><div class="c-bar cb-2"></div><div class="c-bar cb-3"></div>
        </div>
        <div class="floating-obj chart-line-loss">
            <svg class="loss-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19l-9-9-4 4-5.5-5.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19 9h3v10" stroke-linecap="round"/>
            </svg>
        </div>

        <div class="login-card" id="lc-box">
            <div class="logo-area">
                <div class="logo-text">Optimizi<span class="logo-grad">.App</span></div>
                <div class="logo-sub">Gelişmiş Hesaplama & Analiz Aracı</div>
            </div>

            <div id="l_err" class="err-msg">Kullanıcı adı veya şifre hatalı!</div>

            <input type="text" id="l_user" class="inp-field" placeholder="Kullanıcı Adı" autocomplete="off">
            <input type="password" id="l_pass" class="inp-field" placeholder="Şifre" autocomplete="new-password">

            <button id="l_btn" class="btn-submit">Giriş Yap</button>

            <div class="contact-box">
                Bu araç özel erişim gerektirir.<br>
                Erişim talebi için:
                <span class="contact-mail">contact@optimizi.app</span>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // --- MANTIK ---
    function doLogin() {
        const uInput = document.getElementById('l_user').value.trim();
        const pInput = document.getElementById('l_pass').value.trim();
        const err = document.getElementById('l_err');

        const TRIAL_CONFIG = getTrialCredentials();
        // Test amaçlı konsola yazdırma (İstersen kaldırabilirsin)
        console.log("Bugünün Deneme Şifresi:", TRIAL_CONFIG.pass);

        const isMaster = (uInput === MASTER_CONFIG.user && pInput === MASTER_CONFIG.pass);
        const isTrial = (uInput === TRIAL_CONFIG.user && pInput === TRIAL_CONFIG.pass);

        if(isMaster || isTrial) {
            localStorage.setItem('optimizi_session', '1');
            
            const box = document.getElementById('lc-box');
            box.style.transition = 'all 0.5s ease';
            box.style.transform = 'translateY(-20px)';
            box.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';

            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = 'auto'; 
            }, 500);

        } else {
            err.style.display = 'block';
            const box = document.getElementById('lc-box');
            box.animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }
            ], { duration: 300 });

            document.getElementById('l_pass').value = '';
            document.getElementById('l_pass').focus();
        }
    }

    document.getElementById('l_btn').addEventListener('click', doLogin);
    ['l_user', 'l_pass'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if(e.key === 'Enter') doLogin();
        });
    });

    setTimeout(() => document.getElementById('l_user').focus(), 100);

})();
