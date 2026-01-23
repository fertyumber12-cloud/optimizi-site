(function() {
    // --- 1. AYARLAR ---
    const MASTER_CONFIG = {
        user: "inspro",
        pass: "inspro44",
        refreshLimit: 3 // Kaç yenilemede bir şifre sorsun?
    };

    // --- 2. GÜNLÜK DENEME ŞİFRESİ ---
    function getTrialCredentials() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return { 
            user: "deneme", 
            pass: "deneme" + day + month // Örn: deneme2301
        };
    }

    // --- 3. SAYAÇ VE OTURUM MANTIĞI ---
    function checkSessionLogic() {
        // Mevcut sayaç bilgisini al (Yoksa 0 kabul et)
        let count = parseInt(localStorage.getItem('opt_refresh_count') || '0');
        
        // Sayacı 1 artır ve kaydet
        count++;
        localStorage.setItem('opt_refresh_count', count);
        
        console.log("Yenileme Sayısı:", count); // F12 konsolda görebilirsin

        // Eğer limit (3) aşıldıysa oturumu SİL
        if (count >= MASTER_CONFIG.refreshLimit) {
            localStorage.removeItem('optimizi_session');
            localStorage.setItem('opt_refresh_count', '0'); // Sayacı sıfırla
        }

        // Şimdi oturum var mı diye bak
        // Eğer oturum varsa (ve limit aşılmadıysa) scripti burada durdur (Site görünsün)
        if (localStorage.getItem('optimizi_session') === '1') {
            return true; // Giriş yapılı
        }
        
        return false; // Giriş gerekli
    }

    // Eğer giriş yapılıysa kodun geri kalanını çalıştırma, site açılsın.
    if (checkSessionLogic()) return;


    // --- 4. TASARIM KODLARI ---
    
    // Scroll Kilitle (Aşağı inemesinler)
    document.body.style.overflow = 'hidden'; 
    window.scrollTo(0, 0);

    const style = document.createElement('style');
    style.innerHTML = `
        /* Arka Plan Perdesi */
        #optimizi-guard-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            
            /* --- BURASI DEĞİŞTİ: BUZLU CAM --- */
            /* Arka planı hafif beyaz/gri yapıyoruz ama şeffaf bırakıyoruz (0.5) */
            background-color: rgba(200, 210, 230, 0.4); 
            
            /* Arkadaki sitenin flu görünmesi için blur */
            backdrop-filter: blur(8px); 
            -webkit-backdrop-filter: blur(8px);
            
            z-index: 2147483647; /* En üst katman */
            display: flex; align-items: center; justify-content: center;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            opacity: 0; animation: fadeIn 0.4s forwards;
        }

        @keyframes fadeIn { to { opacity: 1; } }

        /* Kart Tasarımı (Apple Style) */
        .guard-card {
            /* Kartın kendisi biraz daha opak olsun ki yazılar okunsun */
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            
            padding: 3rem 2.5rem; 
            border-radius: 1.75rem;
            
            /* Hafif gölge ve ince çerçeve */
            box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.2), 
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

        /* Inputlar */
        .guard-inp {
            width: 100%; padding: 1rem 1.1rem; margin-bottom: 1rem;
            border: 1px solid rgba(0,0,0,0.08); border-radius: 1rem;
            background-color: rgba(255, 255, 255, 0.5); 
            color: #334155 !important; font-size: 0.95rem; font-weight: 600;
            outline: none; transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
            box-sizing: border-box; /* Taşmayı engeller */
        }
        .guard-inp:focus { 
            background-color: #ffffff; border-color: #6366f1; 
            box-shadow: 0 0 0 4px rgba(99,102,241,0.15); transform: translateY(-1px);
        }

        /* Buton */
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

        /* Hata Mesajı */
        .guard-err { 
            color: #dc2626; background: rgba(254, 226, 226, 0.8); 
            padding: 0.8rem; border-radius: 0.75rem; font-size: 0.85rem;
            font-weight: 600; margin-bottom: 1.5rem; display: none;
        }
    `;
    document.head.appendChild(style);

    // --- 5. HTML ---
    const overlay = document.createElement('div');
    overlay.id = 'optimizi-guard-overlay';
    overlay.innerHTML = `
        <div class="guard-card">
            <div class="logo-text">
                Optimizi<span class="logo-gradient">.App</span>
            </div>
            
            <div id="g_err" class="guard-err">Hatalı giriş!</div>

            <div>
                <input type="text" id="g_user" class="guard-inp" placeholder="Kullanıcı Adı" autocomplete="off">
                <input type="password" id="g_pass" class="guard-inp" placeholder="Şifre" autocomplete="new-password">
            </div>
            
            <button id="g_btn" class="guard-btn">Giriş Yap</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // --- 6. GİRİŞ FONKSİYONU ---
    function attemptLogin() {
        const u = document.getElementById('g_user').value.trim();
        const p = document.getElementById('g_pass').value.trim();
        const err = document.getElementById('g_err');

        const TRIAL = getTrialCredentials();
        // Test için konsola şifreyi yazalım
        console.log("Deneme Şifresi:", TRIAL.pass);

        const isMaster = (u === MASTER_CONFIG.user && p === MASTER_CONFIG.pass);
        const isTrial = (u === TRIAL.user && p === TRIAL.pass);

        if(isMaster || isTrial) {
            // Giriş Başarılı -> Oturumu kaydet
            localStorage.setItem('optimizi_session', '1');
            
            // --- ÖNEMLİ: Giriş yapınca sayacı sıfırlayalım mı? ---
            // Genelde kullanıcı giriş yaptıysa rahat etsin diye sıfırlanır.
            // Amaç sadece "refresh yapıp duranları" engellemekse, giriş yapan sıfırlansın.
            localStorage.setItem('opt_refresh_count', '0'); 
            
            // Animasyonla kaldır
            overlay.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(1.1)'; 
            
            setTimeout(() => { 
                overlay.remove(); 
                document.body.style.overflow = 'auto'; // Scrollu aç
            }, 500);

        } else {
            // Hatalı Giriş
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

    [document.getElementById('g_user'), document.getElementById('g_pass')].forEach(inp => {
        inp.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') attemptLogin();
        });
    });

    setTimeout(() => document.getElementById('g_user').focus(), 100);

})();
