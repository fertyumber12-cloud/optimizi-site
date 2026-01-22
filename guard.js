(function() {
    // --- AYARLAR ---
    const CONFIG = {
        user: "inspro",
        pass: "inspro44", 
        // Logo HTML'ini aşağıda CSS ile hallediyoruz, burası sadece config
    };

    // 1. Zaten giriş yapılmışsa dur
    if (localStorage.getItem('optimizi_session') === '1') {
        return; 
    }

    // 2. CSS - Apple Style & Premium UI
    const style = document.createElement('style');
    style.innerHTML = `
        body { overflow: hidden !important; }
        
        /* Arka Plan: Çok hafif flu */
        #optimizi-guard-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(248, 250, 252, 0.6); 
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 2147483647; 
            display: flex; align-items: center; justify-content: center;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }

        /* APPLE STYLE BUZLU CAM KART */
        .guard-card {
            background: rgba(255, 255, 255, 0.65); /* Daha şeffaf beyaz */
            backdrop-filter: blur(25px) saturate(180%); /* Apple tarzı yoğun blur ve doygunluk */
            -webkit-backdrop-filter: blur(25px) saturate(180%);
            padding: 3rem 2.5rem; 
            border-radius: 1.75rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 
                        0 0 0 1px rgba(255, 255, 255, 0.5) inset; /* İçten ince beyaz çizgi */
            width: 90%; max-width: 380px; 
            text-align: center;
        }

        /* Logo Gradyanı */
        .logo-text {
            font-size: 2rem; font-weight: 800; color: #1e293b; 
            margin-bottom: 2rem; letter-spacing: -0.03em;
        }
        .logo-gradient {
            background: linear-gradient(135deg, #6366f1 0%, #f97316 100%); /* İndigo -> Turuncu */
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* Input Alanları - Yumuşatılmış Siyah */
        .guard-inp {
            width: 100%; 
            padding: 1rem 1.1rem; 
            margin-bottom: 1rem;
            border: 1px solid rgba(0,0,0,0.08); /* Çok silik çerçeve */
            border-radius: 1rem;
            
            /* Yazı Rengi: Simsiyah değil, Koyu Antrasit (#334155) */
            background-color: rgba(255, 255, 255, 0.8); 
            color: #334155 !important; 
            
            font-size: 0.95rem; font-weight: 600;
            outline: none; transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        }

        .guard-inp:focus { 
            background-color: #ffffff;
            border-color: #6366f1; 
            box-shadow: 0 0 0 4px rgba(99,102,241,0.15); 
            transform: translateY(-1px);
        }
        
        .guard-inp::placeholder { color: #94a3b8; font-weight: 500; }

        /* Premium Buton */
        .guard-btn {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); /* Koyu Premium Renk */
            color: white; width: 100%; padding: 1.1rem; border: none;
            border-radius: 1rem; font-weight: 700; font-size: 1rem;
            cursor: pointer; letter-spacing: 0.02em; margin-top: 0.5rem;
            box-shadow: 0 10px 20px -5px rgba(15, 23, 42, 0.3);
            transition: all 0.2s;
            position: relative; overflow: hidden;
        }
        
        /* Buton Hover Efekti */
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

    // 3. HTML Yapısı
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

    // 4. Mantık
    function attemptLogin() {
        const u = document.getElementById('g_user').value;
        const p = document.getElementById('g_pass').value;
        const err = document.getElementById('g_err');

        if(u === CONFIG.user && p === CONFIG.pass) {
            localStorage.setItem('optimizi_session', '1');
            
            // Çıkış Animasyonu
            overlay.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(1.1)'; // Hafif büyüyerek kaybolsun
            
            setTimeout(() => { 
                overlay.remove(); 
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

    // Enter Tuşu
    [document.getElementById('g_user'), document.getElementById('g_pass')].forEach(inp => {
        inp.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') attemptLogin();
        });
    });

    setTimeout(() => document.getElementById('g_user').focus(), 100);

})();
