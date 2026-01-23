(function() {
    // --- 1. GÜVENLİK (ANTI-FLASH & GİZLEME) ---
    const cssHide = document.createElement('style');
    cssHide.innerHTML = `
        html, body { visibility: hidden !important; background: #0f172a !important; }
        #square-guard-root { visibility: visible !important; }
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

    // --- OTURUM KONTROLÜ ---
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

    // Scroll Kilitle
    document.body.style.overflow = 'hidden'; 
    window.scrollTo(0, 0);

    // --- CSS TASARIM ---
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

        /* Ana Kapsayıcı: Tam Ekran */
        #square-guard-root {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            /* Arka planın buğulu görünmesi için */
            background-color: rgba(15, 23, 42, 0.4); 
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            z-index: 2147483647;
            display: flex; flex-direction: column; /* Alt alta dizmek için */
            align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
            visibility: visible !important;
        }

        /* --- KARE LOGIN KARTI --- */
        .square-card {
            width: 320px; /* Biraz daha kompakt */
            padding: 40px;
            
            /* Koyu ve Şeffaf Cam */
            background: rgba(30, 41, 59, 0.75); 
            border: 1px solid rgba(255, 255, 255, 0.1);
            /* Kare Formu: Radius düşük */
            border-radius: 12px; 
            
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
            margin-bottom: 25px; /* Alttaki yazı ile mesafe */
            
            /* Hafif parlama efekti */
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
        }

        /* Logo Stili */
        .card-logo {
            font-size: 28px; font-weight: 800; color: #fff;
            margin-bottom: 30px; letter-spacing: -0.5px;
        }
        .logo-grad {
            background: linear-gradient(135deg, #60a5fa 0%, #f472b6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* Inputlar */
        .sq-input {
            width: 100%;
            padding: 14px; margin-bottom: 12px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px; /* Inputlar da kareye yakın */
            color: #fff; font-size: 14px;
            outline: none; transition: all 0.2s;
            box-sizing: border-box;
        }
        .sq-input:focus {
            border-color: #60a5fa;
            background: rgba(0, 0, 0, 0.5);
            box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
        }
        .sq-input::placeholder { color: rgba(255, 255, 255, 0.4); }

        /* Buton */
        .sq-btn {
            width: 100%; padding: 14px;
            margin-top: 8px;
            background: #fff; color: #0f172a; /* Zıt renk: Beyaz buton, koyu yazı */
            border: none; border-radius: 6px;
            font-weight: 700; font-size: 14px; cursor: pointer;
            transition: transform 0.1s;
        }
        .sq-btn:hover { background: #f1f5f9; }
        .sq-btn:active { transform: scale(0.98); }

        /* --- DIŞARIDAKİ YAZI ALANI --- */
        .external-info {
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 13px; line-height: 1.6;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5); /* Okunabilirlik için gölge */
        }
        .ext-link {
            color: #60a5fa; text-decoration: none; font-weight: 600;
        }
        .ext-link:hover { text-decoration: underline; }

        /* Hata Mesajı */
        .err-sq {
            background: rgba(220, 38, 38, 0.2);
            color: #fca5a5; font-size: 13px; padding: 10px;
            border-radius: 6px; margin-bottom: 15px;
            display: none; border: 1px solid rgba(239, 68, 68, 0.3);
        }
    `;
    document.head.appendChild(style);

    // --- HTML YAPISI ---
    const overlay = document.createElement('div');
    overlay.id = 'square-guard-root';
    overlay.innerHTML = `
        <div class="square-card" id="main-card">
            <div class="card-logo">Optimizi<span class="logo-grad">.App</span></div>

            <div id="sq_err" class="err-sq">Hatalı giriş bilgisi.</div>

            <input type="text" id="sq_user" class="sq-input" placeholder="Kullanıcı Adı" autocomplete="off">
            <input type="password" id="sq_pass" class="sq-input" placeholder="Şifre" autocomplete="new-password">

            <button id="sq_btn" class="sq-btn">GİRİŞ YAP</button>
        </div>

        <div class="external-info">
            Bu araç özel yetki gerektirmektedir.<br>
            Erişim talebi için: <a href="mailto:contact@optimizi.app" class="ext-link">contact@optimizi.app</a>
        </div>
    `;
    document.body.appendChild(overlay);

    // --- MANTIK ---
    function doLogin() {
        const u = document.getElementById('sq_user').value.trim();
        const p = document.getElementById('sq_pass').value.trim();
        const err = document.getElementById('sq_err');

        const TRIAL = getTrialCredentials();
        console.log("Deneme:", TRIAL.pass);

        const isMaster = (u === MASTER_CONFIG.user && p === MASTER_CONFIG.pass);
        const isTrial = (u === TRIAL.user && p === TRIAL.pass);

        if(isMaster || isTrial) {
            sessionStorage.setItem('optimizi_session', '1');
            localStorage.setItem('opt_refresh_count', '0');

            // Çıkış: Hem kart hem alttaki yazı yok olsun
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';

            // Kart hafif yukarı kaysın
            document.getElementById('main-card').style.transform = 'translateY(-20px)';
            document.getElementById('main-card').style.transition = 'transform 0.5s';

            setTimeout(() => {
                overlay.remove();
                cssHide.remove();
                document.body.style.overflow = 'auto';
                document.body.style.visibility = 'visible';
            }, 500);

        } else {
            err.style.display = 'block';
            // Titreme efekti
            const card = document.getElementById('main-card');
            card.animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }
            ], { duration: 250 });
            document.getElementById('sq_pass').value = '';
            document.getElementById('sq_pass').focus();
        }
    }

    document.getElementById('sq_btn').addEventListener('click', doLogin);
    ['sq_user', 'sq_pass'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if(e.key === 'Enter') doLogin();
        });
    });

    setTimeout(() => document.getElementById('sq_user').focus(), 100);

})();
