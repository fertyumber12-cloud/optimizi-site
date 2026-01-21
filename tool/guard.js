(function() {
    // --- AYARLAR ---
    const CONFIG = {
        user: "inspro",
        pass: "inspro4455", 
        title: "Optimizi<span style='color:#6366f1'>.App</span>"
    };

    // 1. Zaten giriş yapılmış mı kontrol et
    if (localStorage.getItem('optimizi_session') === '1') {
        return; 
    }

    // 2. CSS Stillerini Oluştur
    const style = document.createElement('style');
    style.innerHTML = `
        /* Sayfa scroll olmasın */
        body { overflow: hidden !important; }
        
        /* BUZLU CAM ARKA PLAN KATMANI */
        #optimizi-guard-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            
            /* Arka planı yarı saydam beyaz yapıyoruz */
            background-color: rgba(255, 255, 255, 0.4); 
            
            /* Arkadaki her şeyi flulaştırır (Buzlu Cam Efekti) */
            backdrop-filter: blur(15px); 
            -webkit-backdrop-filter: blur(15px); /* Safari için */
            
            z-index: 2147483647; 
            display: flex; align-items: center; justify-content: center;
            font-family: system-ui, -apple-system, sans-serif;
        }

        /* Ortadaki Kart */
        .guard-card {
            background: #ffffff; /* Kartın kendisi net beyaz olsun */
            padding: 3rem; 
            border-radius: 1.5rem;
            /* Derin gölge verelim ki havada durduğu belli olsun */
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); 
            border: 1px solid rgba(255, 255, 255, 0.5);
            width: 90%; max-width: 420px; 
            text-align: center;
        }

        /* Input Alanları - NET GÖRÜNÜM AYARI */
        .guard-inp {
            width: 100%; 
            padding: 0.9rem 1rem; 
            margin-top: 0.5rem; 
            margin-bottom: 1.25rem;
            border: 2px solid #e2e8f0; /* Çerçeveyi biraz kalınlaştırdım */
            border-radius: 0.75rem;
            
            /* Yazı ve Zemin Rengi - KESİN GÖRÜNÜR */
            background-color: #ffffff !important; 
            color: #000000 !important; 
            
            font-size: 1rem; /* Yazıyı biraz büyüttüm */
            font-weight: 600;
            outline: none; 
            transition: all 0.2s ease;
        }

        .guard-inp:focus { 
            border-color: #6366f1; 
            box-shadow: 0 0 0 4px rgba(99,102,241,0.15); 
        }

        .guard-btn {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white; width: 100%; padding: 1rem; border: none;
            border-radius: 0.75rem; font-weight: 800; font-size: 1rem;
            cursor: pointer; letter-spacing: 0.05em;
            box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
            transition: transform 0.1s;
        }
        .guard-btn:active { transform: scale(0.98); }

        .guard-err { 
            color: #dc2626; background: #fef2f2; padding: 0.75rem;
            border-radius: 0.5rem; font-weight: 700; margin-bottom: 1.5rem; 
            display: none; border: 1px solid #fecaca;
        }
        
        .guard-label {
            display: block; text-align: left; font-size: 0.75rem; 
            font-weight: 800; color: #475569; text-transform: uppercase; 
            letter-spacing: 0.05em; margin-left: 0.25rem;
        }
    `;
    document.head.appendChild(style);

    // 3. HTML Yapısı
    const overlay = document.createElement('div');
    overlay.id = 'optimizi-guard-overlay';
    overlay.innerHTML = `
        <div class="guard-card">
            <div style="margin-bottom: 2.5rem;">
                <h1 style="font-size: 2rem; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.05em;">
                    ${CONFIG.title}
                </h1>
                <p style="font-size: 0.85rem; color: #64748b; margin-top: 0.5rem; font-weight: 600;">
                    🔒 Güvenli Yönetim Paneli
                </p>
            </div>
            
            <div>
                <label class="guard-label">Kullanıcı Adı</label>
                <input type="text" id="g_user" class="guard-inp" placeholder="Kullanıcı adı" autocomplete="off">
                
                <label class="guard-label">Şifre</label>
                <input type="password" id="g_pass" class="guard-inp" placeholder="••••••" autocomplete="new-password">
            </div>

            <div id="g_err" class="guard-err">Hatalı giriş, tekrar dene!</div>
            
            <button id="g_btn" class="guard-btn">GİRİŞ YAP</button>
            
            <div style="margin-top: 2rem; border-top: 1px solid #f1f5f9; padding-top: 1rem;">
                <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 600;">
                    Optimizi Engineering Solutions © 2026
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // 4. Giriş Fonksiyonu
    function attemptLogin() {
        const u = document.getElementById('g_user').value;
        const p = document.getElementById('g_pass').value;
        const err = document.getElementById('g_err');

        if(u === CONFIG.user && p === CONFIG.pass) {
            localStorage.setItem('optimizi_session', '1');
            
            // Açılış Animasyonu
            overlay.style.transition = 'opacity 0.6s ease, backdrop-filter 0.6s ease';
            overlay.style.opacity = '0';
            overlay.style.backdropFilter = 'blur(0px)'; // Bluru yavaşça kaldır
            
            setTimeout(() => { 
                overlay.remove(); 
                document.body.style.overflow = 'auto'; 
            }, 600);
        } else {
            err.style.display = 'block';
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
