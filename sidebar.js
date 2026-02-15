// =============================================
// ORTAK SIDEBAR - sidebar.js
// Tüm sayfalar bu dosyayı kullanır
// =============================================

let isSidebarCollapsed = false;

function renderSidebar() {
  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  const aside = document.getElementById('mainSidebar');
  if (!aside) return;

  function isActive(p) { return page === p ? 'active' : ''; }
  function isActiveLink(p) { return page === p ? 'color:#6366f1;font-weight:700' : ''; }
  const isTeklif = ['teklif-yonetimi.html','teklif-olustur.html','hizli-teklif.html','musteri-ekle.html'].includes(page);

  aside.className = 'w-64 h-full glass-panel flex flex-col z-20 hidden md:flex border-r border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 transition-all duration-300';

  aside.innerHTML = `
    <div class="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5">
      <a href="dashboard.html" class="flex items-center gap-2 overflow-hidden logo-text hover:opacity-80 transition-opacity duration-200 cursor-pointer">
        <span class="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Optimizi<span class="text-indigo-500 dark:text-indigo-400">.App</span></span>
      </a>
      <button onclick="toggleSidebar()" class="text-slate-400 hover:text-indigo-600 transition"><i data-lucide="panel-left" class="w-5 h-5"></i></button>
    </div>

    <div class="flex-1 overflow-y-auto py-6 px-4 custom-scroll">
      <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 mb-2 sidebar-title">Genel</div>
      <a href="dashboard.html" class="sidebar-link ${isActive('dashboard.html')}"><i data-lucide="layout-dashboard"></i> <span>Proje Panel</span></a>
      <a href="teklif-yonetimi.html" class="sidebar-link ${isTeklif && page==='teklif-yonetimi.html'?'active':''}"><i data-lucide="shopping-cart"></i> <span>Satış Teklif Panel</span></a>
      <a href="projelerim.html" class="sidebar-link ${isActive('projelerim.html')}"><i data-lucide="folder-open"></i> <span>Projelerim</span></a>

      <div class="mt-6">
        <button onclick="toggleSubmenu('offerMenu', this)" class="sidebar-link justify-between group ${isTeklif?'active':''}">
          <div class="flex items-center gap-3"><i data-lucide="file-text"></i> <span>Teklif Yönetimi</span></div>
          <i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300 text-slate-400 chevron" ${isTeklif?'style="transform:rotate(180deg)"':''}></i>
        </button>
        <div id="offerMenu" class="submenu ${isTeklif?'open':''}">
          <div class="submenu-item group/item"><a href="teklif-yonetimi.html" class="submenu-link" style="${isActiveLink('teklif-yonetimi.html')}">Teklif Paneli</a></div>
          <div class="submenu-item group/item"><a href="musteri-ekle.html" class="submenu-link" style="${isActiveLink('musteri-ekle.html')}">Müşteri Ekle</a><button onclick="window.location.href='musteri-ekle.html'" class="quick-action-btn" title="Yeni Müşteri"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button></div>
          <div class="submenu-item group/item"><a href="teklif-olustur.html" class="submenu-link" style="${isActiveLink('teklif-olustur.html')}">Teklif Oluştur</a><button onclick="window.location.href='teklif-olustur.html'" class="quick-action-btn" title="Yeni Teklif"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button></div>
          <div class="submenu-item group/item"><a href="hizli-teklif.html" class="submenu-link" style="${isActiveLink('hizli-teklif.html')}">Hızlı Teklif Ver</a></div>
        </div>
      </div>

      <div class="mt-1">
        <button onclick="toggleSubmenu('salesMenu', this)" class="sidebar-link justify-between group">
          <div class="flex items-center gap-3"><i data-lucide="shopping-bag"></i> <span>Satış Yönetimi</span></div>
          <i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300 text-slate-400 chevron"></i>
        </button>
        <div id="salesMenu" class="submenu">
          <div class="submenu-item group/item"><a href="#" onclick="if(typeof showNotification==='function')showNotification('Bilgi','Satış listesi yakında.','info')" class="submenu-link">Satış Listesi</a><button onclick="if(typeof quickAction==='function')quickAction('sale')" class="quick-action-btn" title="Yeni Satış Gir"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button></div>
        </div>
      </div>

      <div class="mt-1">
        <button onclick="toggleSubmenu('prodMenu', this)" class="sidebar-link justify-between group">
          <div class="flex items-center gap-3"><i data-lucide="factory"></i> <span>Üretim Yönetimi</span></div>
          <i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300 text-slate-400 chevron"></i>
        </button>
        <div id="prodMenu" class="submenu">
          <div class="submenu-item group/item"><a href="#" onclick="if(typeof showNotification==='function')showNotification('Bilgi','Üretim Takibi yakında.','info')" class="submenu-link">Üretim Takibi</a></div>
          <div class="submenu-item group/item"><a href="#" onclick="if(typeof showNotification==='function')showNotification('Bilgi','Üretim Raporları yakında.','info')" class="submenu-link">Üretim Raporları</a></div>
          <div class="submenu-item group/item"><a href="#" onclick="toggleSubmenu('stockSubMenu', this.parentElement); return false;" class="submenu-link justify-between">Stok Durumu <i data-lucide="chevron-down" class="w-3 h-3 opacity-50"></i></a></div>
          <div id="stockSubMenu" class="submenu pl-2 border-l border-slate-200 dark:border-slate-700 ml-4">
            <div class="submenu-item group/item"><a href="#" onclick="if(typeof quickAction==='function')quickAction('stockIn')" class="submenu-link text-[11px]">- Hammadde Girdisi</a></div>
            <div class="submenu-item group/item"><a href="#" onclick="if(typeof quickAction==='function')quickAction('stockOut')" class="submenu-link text-[11px]">- Hammadde Çıktısı</a></div>
          </div>
        </div>
      </div>

      <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 mb-2 mt-6 sidebar-title">Analiz Araçları</div>
      <div class="mt-1">
        <button onclick="toggleSubmenu('toolsMenu', this)" class="sidebar-link justify-between group">
          <div class="flex items-center gap-3"><i data-lucide="calculator"></i> <span>Araçlar</span></div>
          <i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300 text-slate-400 chevron"></i>
        </button>
        <div id="toolsMenu" class="submenu">
          <div class="submenu-item"><a href="tool/anlik-kayip.html" class="submenu-link">Saha Kayıp Analizi</a></div>
          <div class="submenu-item"><a href="tool/roi.html" class="submenu-link">Termal ROI</a></div>
          <div class="submenu-item"><a href="tool/yalitim-performans.html" class="submenu-link">Optimum Kalınlık</a></div>
          <div class="submenu-item"><a href="tool/yogusma-hesaplama.html" class="submenu-link">Yoğuşma Kontrol</a></div>
          <div class="submenu-item"><a href="tool/chiller-roi.html" class="submenu-link">Chiller ROI</a></div>
          <div class="submenu-item"><a href="tool/boiler.html" class="submenu-link">Kazan Verimliliği</a></div>
          <div class="submenu-item"><a href="qryonetim.html" class="submenu-link">QR Oluşturucu</a></div>
        </div>
      </div>

      <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 mb-2 mt-6 sidebar-title">Yönetim</div>
      <div class="mt-1">
        <button onclick="toggleSubmenu('adminMenu', this)" class="sidebar-link justify-between group">
          <div class="flex items-center gap-3"><i data-lucide="building-2"></i> <span>Şirket Yönetimi</span></div>
          <i data-lucide="lock" class="w-3 h-3 text-slate-400 chevron"></i>
        </button>
        <div id="adminMenu" class="submenu">
          <div class="submenu-item"><a href="#" onclick="if(typeof checkAdminAccess==='function')checkAdminAccess()" class="submenu-link">Şirket Raporları</a></div>
          <div class="submenu-item"><a href="#" onclick="if(typeof checkAdminAccess==='function')checkAdminAccess()" class="submenu-link">Nakit Akış</a></div>
          <div class="submenu-item"><a href="#" onclick="if(typeof checkAdminAccess==='function')checkAdminAccess()" class="submenu-link">Personel Yönetimi</a></div>
        </div>
      </div>

      <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 mb-2 mt-6 sidebar-title">Sistem</div>
      <button onclick="if(typeof openSettings==='function')openSettings()" class="sidebar-link"><i data-lucide="settings"></i> <span>Ayarlar</span></button>
      <a href="iletisim.html" class="sidebar-link"><i data-lucide="life-buoy"></i> <span>Destek</span></a>
    </div>

    <div class="p-4 border-t border-slate-200 dark:border-white/5">
      <div onclick="if(typeof openSettings==='function')openSettings()" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 transition cursor-pointer group">
        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-105 transition shrink-0" id="avatarInitial">U</div>
        <div class="flex-1 min-w-0 user-info">
          <p class="text-sm font-bold text-slate-800 dark:text-white truncate" id="sidebarUserName">Yükleniyor...</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 truncate">Hesap Ayarları</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 chevron"></i>
      </div>
    </div>
  `;

  lucide.createIcons();
}

