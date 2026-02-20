// ============================================
// CENTRAL AUTHENTICATION SYSTEM & SECURITY
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

// 2. GÖRÜNMEZ GÜVENLİK STİLİ (SADECE KİLİTLİ SAYFALARDA ÇALIŞIR)
if (!isPublicPage) {
    const style = document.createElement('style');
    style.innerHTML = `
        body:not(.auth-checked) { opacity: 0 !important; pointer-events: none !important; }
        body.auth-checked { opacity: 1 !important; transition: opacity 0.3s ease !important; }
    `;
    document.head.appendChild(style);
} else {
    // Eğer herkese açık bir sayfadaysak (ana sayfa vb.), CSS eklenmediği için 
    // sayfa zaten görünürdür, işlemi garantiye almak için sınıfı yine de ekleriz.
    document.addEventListener("DOMContentLoaded", () => {
        document.body.classList.add('auth-checked');
    });
}

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 dakika
let inactivityTimer = null;

(async function checkAuthentication() {
  // EĞER SAYFA HERKESE AÇIKSA GÜVENLİK SORGUSU VE LOGİNE ATMA İŞLEMİNİ İPTAL ET
  if (isPublicPage) return;

  try {
    let { data: { session }, error } = await supabaseClient.auth.getSession();
    
    // Yarış durumunu çözen döngü
    let retryCount = 0;
    while (!session && !error && retryCount < 5) {
      await new Promise(resolve => setTimeout(resolve, 300));
      ({ data: { session }, error } = await supabaseClient.auth.getSession());
      retryCount++;
    }
    
    if (error) {
      redirectToLogin();
      return;
    }
    
    if (!session) {
      redirectToLogin();
    } else {
      // Müşteri yetkiliyse ekran kilidini kaldır (görünür yap)
      window.currentUser = session.user;
      document.body.classList.add('auth-checked');
      startInactivityTimer();
    }
  } catch (err) {
    redirectToLogin();
  }
})();

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
    <div id="inactivityPopup" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 9999; backdrop-filter: blur(5px);">
      <div style="background: white; border-radius: 16px; padding: 40px; max-width: 450px; width: 90%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); text-align: center;">
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1a202c;">Oturum Süresi Doldu</h2>
        <p style="margin: 0 0 32px 0; font-size: 16px; color: #4a5568;">Hesabınız 5 dakika boyunca hareketsiz kaldığı için güvenlik nedeniyle oturumunuz sonlandırıldı.</p>
        <button id="inactivityPopupBtn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">Tekrar Giriş Yap</button>
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

function redirectToLogin() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  
  const currentPath = window.location.pathname;
  // GÜVENLİK DUVARI: Herkese açık sayfalardaysa (ana sayfa vs) hafızaya kaydetme!
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

document.addEventListener('visibilitychange', () => { if (!document.hidden) checkAuthenticationSync(); });
window.addEventListener('focus', () => checkAuthenticationSync());

async function checkAuthenticationSync() {
  // Herkese açık sayfalarda sekme arası geçişlerde de logine atma olayını iptal et
  if (isPublicPage) return;

  try {
    let { data: { session }, error } = await supabaseClient.auth.getSession();
    
    let retryCount = 0;
    while (!session && !error && retryCount < 5) {
      await new Promise(resolve => setTimeout(resolve, 300));
      ({ data: { session }, error } = await supabaseClient.auth.getSession());
      retryCount++;
    }
    
    if (!session) redirectToLogin();
    else resetInactivityTimer();
  } catch (err) {
    redirectToLogin();
  }
}

window.logout = logout;
window.supabaseClient = supabaseClient;
window.currentUser = window.currentUser || null;
