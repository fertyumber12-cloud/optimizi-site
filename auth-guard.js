// ============================================
// AUTHENTICATION GUARD
// ============================================
// Bu dosya sayfaları korur - login olmayan kullanıcıları engeller

// Supabase Configuration
const SUPABASE_URL = 'https://gktvludkrsxnpigydqml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdHZsdWRrcnN4bnBpZ3lkcW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTI5OTQsImV4cCI6MjA4NjEyODk5NH0.GE9KbO7dx_W7BYihAzvJl744R317xEA8Ars98UW-VWo';

// Supabase client'ı başlat
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    }
  } catch (err) {
    console.error('Unexpected auth error:', err);
    redirectToLogin();
  }
})();

// Login sayfasına yönlendirme
function redirectToLogin() {
  // Mevcut sayfayı kaydet (geri dönüş için)
  const currentPath = window.location.pathname;
  sessionStorage.setItem('redirectAfterLogin', currentPath);
  
  // Login sayfasına yönlendir
  // replace kullanarak history'den sil (geri tuşu ile dönemesin)
  window.location.replace('/login');
}

// Çıkış fonksiyonu (tüm sayfalarda kullanılabilir)
async function logout() {
  const { error } = await supabaseClient.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error);
    alert('Çıkış yapılırken bir hata oluştu.');
  } else {
    console.log('✅ Çıkış yapıldı');
    window.location.replace('/login');
  }
}

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
    }
  } catch (err) {
    console.error('Auth check error:', err);
    redirectToLogin();
  }
}

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

console.log('🔐 Auth Guard aktif');
