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
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 dakika (milisaniye cinsinden)
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
  console.log('🕐 İnaktivite timer başlatıldı (10 dakika)');
  
  // Önceki timer varsa temizle
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  
  // Yeni timer başlat
  inactivityTimer = setTimeout(() => {
    console.log('⏰ 10 dakika hareketsizlik - Otomatik çıkış yapılıyor...');
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
  
  const { error } = await supabaseClient.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error);
  }
  
  // Session storage'ı temizle
  sessionStorage.removeItem('redirectAfterLogin');
  
  // Login sayfasına yönlendir
  window.location.replace('/login');
}

// Aktivite olaylarını dinle
function setupActivityListeners() {
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];
  
  activityEvents.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
  });
  
  console.log('👂 Aktivite dinleyicileri kuruldu');
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

console.log('🔐 Auth Guard aktif - İnaktivite süresi: 10 dakika');
