// ============================================
// CENTRAL AUTHENTICATION SYSTEM & SECURITY
// Optimizi.App | v3.0 Kusursuz Loader ve Gizlilik
// ============================================

const SUPABASE_URL = 'https://gktvludkrsxnpigydqml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdHZsdWRrcnN4bnBpZ3lkcW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTI5OTQsImV4cCI6MjA4NjEyODk5NH0.GE9KbO7dx_W7BYihAzvJl744R317xEA8Ars98UW-VWo';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const currentPath = window.location.pathname.toLowerCase();
const isPublicPage = 
    currentPath === '/' || 
    currentPath.includes('index') || 
    currentPath.includes('login') || 
    currentPath.includes('signup') || 
    currentPath.includes('iletisim') || 
    currentPath.includes('blog') ||
    currentPath.includes('404');

// 1. ZORUNLU LOADER VE GİZLEME (HTML'E DOKUNMADAN JS İLE ÇÖZÜM)
if (!isPublicPage) {
    // JS okunduğu ilk milisaniyede sayfayı görünmez yap ve loader stili ekle
    const style = document.createElement('style');
    style.innerHTML = `
        html { background-color: #f8fafc; }
        html.dark { background-color: #0f172a; }
        body:not(.auth-checked) { visibility: hidden !important; }
        
        #optimizi-global-loader {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background-color: #f8fafc; visibility: visible !important;
            transition: opacity 0.4s ease;
        }
        html.dark #optimizi-global-loader { background-color: #0f172a; }
        
        .loader-ring {
            width: 60px; height: 60px; border: 4px solid #e2e8f0;
            border-top: 4px solid #4f46e5; border-radius: 50%;
            animation: spin 1s linear infinite; margin-bottom: 20px;
        }
        html.dark .loader-ring { border-color: #1e293b; border-top-color: #dc2626; }
        
        .loader-text {
            font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: bold;
            letter-spacing: 2px; color: #64748b; animation: pulse 1.5s infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    `;
    document.head.appendChild(style);

    // DOM oluşur oluşmaz login flaşını önlemek için loader'ı ekrana bas
    document.addEventListener('DOMContentLoaded', () => {
        const loader = document.createElement('div');
        loader.id = 'optimizi-global-loader';
        loader.innerHTML = `
            <div class="loader-ring"></div>
            <div class="loader-text">GÜVENLİ BAĞLANTI KURULUYOR...</div>
        `;
        document.documentElement.appendChild(loader); 
    });
}

// 2. ZAMAN AŞIMI AYARLARI
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; 
let inactivityTimer = null;

// 3. ANA GÜVENLİK KONTROLÜ
if (!isPublicPage) {
    (async function checkAuthentication() {
        try {
            let { data: { session }, error } = await supabaseClient.auth.getSession();
            
            let retryCount = 0;
            while (!session && !error && retryCount < 6) {
                await new Promise(resolve => setTimeout(resolve, 500));
                ({ data: { session }, error } = await supabaseClient.auth.getSession());
                retryCount++;
            }
            
            if (session && !error) {
                // KULLANICI ONAYLANDI - SAYFAYI AÇ
                window.currentUser = session.user;
                
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.classList.add('auth-checked'); // İçeriği görünür yap
                    
                    const loader = document.getElementById('optimizi-global-loader');
                    if (loader) {
                        loader.style.opacity = '0';
                        setTimeout(() => loader.remove(), 400); // Ekrandan pürüzsüzce sil
                    }

                    document.dispatchEvent(new CustomEvent('auth-ready', { detail: session.user }));
                    startInactivityTimer();
                });
            } else {
                // KESİN OLARAK ÇIKIŞ YAPMIŞSA LOGİNE AT
                redirectToLogin();
            }
        } catch (err) {
            redirectToLogin();
        }
    })();

    // Manuel "focus" eventlerini sildik! Sadece Supabase'in kendi stabil dinleyicisi:
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') redirectToLogin();
        else if (session) resetInactivityTimer();
    });

} else {
    // Public sayfalarda engellemeleri kaldır
    document.addEventListener("DOMContentLoaded", () => {
        document.body.classList.add('auth-checked');
    });
}

// 4. HAREKETSİZLİK SÜRESİ (AFK) KONTROLLERİ
function startInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => { logoutDueToInactivity(); }, INACTIVITY_TIMEOUT);
}

function resetInactivityTimer() { startInactivityTimer(); }

async function logoutDueToInactivity() {
    await supabaseClient.auth.signOut();
    sessionStorage.removeItem('redirectAfterLogin');
    showInactivityPopup();
}

function showInactivityPopup() {
    const popupHTML = `
      <div id="inactivityPopup" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 999999; backdrop-filter: blur(5px);">
        <div style="background: white; border-radius: 16px; padding: 40px; max-width: 450px; width: 90%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); text-align: center;">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1a202c;">Oturum Süresi Doldu</h2>
          <p style="margin: 0 0 32px 0; font-size: 16px; color: #4a5568;">Hesabınız 5 dakika boyunca hareketsiz kaldığı için güvenlik nedeniyle oturumunuz sonlandırıldı.</p>
          <button id="inactivityPopupBtn" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">Tekrar Giriş Yap</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    const loginPath = window.location.pathname.includes('/tool/') ? '../login.html' : 'login.html';
    document.getElementById('inactivityPopupBtn').addEventListener('click', () => window.location.replace(loginPath));
}

function setupActivityListeners() {
    const activityEvents = ['click', 'scroll', 'touchstart'];
    activityEvents.forEach(event => document.addEventListener(event, resetInactivityTimer, true));
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', setupActivityListeners); } 
else { setupActivityListeners(); }

// 5. YÖNLENDİRME VE ÇIKIŞ İŞLEMLERİ
function redirectToLogin() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    
    if (!isPublicPage) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    }
    
    const loginPath = window.location.pathname.includes('/tool/') ? '../login.html' : 'login.html';
    window.location.replace(loginPath);
}

async function logout() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    await supabaseClient.auth.signOut();
    const loginPath = window.location.pathname.includes('/tool/') ? '../login.html' : 'login.html';
    window.location.replace(loginPath);
}

// Global Erişime Açılan Değişkenler
window.logout = logout;
window.supabaseClient = supabaseClient;
window.currentUser = window.currentUser || null;
