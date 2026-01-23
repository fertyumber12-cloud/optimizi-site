(function() {
    // --- 1. GÜVENLİK DUVARI (ANTI-FLASH / BYPASS ENGELLEYİCİ) ---
    // Bu kod daha en başta çalıştığı için siteyi anında görünmez yapar.
    // Hızlı yenileseler bile içerik asla "flash" yapıp görünmez.
    const securityStyle = document.createElement('style');
    securityStyle.innerHTML = `
        html, body { 
            visibility: hidden !important; 
            background: #f8fafc !important; /* Arkada boş gri bir renk olsun */
        }
        /* Sadece bizim login ekranımız görünür olacak */
        #optimizi-guard-overlay { 
            visibility: visible !important; 
        }
    `;
    document.head.appendChild(securityStyle);

    // --- AYARLAR ---
    const MASTER_CONFIG = {
        user: "inspro",
        pass: "inspro44"
    };

    // --- GÜNLÜK DENEME ŞİFRESİ MANTIĞI ---
    function getTrialCredentials() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return { 
            user: "deneme", 
            pass: "deneme" + day + month // Örn: deneme2301
        };
    }

    // --- OTURUM KONTROLÜ ---
    // Eğer daha önce giriş yapılmışsa kilidi hemen aç
    if (localStorage.getItem('optimizi_session') === '1') {
        securityStyle.remove(); // Gizlemeyi kaldır
        document.body.style.visibility = 'visible';
        return; 
    }

    // --- TASARIM (APPLE STYLE & PREMIUM UI) ---
    // (Senin sevdiğin o orijinal tasarım kodları)
    const style = document.createElement('style');
    style.innerHTML = `
        /* Scroll'u kilitle */
        body { overflow: hidden !important; }
        
        /* Arka Plan */
        #optimizi-guard-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(248, 250, 252, 0.8); /* Biraz daha opak yaptım ki site görünmesin */
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 2147483647; 
            display: flex; align-items: center; justify-content: center;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            opacity: 0; animation: fadeIn 0.4s forwards; /* Yumuşak giriş */
        }

        @keyframes fadeIn { to { opacity: 1; } }

        /* KART TASARIMI */
        .guard-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(30px) saturate(180%);
            -webkit-backdrop-filter: blur(30px) saturate(180%);
            padding: 3rem 2.5rem; 
            border-radius: 1.75rem;
            box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.15), 
                        0 0 0 1px rgba(255, 255, 255, 0.6) inset;
            width: 90%; max-width: 380px; 
            text-align: center;
        }

        .logo-text {
            font-size: 2rem; font-weight: 800; color: #1e293b; 
            margin-bottom: 2rem; letter-spacing: -0.03em;
        }
        .logo-gradient {
            background: linear-gradient(135deg, #6366f1 0%, #f97316 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .guard-inp {
            width: 100%; padding: 1rem 1.1rem; margin-bottom: 1rem;
            border: 1px solid rgba(0,0,0,0.08); border-radius: 1rem;
            background-color: rgba(255, 255, 255, 0.6); 
            color: #334155 !important; font-size: 0.95rem; font-weight: 600;
            outline: none; transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
            box-sizing: border-box;
        }
        .guard-inp:focus { 
            background-color: #ffffff; border-color: #6366f1; 
            box-shadow: 0 0 0 4px rgba(99,102,241,0.15); transform: translateY(-1px);
        }
        .guard-inp::placeholder { color: #94a3b8; font-weight: 500; }

        .guard-btn {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white; width: 100%; padding: 1.1rem; border: none;
            border-radius: 1rem; font-weight: 700; font-size: 1rem;
            cursor: pointer; letter-spacing: 0.02em; margin-top: 0.5rem;
            box-shadow: 0 10px 20px -5px rgba(15, 23, 42, 0.3);
            transition: all 0.2s;
        }
        .guard-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 25px -5px rgba(15, 23, 42, 0.4);
            background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
        }
        .guard-btn:active { transform: scale(0.98); }

        .guard-err { 
            color: #dc2626; background: rgba(254, 226, 226, 0.6); 
            padding: 0.8rem; border-radius: 0.75rem; font-size: 0.85rem;
            font-weight: 600; margin-bottom: 1.5rem; display: none;
            backdrop-filter: blur(4px);
        }
    `;
    document.head.appendChild(style);

    // --- HTML YAPISI ---
    const overlay = document.createElement('div');
    overlay.id = 'optimizi-guard-overlay';
    overlay.innerHTML = `
        <div class="guard-card">
            <div class="logo-text">
                Optimizi<span class="logo-gradient">.App</span>
            </div>
            
            <div>
                <input type="text" id="g_user" class="guard-inp" placeholder="Kullanıcı Adı" autocomplete="off">
                <input type="password" id="g_pass" class="guard-inp" placeholder="Şifre" autocomplete="new-password">
            </div>

            <div id="g_err" class="guard-err">Hatalı giriş yaptınız.</div>
            
            <button id="g_btn" class="guard-btn">Giriş Yap</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // --- MANTIK ---
    function attemptLogin() {
        const u = document.getElementById('g_user').value.trim();
        const p = document.getElementById('g_pass').value.trim();
        const err = document.getElementById('g_err');

        // Günlük Deneme Bilgilerini Al
        const TRIAL = getTrialCredentials();
        
        // Konsolda şifreyi görebilirsin (Test için)
        console.log("Bugünün Deneme Şifresi:", TRIAL.pass);

        // KONTROL: Ana hesap VEYA Deneme hesabı
        const isMaster = (u === MASTER_CONFIG.user && p === MASTER_CONFIG.pass);
        const isTrial = (u === TRIAL.user && p === TRIAL.pass);

        if(isMaster || isTrial) {
            localStorage.setItem('optimizi_session', '1');
            
            // Çıkış Animasyonu
            overlay.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(1.05)'; 
            
            setTimeout(() => { 
                overlay.remove(); 
                
                // *** KRİTİK NOKTA ***
                // Giriş başarılı olunca güvenlik duvarını (cssHide) kaldırıyoruz
                securityStyle.remove();
                document.body.style.visibility = 'visible'; 
                document.body.style.overflow = 'auto'; 
            }, 500);

        } else {
            err.style.display = 'block';
            // Sallanma efekti
            document.querySelector('.guard-card').animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, 
                { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }
            ], { duration: 300 });
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
