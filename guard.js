(function() {
    // --- AYARLAR ---
    // Burayı kendine göre düzenle
    const CONFIG = {
        user: "inspro",
        pass: "inspro4455", 
        title: "Optimizi<span style='color:#6366f1'>.App</span>" // Mor renk vurgusu
    };

    // 1. Zaten giriş yapılmış mı kontrol et
    if (localStorage.getItem('optimizi_session') === '1') {
        return; // Zaten içerdeyiz, scripti durdur.
    }

    // 2. CSS Stillerini Oluştur (Premium Tasarım)
    const style = document.createElement('style');
    style.innerHTML = `
        /* Sayfa scroll olmasın */
        body { overflow: hidden !important; }
        
        /* Arka Plan Katmanı */
        #optimizi-guard-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: #f8fafc; /* Slate-50: Çok açık gri */
            background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
            background-size: 24px 24px;
            z-index: 2147483647; /* En üstte durması için max index */
            display: flex; align-items: center; justify-content: center;
            font-family: system-ui, -apple-system, sans-serif;
        }

        /* Ortadaki Kart */
        .guard-card {
            background: rgba(255, 255, 255, 0.95);
            padding: 3rem; 
            border-radius: 1.5rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.8);
            width: 90%; max-width: 420px; 
            text-align: center;
            backdrop-filter: blur(8px);
        }

        /* Input Alanları - OKUNAKLI VE ŞIK */
        .guard-inp {
            width: 100%; 
            padding: 0.9rem 1rem; 
            margin-top: 0.5rem; 
            margin-bottom: 1.25rem;
            border: 1px solid #e2e8f0; /* Slate-200: İnce gri çizgi */
            border-radius: 0.75rem;
            background-color: #ffffff; /* Beyaz zemin */
            color: #334155; /* Slate-700: Koyu Gri/Antrasit (Simsiyah değil) */
            font-size: 0.95rem;
            font-weight: 500;
            outline: none; 
            transition: all 0.2s ease;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        /* Inputa tıklayınca oluşan efekt */
        .guard-inp:focus { 
            border-color: #6366f1; /* İndigo rengi */
            box-shadow: 0 0 0 4px rgba(99,102,241,0.1); 
        }

        /* Placeholder rengi (Yazı yazılmadan önceki silik yazı) */
        .guard-inp::placeholder {
            color: #94a3b8; /* Slate-400 */
            font-weight: 400;
        }

        /* Giriş Butonu */
        .guard-btn {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white; 
            width: 100%; 
            padding: 1rem; 
            border: none;
            border-radius: 0.75rem; 
            font-weight: 700; 
            font-size: 0.95rem;
            cursor: pointer;
            letter-spacing: 0.025em;
            transition: transform 0.1s, box-shadow 0.2s;
            box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
        }
        .guard-btn:hover {
            box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
            transform: translateY(-1px);
        }
        .guard-btn:active { transform: scale(0.98); }

        /* Hata Mesajı */
        .guard-err { 
            color: #ef4444; 
            background: #fef2f2;
            padding: 0.5rem;
            border-radius: 0.5rem;
            font-size: 0.85rem; 
            font-weight: 600; 
            margin-bottom: 1rem; 
            display: none; 
            border: 1px solid #fee2e2;
        }
        
        /* Etiketler */
        .guard-label {
            display: block;
            text-align: left;
            font-size: 0.75rem; 
            font-weight: 700; 
            color: #64748b; /* Slate-500 */
            text-transform: uppercase; 
            letter-spacing: 0.05em;
            margin-left: 0.25rem;
        }
    `;
    document.head.appendChild(style);

    // 3. HTML Yapısını Oluştur
    const overlay = document.createElement('div');
    overlay.id = 'optimizi-guard-overlay';
    overlay.innerHTML = `
        <div class="guard-card">
            <div style="margin-bottom: 2rem;">
                <h1 style="font-size: 1.75rem; font-weight: 900; color: #1e293b; margin: 0; letter-spacing: -0.025em;">
                    ${CONFIG.title}
                </h1>
                <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.5rem; font-weight: 500;">
                    Yalnızca Yetkili Erişim
                </p>
            </div>
            
            <div>
                <label class="guard-label">Kullanıcı Adı</label>
                <input type="text" id="g_user" class="guard-inp" placeholder="Kullanıcı adınızı girin" autocomplete="off">
                
                <label class="guard-label">Erişim Şifresi</label>
                <input type="password" id="g_pass" class="guard-inp" placeholder="••••••" autocomplete="new-password">
            </div>

            <div id="g_err" class="guard-err">Hatalı kullanıcı adı veya şifre!</div>
            
            <button id="g_btn" class="guard-btn">GÜVENLİ GİRİŞ</button>
            
            <div style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 500;">
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
            // Başarılı
            localStorage.setItem('optimizi_session', '1');
            
            // Yumuşak geçiş efekti
            overlay.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(1.05)';
            
            setTimeout(() => { 
                overlay.remove(); 
                document.body.style.overflow = 'auto'; // Sayfa kaydırmayı aç
            }, 400);
        } else {
            // Hatalı
            err.style.display = 'block';
            // Titreme efekti
            const card = document.querySelector('.guard-card');
            card.animate([
                { transform: 'translateX(0)' }, 
                { transform: 'translateX(-6px)' }, 
                { transform: 'translateX(6px)' }, 
                { transform: 'translateX(0)' }
            ], { duration: 300 });
            
            // Şifreyi temizle
            document.getElementById('g_pass').value = '';
            document.getElementById('g_pass').focus();
        }
    }

    // Tıklama Olayı
    document.getElementById('g_btn').addEventListener('click', attemptLogin);

    // Enter Tuşu Desteği (Her iki inputta da çalışsın)
    const inputs = [document.getElementById('g_user'), document.getElementById('g_pass')];
    inputs.forEach(inp => {
        inp.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') attemptLogin();
        });
    });

    // Sayfa açılınca kullanıcı adına odaklan
    setTimeout(() => document.getElementById('g_user').focus(), 100);

})();