// Sidebar kullanıcı bilgilerini güncelle - her sayfa initPage'den bunu çağırmalı
function updateSidebarUser(fullName) {
  const firstName = fullName.split(' ')[0];
  const el1 = document.getElementById('sidebarUserName');
  const el2 = document.getElementById('avatarInitial');
  if (el1) el1.textContent = fullName;
  if (el2) el2.textContent = firstName.charAt(0).toUpperCase();
}

// === SIDEBAR FUNCTIONS ===
function toggleSidebar() {
  isSidebarCollapsed = !isSidebarCollapsed;
  document.getElementById('mainSidebar').classList.toggle('collapsed');
}

function toggleSubmenu(id, btn) {
  if (isSidebarCollapsed) return;
  const m = document.getElementById(id);
  const ic = btn ? btn.querySelector('.chevron') : null;
  if (m.classList.contains('open')) {
    m.classList.remove('open');
    if (ic) ic.style.transform = 'rotate(0deg)';
  } else {
    m.classList.add('open');
    if (ic) ic.style.transform = 'rotate(180deg)';
  }
}

// Render hemen çalışsın - DOMContentLoaded beklemeden
// Çünkü script body içinde aside'dan sonra yükleniyor
if (document.getElementById('mainSidebar')) {
  renderSidebar();
} else {
  document.addEventListener('DOMContentLoaded', renderSidebar);
}
