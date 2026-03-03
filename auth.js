// ============================================
// CENTRAL AUTHENTICATION SYSTEM & SECURITY
// Optimizi.App | v2.2 - Login Loop Fix
// ============================================

const SUPABASE_URL = 'https://gktvludkrsxnpigydqml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdHZsdWRrcnN4bnBpZ3lkcW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTI5OTQsImV4cCI6MjA4NjEyODk5NH0.GE9KbO7dx_W7BYihAzvJl744R317xEA8Ars98UW-VWo';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. HANGİ SAYFALAR HERKESE AÇIK?
const currentPath = window.location.pathname.toLowerCase();
const isPublicPage = 
    currentPath === '/' || 
    currentPath.includes('index') || 
    currentPath.includes('login') || 
    currentPath.includes('signup') || 
    currentPath.includes('iletisim') || 
    currentPath.includes('blog') ||
    currentPath.includes('404');

// 2. GÖRÜNMEZ GÜVENLİK STİLİ (SADECE KİLİTLİ SAYFALARDA)
if (!isPublicPage) {
    const style = document.createElement('style');
    style.innerHTML = `
        html.dark { background-color: #0f172a !important; }
        html:not(.dark) { background-color: #f8fafc !important; }
        body:not(.auth-checked) { opacity: 0 !important; pointer-events: none !important; }
        body.auth-checked { opacity: 1 !important; transition: opacity 0.3s ease !important; }
    `;
    document.head.appendChild(style);
} else {
    document.addEventListener("DOMContentLoaded", () => {
        document.body.classList.add('auth-checked');
    });
}

// 3. ZAMAN AŞIMI AYARLARI (5 Dakika)
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; 
let inactivityTimer = null;

// 4. ANA GÜVENLİK KONTROLÜ
// =========================================================================
// FIX v3: Promise tabanlı auth sistemi. Tüm sayfalar window.authReady 
// promise'ini bekleyerek race condition'ı tamamen ortadan kaldırır.
// onAuthStateChange + getSession paralel çalışır, hangisi önce dönerse
// onu kullanır. Bu sayede token refresh gecikmesi sayfa gösterimini engellemez.
// =========================================================================

// Global promise - tüm sayfalar bunu bekleyecek
let _authResolve;
window.authReady = new Promise((resolve) => { _authResolve = resolve; });

(function checkAuthentication() {
    if (isPublicPage) {
        _authResolve(null);
        return;
    }

    let authResolved = false;
    const AUTH_TIMEOUT = 10000; // 10 saniye - yavaş ağlar için

    function resolveAuth(session) {
        if (authResolved) return;
        authResolved = true;
        clearTimeout(authTimeoutId);

        if (session) {
            onAuthSuccess(session);
            _authResolve(session);
        } else {
            _authResolve(null);
            redirectToLogin();
        }
    }

    // YOL 1: onAuthStateChange - Supabase'in kendi event sistemi
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
        if (!authResolved) {
            resolveAuth(session);
        } else {
            // Sonraki auth değişimleri (token refresh, sign out vb.)
            if (event === 'SIGNED_OUT') {
                redirectToLogin();
            } else if (event === 'TOKEN_REFRESHED' && session) {
                window.currentUser = session.user;
                resetInactivityTimer();
            }
        }
    });

    // YOL 2: getSession ile paralel kontrol - bazen onAuthStateChange'den önce döner
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) resolveAuth(session);
    }).catch(() => {});

    // Güvenlik ağı: Supabase hiç event fırlatmazsa (ağ sorunu vs.)
    const authTimeoutId = setTimeout(() => {
        if (!authResolved) {
            authResolved = true;
            subscription.unsubscribe();
            _authResolve(null);
            redirectToLogin();
        }
    }, AUTH_TIMEOUT);
})();

