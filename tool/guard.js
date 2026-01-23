(function() {
    // --- 1. GÜVENLİK YAMASI (ANTI-FLASH) ---
    // Kod çalışır çalışmaz sayfayı komple görünmez yapıyoruz.
    // Böylece JS yüklenene kadar kimse içeriği göremez.
    const cssHide = document.createElement('style');
    cssHide.innerHTML = `
        html, body { visibility: hidden !important; background: #0f172a !important; }
        #data-guard-root { visibility: visible !important; }
    `;
    document.head.appendChild(cssHide);

    // --- AYARLAR ---
    const MASTER_CONFIG = {
        user: "inspro",
        pass: "inspro44",
        refreshLimit: 3 // Kaç yenilemede bir şifre sorsun?
    };

    // --- SAYAÇ & OTURUM MANTIĞI ---
    function checkSessionStatus() {
        // 1. Sayaç Kontrolü
        let count = parseInt(localStorage.getItem('opt_refresh_count') || '0');
        count++; // Her yenilemede artır
        
        console.log("Yenileme Sayısı:", count);

        if (count >= MASTER_CONFIG.refreshLimit) {
            // Limit dolduysa oturumu öldür ve sayacı sıfırla
            sessionStorage.removeItem('optimizi_session');
            count = 0;
        }
        
        // Yeni sayacı kaydet
        localStorage.setItem('opt_refresh_count', count);

        // 2. Oturum Kontrolü (SessionStorage kullanıyoruz artık)
        const isLoggedIn = sessionStorage.getItem('optimizi_session') === '1';

        if (isLoggedIn) {
            // Giriş yapılmışsa gizlemeyi kaldır ve bitir
            cssHide.remove(); 
            document.body.style.visibility = 'visible';
            return true; // Giriş yapılı
        }
        
        return false; // Giriş gerekli
    }

    // --- DENEME HESABI ---
    function getTrialCredentials() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return { user: "deneme", pass: "deneme" + day + month };
    }

    // --- BAŞLATMA ---
    // Eğer giriş yapılmışsa durdur, yapılmamışsa devam et
    if (checkSessionStatus()) return;

    // Scroll Kilitleme
    document.body.style.overflow = 'hidden'; 
    window.scrollTo(0, 0);

    // --- STİL ---
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        /* Ana Kapsayıcı - Görünürlük kilidini aşmak için visible atadık */
        #data-guard-root {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(240, 244, 248, 0.8); /* Hafif opak */
            backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            z-index: 2147483647;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
            visibility: visible !important; /* ÖNEMLİ: Body gizlense bile bu görünür */
            opacity: 0; animation: fadeIn 0.3s forwards; /* Yumuşak giriş */
        }

        @keyframes fadeIn { to { opacity: 1; } }

        /* ... Kalan Tasarım Kodları Aynı ... */
        .floating-obj {
            position: absolute; opacity: 0.5; z-index: 0;
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

        .login-card {
            position: relative; z-index: 10;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(40px) saturate(150%);
            border: 2px solid #ffffff;
            box-shadow: 
                0 30px 60px -12px rgba(0, 0, 0, 0.25), 
                0 0 0 1px rgba(0, 0, 0, 0.05),
                inset 0 1px 1px rgba(255,255,255,1);
            padding: 45px; border-radius: 32px; width: 380px; text-align: center;
            transition: all 0.3s ease;
        }
        .login-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 40px 80px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05);
        }

        .logo-area { margin-bottom: 50px; }
        .logo-text { font-size: 30px; font-weight: 900; color: #0f172a; letter-spacing: -0.04em; }
        .logo-grad {
            background: linear-gradient(135deg, #2563eb 0%, #f97316 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .logo-sub { font-size: 14px; color: #64748b; font-weight: 600; margin-top: 6px; }

        .inp-field {
            width: 100%; padding: 16px 18px; margin-bottom: 14px;
            border: 2px solid #e2e8f0; background: #f8fafc; border-radius: 16px;
            font-size: 16px; font-weight: 500; color: #334155; outline: none; transition: all 0.2s;
            box-sizing: border-box;
        }
        .inp-field:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15); }
        .inp-field::placeholder { color: #94a3b8; font-weight: 400; }

        .btn-submit {
            width: 100%; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white; padding: 18px; border: none; border-radius: 16px; font-size: 17px; font-weight: 700;
            cursor: pointer; margin-top: 12px; transition: all 0.2s;
            box-shadow: 0 10px 20px -10px rgba(15, 23, 42, 0.5);
        }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -10px rgba(15, 23, 42, 0.6); }
        .btn-submit:active { transform: scale(0.98); }

        .contact-box {
            margin-top: 28px; padding-top: 24px; border-top: 2px solid #f1f5f9;
            font-size: 14px; color: #64748b; line-height: 1.6; font-weight: 500;
        }
        .contact-mail { display: block; color: #2563eb; font-weight: 700; text-decoration: none; margin-top: 4px; }
        
        .err-msg {
            color: #d32f2f; font-size: 14px; margin-bottom: 20px; 
            font-weight: 600; display: none; background: #ffebee; padding: 12px; border-radius: 12px; border: 1px solid #ffcdd2;
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
        <div class="floating-obj chart-bar-group"><div class="c-bar cb-1"></div><div class="c-bar cb-2"></div><div class="c-bar cb-3"></div></div>
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
                Bu araç özel erişim gerektirir.<br>Erişim talebi için:
                <span class="contact-mail">contact@optimizi.app</span>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // --- GİRİŞ MANTIĞI ---
    function doLogin() {
        const uInput = document.getElementById('l_user').value.trim();
        const pInput = document.getElementById('l_pass').value.trim();
        const err = document.getElementById('l_err');

        const TRIAL_CONFIG = getTrialCredentials();
        console.log("Bugünün Deneme Şifresi:", TRIAL_CONFIG.pass);

        const isMaster = (uInput === MASTER_CONFIG.user && pInput === MASTER_CONFIG.pass);
        const isTrial = (uInput === TRIAL_CONFIG.user && pInput === TRIAL_CONFIG.pass);

        if(isMaster || isTrial) {
            // BAŞARILI:
            sessionStorage.setItem('optimizi_session', '1'); // Oturumu kaydet
            localStorage.setItem('opt_refresh_count', '0'); // Sayacı sıfırla

            // Animasyonlu Çıkış
            const box = document.getElementById('lc-box');
            box.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            box.style.transform = 'translateY(-30px) scale(0.95)';
            box.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';

            setTimeout(() => {
                overlay.remove();
                cssHide.remove(); // Gizleme stilini kaldır
                document.body.style.overflow = 'auto'; // Scroll aç
                document.body.style.visibility = 'visible'; // İçeriği göster
            }, 500);

        } else {
            // HATALI
            err.style.display = 'block';
            const box = document.getElementById('lc-box');
            box.animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
                { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }
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
