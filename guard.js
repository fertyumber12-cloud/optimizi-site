(function() {
    // --- AYARLAR ---
    const CONFIG = {
        user: "onur",
        pass: "Onrgnr.55", // Buradan şifreyi yönetirsin
        title: "Optimizi<span style='color:#4f46e5'>.App</span>"
    };

    // Oturum kontrolü
    if (localStorage.getItem('optimizi_session') === '1') {
        return; // Zaten giriş yapılmış, script çalışmayı durdurur.
    }

    // Sayfa içeriğini gizle (Giriş yapılana kadar)
    const style = document.createElement('style');
    style.innerHTML = `
        body { overflow: hidden !important; }
        #optimizi-guard-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: #f8fafc;
            background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
            background-size: 20px 20px;
            z-index: 999999;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .guard-card {
            background: rgba(255, 255, 255, 0.95);
            padding: 2.5rem; border-radius: 1.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.5);
            width: 90%; max-width: 400px; text-align: center;
            backdrop-filter: blur(10px);
        }
        .guard-inp {
            width: 100%; padding: 0.75rem; margin-top: 0.5rem; margin-bottom: 1rem;
            border: 1px solid #cbd5e1; border-radius: 0.5rem;
            background: #f1f5f9; outline: none; transition: all 0.2s;
        }
        .guard-inp:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .guard-btn {
            background: linear-gradient(to right, #6366f1, #8b5cf6);
            color: white; width: 100%; padding: 0.8rem; border: none;
            border-radius: 0.75rem; font-weight: bold; cursor: pointer;
            transition: transform 0.1s;
        }
        .guard-btn:active { transform: scale(0.96); }
        .guard-err { color: #ef4444; font-size: 0.8rem; font-weight: bold; margin-bottom: 1rem; display: none; }
    `;
    document.head.appendChild(style);

    // HTML Yapısını Oluştur
    const overlay = document.createElement('div');
    overlay.id = 'optimizi-guard-overlay';
    overlay.innerHTML = `
        <div class="guard-card">
            <h1 style="font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem;">${CONFIG.title}</h1>
            <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 1.5rem; font-weight: 500;">GÜVENLİ ERİŞİM NOKTASI</p>
            
            <div style="text-align: left;">
                <label style="font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Kullanıcı Adı</label>
                <input type="text" id="g_user" class="guard-inp" placeholder="...">
                
                <label style="font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Şifre</label>
                <input type="password" id="g_pass" class="guard-inp" placeholder="******">
            </div>

            <div id="g_err" class="guard-err">Hatalı bilgiler, tekrar deneyin.</div>
            <button id="g_btn" class="guard-btn">GİRİŞ YAP</button>
            <div style="margin-top: 1.5rem; font-size: 0.65rem; color: #cbd5e1;">Protected by OptimiziGuard™</div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Giriş Fonksiyonu
    function attemptLogin() {
        const u = document.getElementById('g_user').value;
        const p = document.getElementById('g_pass').value;
        const err = document.getElementById('g_err');

        if(u === CONFIG.user && p === CONFIG.pass) {
            localStorage.setItem('optimizi_session', '1');
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';
            setTimeout(() => { 
                overlay.remove(); 
                document.body.style.overflow = 'auto'; // Scroll'u geri aç
            }, 500);
        } else {
            err.style.display = 'block';
            document.querySelector('.guard-card').animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, 
                { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }
            ], { duration: 300 });
        }
    }

    document.getElementById('g_btn').addEventListener('click', attemptLogin);
    // Enter tuşu desteği
    document.getElementById('g_pass').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') attemptLogin();
    });
})();