function onAuthSuccess(session) {
    window.currentUser = session.user;
    // Body görünür yap - DOM hazır olmayabilir, her iki durumu da yakala
    function showBody() {
        document.body.classList.add('auth-checked');
    }
    if (document.body) {
        showBody();
    } else {
        document.addEventListener('DOMContentLoaded', showBody);
    }
    startInactivityTimer();
}

// 5. HAREKETSİZLİK SÜRESİ (AFK) KONTROLLERİ
function startInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        logoutDueToInactivity();
    }, INACTIVITY_TIMEOUT);
}

function resetInactivityTimer() {
    startInactivityTimer();
}

async function logoutDueToInactivity() {
    await supabaseClient.auth.signOut();
    sessionStorage.removeItem('redirectAfterLogin');
    showInactivityPopup();
}

function showInactivityPopup() {
    const popupHTML = `
    <div id="inactivityPopup" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 99999; backdrop-filter: blur(5px);">
      <div style="background: white; border-radius: 16px; padding: 40px; max-width: 450px; width: 90%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); text-align: center;">
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1a202c;">Oturum Süresi Doldu</h2>
        <p style="margin: 0 0 32px 0; font-size: 16px; color: #4a5568;">Hesabınız 5 dakika boyunca hareketsiz kaldığı için güvenlik nedeniyle oturumunuz sonlandırıldı.</p>
        <button id="inactivityPopupBtn" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">Tekrar Giriş Yap</button>
      </div>
    </div>
  `;
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    document.getElementById('inactivityPopupBtn').addEventListener('click', () => window.location.replace('/login.html'));
}

function setupActivityListeners() {
    const activityEvents = ['click', 'scroll', 'touchstart'];
    activityEvents.forEach(event => document.addEventListener(event, resetInactivityTimer, true));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupActivityListeners);
} else {
    setupActivityListeners();
}

// 6. YÖNLENDİRME VE ÇIKIŞ İŞLEMLERİ
function redirectToLogin() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    
    const currentPath = window.location.pathname;
    if (!isPublicPage) {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
    }
    
    window.location.replace('/login.html');
}

async function logout() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    await supabaseClient.auth.signOut();
    window.location.replace('/login.html');
}

// 7. SEKMELER ARASI GEÇİŞ (VISIBILITY) SENKRONİZASYONU
// =========================================================================
// FIX: Eski yöntem her focus/visibility değişiminde getSession + onAuthStateChange
// çağırıyordu ve yeni subscription'lar birikiyordu. 
// Yeni yöntem: Sadece getSession() ile kontrol yapar, token refresh'i Supabase'in 
// kendi iç mekanizmasına bırakır. Debounce + lock mekanizması ekler.
// =========================================================================
let visibilityCheckInProgress = false;

document.addEventListener('visibilitychange', () => { 
    if (!document.hidden) debouncedAuthCheck(); 
});
window.addEventListener('focus', () => debouncedAuthCheck());

let visibilityDebounceTimer = null;
function debouncedAuthCheck() {
    if (visibilityDebounceTimer) clearTimeout(visibilityDebounceTimer);
    visibilityDebounceTimer = setTimeout(() => checkAuthenticationSync(), 500);
}

async function checkAuthenticationSync() {
    if (isPublicPage || visibilityCheckInProgress) return;
    visibilityCheckInProgress = true;

    try {
        // Önce mevcut session'ı kontrol et
        let { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (session && !error) {
            resetInactivityTimer();
            visibilityCheckInProgress = false;
            return;
        }

        // Session yoksa, token refresh'i dene (expired token varsa kurtarır)
        const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession();
        
        if (refreshData?.session) {
            window.currentUser = refreshData.session.user;
            resetInactivityTimer();
        } else {
            // Gerçekten oturum yok
            redirectToLogin();
        }
    } catch (err) {
        redirectToLogin();
    } finally {
        visibilityCheckInProgress = false;
    }
}

// Global Erişime Açılan Değişkenler
window.logout = logout;
window.supabaseClient = supabaseClient;
window.currentUser = window.currentUser || null;
