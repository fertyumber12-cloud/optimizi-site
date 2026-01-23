(function() {
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
        // Oturum açıksa scripti hemen durdur
        if (sessionStorage.getItem('optimizi_session') === '1') return true;

        // Sayaç kontrolü
        let count = parseInt(localStorage.getItem('opt_refresh_count') || '0');
        count++; 
        if (count >= MASTER_CONFIG.refreshLimit) {
            sessionStorage.removeItem('optimizi_session');
            count = 0;
        }
        localStorage.setItem('opt_refresh_count', count);
        
        return false;
    }

    // Eğer zaten giriş yapılıysa hiçbir şey yapma ve çık
    if (checkSessionStatus()) return;

    // Scroll Kilitle (Sadece scrollu kapatıyoruz, görünürlüğü değil)
    document.body.style.overflow = 'hidden'; 
    window.scrollTo(0, 0);

    // --- CSS TASARIM ---
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&display=swap');

        /* Ana Perde */
        #square-guard-root {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            /* Arka plan: Sitenin üstüne yarı saydam siyah perde + Bulanıklık */
            background-color: rgba(10, 10, 10, 0.4); 
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            z-index: 2147483647; /* En üst katman */
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
        }

        /* --- KARE KART --- */
        .square-card {
            width: 340px;
            background: #ffffff; /* Tam beyaz */
            padding: 45px 35px;
            border-radius: 0px; /* Jilet gibi kare */
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            text-align: center;
            position: relative;
        }

        /* Logo */
        .card-logo {
            font-size: 32px; font-weight: 900; color: #0f172a;
            margin-bottom: 35px; letter-spacing: -1px;
        }
        .logo-color { color: #2563eb; } /* .App kısmı mavi */

        /* Inputlar */
        .sq-input {
            width: 100%;
            padding: 16px; margin-bottom: 15px;
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 0px; /* Inputlar da kare */
            color: #334155; font-size: 15px; font-weight: 600;
            outline: none; transition: all 0.2s;
            box-sizing: border-box;
        }
        .sq-input:focus {
            border-color: #0f172a; /* Odaklanınca siyah çerçeve */
            background: #fff;
        }
        .sq-input::placeholder { color: #94a3b8; font-weight: 400; }

        /* Buton */
        .sq-btn {
            width: 100%; padding: 18px;
            margin-top: 10px;
            background: #0f172a; /* Simsiyah buton */
            color: #fff;
            border: none; border-radius: 0px; /* Kare buton */
            font-weight: 700; font-size: 16px; cursor: pointer;
            transition: background 0.2s;
            text-transform: uppercase; letter-spacing: 1px;
        }
        .sq-btn:hover { background: #334155; }

        /* --- DIŞARIDAKİ YAZI --- */
        .external-text {
            margin-top: 30px;
            text-align: center;
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px; line-height: 1.6;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
            font-weight: 500;
        }
        .ext-mail {
            color: #60a5fa; text-decoration: none; font-weight: 700;
        }

        /* Hata Mesajı */
        .err-sq {
            background: #fee2e2; color: #ef4444; 
            font-size: 14px; padding: 12px; margin-bottom: 20px;
            display: none; font-weight: 600; border: 1px solid #fca5a5;
        }
    `;
    document.head.appendChild(style);

    // --- HTML ---
    const overlay = document.createElement('div');
    overlay.id = 'square-guard-root';
    overlay.innerHTML = `
        <div class="square-card" id="main-card">
            <div class="card-logo">Optimizi<span class="logo-color">.App</span></div>

            <div id="sq_err" class="err-sq">Hatalı giriş!</div>

            <input type="text" id="sq_user" class="sq-input" placeholder="Kullanıcı Adı" autocomplete="off">
            <input type="password" id="sq_pass" class="sq-input" placeholder="Şifre" autocomplete="new-password">
            <button id="sq_btn" class="sq-btn">Giriş Yap</button>
        </div>

        <div class="external-text">
            Bu araç özel yetki gerektirmektedir.<br>
            Erişim talebi için: <a href="mailto:contact@optimizi.app" class="ext-mail">contact@optimizi.app</a>
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

            // Çıkış
            overlay.style.transition = 'opacity 0.4s ease';
            overlay.style.opacity = '0';
            
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = 'auto'; // Scrollu aç
            }, 400);

        } else {
            err.style.display = 'block';
            // Titreme
            const card = document.getElementById('main-card');
            card.animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }
            ], { duration: 200 });
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
