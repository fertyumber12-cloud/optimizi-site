// ============================================
// AUTHENTICATION GUARD
// ============================================
// Bu dosya sayfaları korur - login olmayan kullanıcıları engeller

// Supabase Configuration
const SUPABASE_URL = 'https://gktvludkrsxnpigydqml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdHZsdWRrcnN4bnBpZ3lkcW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTI5OTQsImV4cCI6MjA4NjEyODk5NH0.GE9KbO7dx_W7BYihAzvJl744R317xEA8Ars98UW-VWo';

// Supabase client'ı başlat
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// INACTIVITY TIMEOUT SETTINGS
// ============================================
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 dakika (milisaniye cinsinden)
let inactivityTimer = null;

// Authentication kontrolü
(async function checkAuthentication() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('Auth check error:', error);
      redirectToLogin();
      return;
    }
    
    if (!session) {
      // Kullanıcı giriş yapmamış
      console.log('❌ Giriş yapılmamış - Login sayfasına yönlendiriliyor...');
      redirectToLogin();
    } else {
      // Kullanıcı giriş yapmış
      console.log('✅ Kullanıcı giriş yapmış:', session.user.email);
      
      // Kullanıcı bilgilerini global olarak sakla
      window.currentUser = session.user;
      
      // Sayfayı görünür yap (flash problemi çözümü)
      document.body.classList.add('auth-checked');
      
      // İnaktivite timer'ını başlat
      startInactivityTimer();
    }
  } catch (err) {
    console.error('Unexpected auth error:', err);
    redirectToLogin();
  }
})();

// ============================================
// INACTIVITY TIMER FUNCTIONS
// ============================================

// İnaktivite timer'ını başlat
function startInactivityTimer() {
  console.log('🕐 İnaktivite timer başlatıldı (5 dakika)');
  
  // Önceki timer varsa temizle
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  
  // Yeni timer başlat
  inactivityTimer = setTimeout(() => {
    console.log('⏰ 5 dakika hareketsizlik - Otomatik çıkış yapılıyor...');
    logoutDueToInactivity();
  }, INACTIVITY_TIMEOUT);
}

// Timer'ı sıfırla (her aktivitede çağrılır)
function resetInactivityTimer() {
  startInactivityTimer();
}

// Hareketsizlik nedeniyle çıkış
async function logoutDueToInactivity() {
  console.log('🚪 Hareketsizlik nedeniyle oturum sonlandırılıyor...');
  
  // Önce logout yap
  const { error } = await supabaseClient.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error);
  }
  
  // Session storage'ı temizle
  sessionStorage.removeItem('redirectAfterLogin');
  
  // Popup uyarısı göster
  showInactivityPopup();
}

// ============================================
// INACTIVITY POPUP
// ============================================

function showInactivityPopup() {
  // Popup HTML'ini oluştur
  const popupHTML = `
    <div id="inactivityPopup" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(5px);
    ">
      <div style="
        background: white;
        border-radius: 16px;
        padding: 40px;
        max-width: 450px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: popupSlideIn 0.3s ease-out;
      ">
        <div style="
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        
        <h2 style="
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 600;
          color: #1a202c;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          Oturum Süresi Doldu
        </h2>
        
        <p style="
          margin: 0 0 32px 0;
          font-size: 16px;
          color: #4a5568;
          line-height: 1.6;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          Hesabınız 5 dakika boyunca hareketsiz kaldığı için güvenlik nedeniyle oturumunuz sonlandırıldı.
        </p>
        
        <button id="inactivityPopupBtn" style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 40px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        "
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.5)';"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)';"
        >
          Tekrar Giriş Yap
        </button>
      </div>
    </div>
    
    <style>
      @keyframes popupSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    </style>
  `;
  
  // Popup'ı sayfaya ekle
  document.body.insertAdjacentHTML('beforeend', popupHTML);
  
  // Butona tıklama eventi ekle
  document.getElementById('inactivityPopupBtn').addEventListener('click', function() {
    // Login sayfasına yönlendir
    window.location.replace('/login');
  });
  
  // Escape tuşu ile de kapatabilsin
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      window.location.replace('/login');
    }
  });
}

// ============================================
// ACTIVITY LISTENERS
// ============================================

// Aktivite olaylarını dinle
function setupActivityListeners() {
  // Sadece site içindeki GERÇEK aktiviteleri dinle
  // mousemove ve keypress KALDIRILDI - bunlar genel sistem aktiviteleri
  const activityEvents = [
    'click',        // Site içinde herhangi bir yere tıklama
    'scroll',       // Site içinde scroll yapma
    'touchstart'    // Mobil dokunma
  ];
  
  activityEvents.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
  });
  
  console.log('👂 Aktivite dinleyicileri kuruldu (sadece click ve scroll)');
}

// Sayfa yüklendiğinde aktivite dinleyicilerini kur
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupActivityListeners);
} else {
  setupActivityListeners();
}

// ============================================
// LOGIN REDIRECT
// ============================================

// Login sayfasına yönlendirme
function redirectToLogin() {
  // Timer'ı temizle
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  
  // Mevcut sayfayı kaydet (geri dönüş için)
  const currentPath = window.location.pathname;
  sessionStorage.setItem('redirectAfterLogin', currentPath);
  
  // Login sayfasına yönlendir
  // replace kullanarak history'den sil (geri tuşu ile dönemesin)
  window.location.replace('/login');
}

// ============================================
// MANUAL LOGOUT
// ============================================

// Çıkış fonksiyonu (tüm sayfalarda kullanılabilir)
async function logout() {
  // Timer'ı temizle
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  
  const { error } = await supabaseClient.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error);
    alert('Çıkış yapılırken bir hata oluştu.');
  } else {
    console.log('✅ Çıkış yapıldı');
    window.location.replace('/login');
  }
}

// ============================================
// PAGE VISIBILITY CHECKS
// ============================================

// Sayfa görünür olduğunda tekrar kontrol et
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    // Sayfa tekrar görünür oldu, auth kontrolü yap
    checkAuthenticationSync();
  }
});

// Sayfa focus aldığında tekrar kontrol et (geri tuşu için)
window.addEventListener('focus', function() {
  checkAuthenticationSync();
});

// Senkron auth kontrolü (hızlı kontrol)
async function checkAuthenticationSync() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
      console.log('❌ Oturum bulunamadı - yönlendiriliyor...');
      redirectToLogin();
    } else {
      // Session varsa timer'ı resetle
      resetInactivityTimer();
    }
  } catch (err) {
    console.error('Auth check error:', err);
    redirectToLogin();
  }
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// Global olarak erişilebilir yap
window.logout = logout;
window.supabaseClient = supabaseClient;

// Logo tıklama yönlendirmesi için helper fonksiyon
window.handleLogoClick = function(event) {
  // Eğer currentUser varsa (giriş yapmışsa)
  if (window.currentUser) {
    // Dashboard'a git (varsayılan href zaten dashboard)
    return true;
  } else {
    // Giriş yapmamış, ana sayfaya git
    event.preventDefault();
    window.location.href = '/index.html';
    return false;
  }
};

console.log('🔐 Auth Guard aktif - İnaktivite süresi: 5 dakika');
