// ============================================
// CENTRAL AUTHENTICATION SYSTEM & SECURITY
// Optimizi.App | v2.1 Kusursuz Gizlilik Modülü
// ============================================

const SUPABASE_URL = 'https://gktvludkrsxnpigydqml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdHZsdWRrcnN4bnBpZ3lkcW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTI5OTQsImV4cCI6MjA4NjEyODk5NH0.GE9KbO7dx_W7BYihAzvJl744R317xEA8Ars98UW-VWo';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. HANGİ SAYFALAR HERKESE AÇIK? (Kilitlenmeyecek ve yönlendirilmeyecek sayfalar)
const currentPath = window.location.pathname.toLowerCase();
const isPublicPage = 
    currentPath === '/' || 
    currentPath.includes('index') || 
    currentPath.includes('login') || 
    currentPath.includes('signup') || 
    currentPath.includes('iletisim') || 
    currentPath.includes('blog') ||
    currentPath.includes('404');

// 2. LOADING SPINNER (kontrol bitene kadar sayfa yerine spinner göster)
if (!isPublicPage) {
    const style = document.createElement('style');
    style.innerHTML = `
        html.dark { background-color: #0f172a !important; }
        html:not(.dark) { background-color: #f8fafc !important; }
        
        body:not(.auth-checked) { overflow: hidden !important; }
        body.auth-checked .auth-loading-overlay { display: none !important; }
        body.auth-checked { opacity: 1 !important; }
        
        .auth-loading-overlay {
            position: fixed; inset: 0; z-index: 99999;
            display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px;
        }
        html.dark .auth-loading-overlay { background: #0f172a; }
        html:not(.dark) .auth-loading-overlay { background: #f8fafc; }
        
        .auth-spinner {
            width: 36px; height: 36px;
            border: 3px solid #e2e8f0; border-top-color: #06b6d4;
            border-radius: 50%; animation: auth-spin 0.8s linear infinite;
        }
        html.dark .auth-spinner { border-color: #334155; border-top-color: #22d3ee; }
        @keyframes auth-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
    
    // Spinner overlay'ı ekle
    const overlay = document.createElement('div');
    overlay.className = 'auth-loading-overlay';
    overlay.innerHTML = '<div class="auth-spinner"></div>';
    document.documentElement.appendChild(overlay);
} else {
    document.addEventListener("DOMContentLoaded", () => {
        document.body.classList.add('auth-checked');
    });
}

// 3. ZAMAN AŞIMI AYARLARI (5 Dakika)
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; 
let inactivityTimer = null;

// 4. ANA GÜVENLİK KONTROLÜ
(function checkAuthentication() {
  if (isPublicPage) return;

  let resolved = false;
  const fallback = setTimeout(() => {
    if (!resolved) { resolved = true; redirectToLogin(); }
  }, 3000);

  // login.html'de çalışan pattern — event filtrelemesi yok
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (resolved) return;
    resolved = true;
    clearTimeout(fallback);
    
    if (session) {
      window.currentUser = session.user;
      document.body.classList.add('auth-checked');
      startInactivityTimer();
    } else {
      redirectToLogin();
    }
  });
})();

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
  // Sadece kilitli sayfalarda hafızaya link kaydet
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
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkAuthenticationSync(); });
window.addEventListener('focus', () => checkAuthenticationSync());

async function checkAuthenticationSync() {
  if (isPublicPage) return;
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) resetInactivityTimer();
    else redirectToLogin();
  } catch (err) {
    redirectToLogin();
  }
}

// Global Erişime Açılan Değişkenler
window.logout = logout;
window.supabaseClient = supabaseClient;
window.currentUser = window.currentUser || null;
