(function() {
    // --- 1. AYARLAR ---
    const CONFIG = {
        user: "inspro",
        pass: "inspro44"
    };

    // --- 2. KONTROL & KİLİT ---
    // Eğer daha önce giriş yapıldıysa (localStorage '1' ise) ve süre geçmediyse scripti durdur.
    if (localStorage.getItem('optimizi_session') === '1') {
        return; 
    }

    // Scroll Kilitle (Sayfa kaymasın)
    document.body.style.overflow = 'hidden'; 
    window.scrollTo(0, 0); // En tepeye sabitle

    // --- 3. PREMIUM APPLE / ICY TASARIM ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* Ana Kapsayıcı: Tam Ekran */
        #opt-guard-root {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%); /* Çok açık gri-beyaz */
            z-index: 999999999; /* En üstte olduğundan emin olalım */
            display: flex; align-items: center; justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
        }

        /* --- HALKA ANİMASYONU (Optimizi Ring) --- */
        .opt-ring-container {
            position: absolute;
            width: 600px; height: 600px;
            display: flex; align-items: center; justify-content: center;
            z-index: 0; /* Kartın arkasında */
            opacity: 0.6;
            pointer-events: none;
        }

        .opt-ring-main {
            position: absolute;
            width: 100%; height: 100%;
            border-radius: 50%;
            border: 1px solid rgba(0, 0, 0, 0.05); /* Çok silik çerçeve */
            background: conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0) 0deg, rgba(99, 102, 241, 0.3) 180deg, rgba(255,255,255,0) 360deg);
            animation: rotateRing 8s linear infinite;
            filter: blur(40px); /* O "Hüzme" efektini veren blur */
        }
        
        .opt-ring-inner {
            position: absolute;
            width: 60%; height: 60%;
            border-radius: 50%;
            border: 1px solid rgba(99, 102, 241, 0.2);
            animation: rotateRing 15s linear reverse infinite;
        }

        /* --- APPLE GLASS CARD --- */
        .opt-glass-card {
            position: relative; z-index: 10;
            width: 90%; max-width: 380px;
            padding: 3rem 2.5rem;
            
            /* Buzlu Cam Efekti */
            background: rgba(255, 255, 255, 0.45);
            backdrop-filter: blur(30px) saturate(180%);
            -webkit-backdrop-filter: blur(30px) saturate(180%);
            
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow: 
                0 20px 40px rgba(0,0,0,0.05), /* Yumuşak gölge */
                0 0 0 1px rgba(255,255,255,0.5) inset; /* İç parlama */
            
            text-align: center;
            transition: transform 0.3s ease;
        }

        .opt-logo {
            font-size: 1.75rem; font-weight: 700; color: #1d1d1f;
            margin-bottom: 0.2rem; letter-spacing: -0.02em;
        }
        .opt-desc {
            font-size: 0.9rem; color: #86868b; margin-bottom: 2rem; font-weight: 400;
        }

        /* Inputlar: Apple Tarzı Temiz */
        .opt-input {
            width: 100%;
            padding: 16px; margin-bottom: 12px;
            border-radius: 14px;
            border: 1px solid rgba(0, 0, 0, 0.05);
            background: rgba(255, 255, 255, 0.5);
            font-size: 16px; color: #1d1d1f;
            outline: none;
            transition: all 0.2s ease;
            box-sizing: border-box; /* Padding taşmasını önler */
        }
        .opt-input:focus {
            background: #fff;
            box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1); /* Mavi focus hare */
            border-color: rgba(0, 122, 255, 0.3);
        }
        .opt-input::placeholder { color: #a1a1a6; }

        /* Buton: Siyah Premium */
        .opt-btn {
            width: 100%; padding: 16px;
            margin-top: 8px;
            background: #1d1d1f; color: #fff;
            border: none; border-radius: 14px;
            font-size: 16px; font-weight: 600;
            cursor: pointer;
            transition: transform 0.1s, opacity 0.2s;
        }
        .opt-btn:hover { opacity: 0.9; }
        .opt-btn:active { transform: scale(0.98); }

        /* Hata Mesajı */
        .opt-error {
            color: #ff3b30; font-size: 13px; font-weight: 500;
            margin-bottom: 15px; display: none;
            background: rgba(255, 59, 48, 0.1); padding: 8px; border-radius: 8px;
        }

        @keyframes rotateRing { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    // --- 4. HTML YAPISI ---
    const overlay = document.createElement('div');
    overlay.id = 'opt-guard-root'; // Benzersiz ID
    overlay.innerHTML = `
        <div class="opt-ring-container">
            <div class="opt-ring-main"></div>
            <div class="opt-ring-inner"></div>
        </div>

        <div class="opt-glass-card" id="opt-card">
            <div class="opt-logo">Optimizi</div>
            <div class="opt-desc">Secure Access</div>

            <div id="opt-err-msg" class="opt-error">Kullanıcı adı veya şifre hatalı.</div>

            <input type="text" id="opt_user_inp" class="opt-input" placeholder="Kullanıcı Adı" autocomplete="off">
            <input type="password" id="opt_pass_inp" class="opt-input" placeholder="Parola" autocomplete="new-password">
            
            <button id="opt_login_btn" class="opt-btn">Giriş Yap</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // --- 5. LOGIC (MANTIK) ---
    function doLogin() {
        // Yeni ID'leri seçiyoruz
        const uVal = document.getElementById('opt_user_inp').value.trim(); // Boşlukları temizle
        const pVal = document.getElementById('opt_pass_inp').value.trim();
        const errBox = document.getElementById('opt-err-msg');

        if(uVal === CONFIG.user && pVal === CONFIG.pass) {
            // Başarılı
            localStorage.setItem('optimizi_session', '1');
            
            // Kartı yukarı kaydırarak yok et
            overlay.style.transition = 'opacity 0.5s ease, backdrop-filter 0.5s';
            document.getElementById('opt-card').style.transform = 'scale(0.95) translateY(10px)';
            overlay.style.opacity = '0';
            
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = 'auto'; // Kaydırmayı aç
            }, 500);
        } else {
            // Hatalı
            errBox.style.display = 'block';
            
            // Kartı salla (Shake animation)
            const card = document.getElementById('opt-card');
            card.animate([
                { transform: 'translateX(0)' }, 
                { transform: 'translateX(-6px)' }, 
                { transform: 'translateX(6px)' }, 
                { transform: 'translateX(0)' }
            ], { duration: 300 });

            // Şifreyi temizle
            document.getElementById('opt_pass_inp').value = '';
            document.getElementById('opt_pass_inp').focus();
        }
    }

    // Tıklama Olayı
    document.getElementById('opt_login_btn').addEventListener('click', doLogin);

    // Enter Tuşu Desteği
    const inputs = [document.getElementById('opt_user_inp'), document.getElementById('opt_pass_inp')];
    inputs.forEach(inp => {
        inp.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doLogin();
        });
    });

    // Sayfa yüklendiğinde ilk inputa odaklan
    setTimeout(() => {
        const uInp = document.getElementById('opt_user_inp');
        if(uInp) uInp.focus();
    }, 100);

})();
