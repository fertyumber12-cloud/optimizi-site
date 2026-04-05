/**
 * Optimizi Üretim Sistemi — API Client
 * app/js/api.js
 *
 * Mevcut auth.js ile çalışır. window.supabaseClient kullanır.
 * FastAPI yok — Supabase'e direkt bağlantı.
 */

const OPT = (() => {
  // Mevcut auth.js'deki supabaseClient'ı kullan
  const sb = () => window.supabaseClient;

  // ── HATA YÖNETİMİ ──
  function check(res, label) {
    if (res.error) {
      console.error(`[OPT] ${label}:`, res.error.message);
      throw new Error(res.error.message);
    }
    return res.data;
  }

  // ── DURUM RENKLERİ (cache) ──
  let _durumlar = null;
  async function getDurumlar() {
    if (_durumlar) return _durumlar;
    const { data } = await sb().from('opt_durum_tanimlari').select('*').eq('aktif', true).order('sira');
    _durumlar = data || [];
    return _durumlar;
  }
  function stCol(kod) {
    if (!_durumlar) return '#6b7280';
    return (_durumlar.find(d => d.kod === kod) || { renk: '#6b7280' }).renk;
  }
  function clearDurumCache() { _durumlar = null; }

  // ── AŞAMA ŞABLONLARI (cache) ──
  let _asamalar = null;
  async function getAsamaSablonlari() {
    if (_asamalar) return _asamalar;
    const { data } = await sb().from('opt_asama_sablonlari').select('*').eq('aktif', true).order('sira');
    _asamalar = data || [];
    return _asamalar;
  }

  // ── SİPARİŞLER ──
  const siparisler = {
    async list(filters = {}) {
      let q = sb().from('opt_siparisler')
        .select('*, opt_uretim(uretim_pct, tasarimdan_aktarildi, teslim_tarihi)')
        .order('created_at', { ascending: false })
        .limit(300);
      if (filters.q) q = q.or(`siparis_no.ilike.%${filters.q}%,musteri_adi.ilike.%${filters.q}%`);
      if (filters.durum) q = q.eq('siparis_durumu', filters.durum);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },

    async get(id) {
      const { data, error } = await sb().from('opt_siparisler')
        .select('*, opt_uretim(*), opt_dokumanlar(*), opt_siparis_log(*)')
        .eq('id', id).single();
      if (error) throw new Error(error.message);
      return data;
    },

    async create(body) {
      const user = (await sb().auth.getUser()).data.user;
      const { data, error } = await sb().from('opt_siparisler')
        .insert({ ...body, olusturan_id: user?.id, olusturan_adi: body.olusturan_adi || user?.email })
        .select().single();
      if (error) throw new Error(error.message);
      // Boş üretim kaydı oluştur
      await sb().from('opt_uretim').upsert({ siparis_id: data.id, uretim_pct: 0, tasarimdan_aktarildi: false, asamalar: [], gorevler: [] }).select();
      // Log
      await log(data.id, 'sistem', 'Sipariş oluşturuldu', '#6366f1');
      await aktiviteLog('sistem', `"${body.siparis_no}" oluşturuldu`, body.musteri_adi, '#6366f1');
      // Tasarımdaysa bildir
      if (body.siparis_durumu === 'Tasarımda') {
        await bildirimGonder('tasarim', `Yeni tasarım: ${body.siparis_no}`, `${body.musteri_adi} siparişi tasarım için hazır`, '#8b5cf6');
      }
      return data;
    },

    async update(id, body) {
      const old = await siparisler.get(id).catch(() => null);
      const { data, error } = await sb().from('opt_siparisler').update(body).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      // Durum değiştiyse
      if (old && body.siparis_durumu && body.siparis_durumu !== old.siparis_durumu) {
        await log(id, 'sistem', `Durum: ${old.siparis_durumu} → ${body.siparis_durumu}`, stCol(body.siparis_durumu));
        await aktiviteLog('sistem', `"${old.siparis_no}" durum güncellendi`, `${old.siparis_durumu} → ${body.siparis_durumu}`, stCol(body.siparis_durumu));
        if (body.siparis_durumu === 'Tasarımda') {
          await bildirimGonder('tasarim', `Tasarım görevi: ${old.siparis_no}`, old.musteri_adi, '#8b5cf6');
        } else if (['Üretimde', 'Tamamlandı'].includes(body.siparis_durumu)) {
          await sb().from('opt_uretim').upsert({ siparis_id: id, tasarimdan_aktarildi: true, aktarilma_tarihi: new Date().toISOString() });
          await bildirimGonder('uretim', `Üretime aktarıldı: ${old.siparis_no}`, old.musteri_adi, '#10b981');
        }
      }
      return data;
    },

    async delete(id) {
      const old = await siparisler.get(id).catch(() => null);
      const { error } = await sb().from('opt_siparisler').delete().eq('id', id);
      if (error) throw new Error(error.message);
      if (old) await aktiviteLog('sistem', `"${old.siparis_no}" silindi`, old.musteri_adi, '#ef4444');
    },

    async changeDurum(id, yeniDurum) {
      return siparisler.update(id, { siparis_durumu: yeniDurum });
    },

    async updateMaliyet(id, estItems, estTotal) {
      const { error } = await sb().from('opt_siparisler').update({ est_items: estItems, est_total: estTotal }).eq('id', id);
      if (error) throw new Error(error.message);
    },

    async getLog(id) {
      const { data } = await sb().from('opt_siparis_log').select('*').eq('siparis_id', id).order('created_at', { ascending: false }).limit(50);
      return data || [];
    },

    async getDokumanlar(id) {
      const { data } = await sb().from('opt_dokumanlar').select('*').eq('siparis_id', id).order('created_at', { ascending: false });
      return data || [];
    },

    async deleteDokuman(sipId, docId) {
      await sb().from('opt_dokumanlar').delete().eq('id', docId);
    },

    async stats() {
      const { data } = await sb().from('opt_siparisler').select('siparis_durumu, asama, satis_tutar, satis_birim, est_total, opt_uretim(uretim_pct)');
      return data || [];
    }
  };

  // ── ÜRETİM ──
  const uretim = {
    async list() {
      const { data, error } = await sb().from('opt_siparisler')
        .select('*, opt_uretim(*)')
        .neq('siparis_durumu', 'İptal')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },

    async get(siparisId) {
      const { data } = await sb().from('opt_uretim').select('*').eq('siparis_id', siparisId).single();
      if (!data) {
        const { data: nd } = await sb().from('opt_uretim').upsert({ siparis_id: siparisId, uretim_pct: 0, tasarimdan_aktarildi: false, asamalar: [], gorevler: [] }).select().single();
        return nd;
      }
      return data;
    },

    async update(siparisId, body) {
      const { data, error } = await sb().from('opt_uretim').upsert({ siparis_id: siparisId, ...body }).select().single();
      if (error) throw new Error(error.message);
      await aktiviteLog('uretim', 'Üretim verisi güncellendi', `${body.uretim_pct !== undefined ? body.uretim_pct + '%' : ''}`, '#8b5cf6');
      return data;
    },

    async transfer(siparisId) {
      // Üretim kaydını aktarıldı yap
      await sb().from('opt_uretim').upsert({ siparis_id: siparisId, tasarimdan_aktarildi: true, aktarilma_tarihi: new Date().toISOString() });
      // Sipariş durumunu Üretimde yap
      const { data: sip } = await sb().from('opt_siparisler').select('siparis_no, musteri_adi').eq('id', siparisId).single();
      await sb().from('opt_siparisler').update({ siparis_durumu: 'Üretimde' }).eq('id', siparisId);
      // Log + bildirim
      await log(siparisId, 'uretim', 'Tasarımdan üretime aktarıldı', '#10b981');
      await bildirimGonder('uretim', `Üretime aktarıldı: ${sip?.siparis_no}`, sip?.musteri_adi, '#10b981');
    }
  };

  // ── STOK ──
  const stok = {
    async list() {
      const { data } = await sb().from('opt_stok').select('*, opt_stok_kategorileri(ad)').eq('aktif', true).order('isim');
      return data || [];
    },
    async kategoriler() {
      const { data } = await sb().from('opt_stok_kategorileri').select('*');
      return data || [];
    },
    async hareketler(limit = 100) {
      const { data } = await sb().from('opt_stok_hareketler')
        .select('*, opt_stok(isim,birim), opt_siparisler(siparis_no)')
        .order('created_at', { ascending: false }).limit(limit);
      return data || [];
    },
    async addHareket(body) {
      const user = (await sb().auth.getUser()).data.user;
      const { data, error } = await sb().from('opt_stok_hareketler').insert({ ...body, yapan_id: user?.id, toplam_tutar: body.birim_fiyat ? body.miktar * body.birim_fiyat : null }).select().single();
      if (error) throw new Error(error.message);
      // Stok miktarını güncelle
      const { data: s } = await sb().from('opt_stok').select('stok_miktari').eq('id', body.stok_id).single();
      if (s) {
        const cur = Number(s.stok_miktari || 0);
        const yeni = body.hareket_tipi === 'giris' ? cur + body.miktar : body.hareket_tipi === 'cikis' ? Math.max(0, cur - body.miktar) : body.miktar;
        await sb().from('opt_stok').update({ stok_miktari: yeni }).eq('id', body.stok_id);
      }
      await aktiviteLog('stok', `Stok ${body.hareket_tipi}`, `Miktar: ${body.miktar}`, body.hareket_tipi === 'giris' ? '#10b981' : '#ef4444');
      return data;
    }
  };

  // ── PERSONEL ──
  const personel = {
    async list() {
      const { data } = await sb().from('opt_personel').select('*').eq('aktif', true).order('ad_soyad');
      return data || [];
    },
    async create(body) {
      const { data, error } = await sb().from('opt_personel').insert(body).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async update(id, body) {
      const { data, error } = await sb().from('opt_personel').update(body).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async delete(id) {
      await sb().from('opt_personel').update({ aktif: false }).eq('id', id);
    },
    async avgRate() {
      const { data } = await sb().from('opt_personel').select('saatlik_ucret').eq('aktif', true).gt('saatlik_ucret', 0);
      if (!data || !data.length) return 0;
      return Math.round(data.reduce((s, p) => s + Number(p.saatlik_ucret), 0) / data.length);
    }
  };

  // ── PROGRAM ──
  const program = {
    async list(birim) {
      let q = sb().from('opt_program').select('*, opt_siparisler(siparis_no,musteri_adi)').order('baslangic');
      if (birim) q = q.eq('birim', birim);
      const { data } = await q;
      return data || [];
    },
    async aylik(yil, ay) {
      const from = `${yil}-${String(ay).padStart(2,'0')}-01`;
      const lastDay = new Date(yil, ay, 0).getDate();
      const to = `${yil}-${String(ay).padStart(2,'0')}-${lastDay}`;
      const { data } = await sb().from('opt_program')
        .select('*, opt_siparisler(siparis_no,musteri_adi)')
        .gte('baslangic', from).lte('baslangic', to).order('baslangic');
      return data || [];
    },
    async create(body) {
      const user = (await sb().auth.getUser()).data.user;
      const { data, error } = await sb().from('opt_program').insert({ ...body, olusturan_id: user?.id }).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async tamamla(id) {
      const { data, error } = await sb().from('opt_program').update({ tamamlandi: true }).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async delete(id) {
      await sb().from('opt_program').delete().eq('id', id);
    }
  };

  // ── ADMIN ──
  const admin = {
    async durumlar() {
      clearDurumCache();
      return getDurumlar();
    },
    async createDurum(body) {
      clearDurumCache();
      const { data, error } = await sb().from('opt_durum_tanimlari').insert(body).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async updateDurum(id, body) {
      clearDurumCache();
      const { data, error } = await sb().from('opt_durum_tanimlari').update(body).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async deleteDurum(id) {
      clearDurumCache();
      await sb().from('opt_durum_tanimlari').update({ aktif: false }).eq('id', id);
    },
    async asamaSablonlari() {
      _asamalar = null;
      return getAsamaSablonlari();
    },
    async updateAsamaSablonlari(list) {
      _asamalar = null;
      // Hepsini devre dışı bırak, yenilerini ekle
      await sb().from('opt_asama_sablonlari').update({ aktif: false }).not('id', 'is', null);
      for (let i = 0; i < list.length; i++) {
        await sb().from('opt_asama_sablonlari').insert({ asama_adi: list[i].asama_adi, agirlik: list[i].agirlik, sira: i + 1, aktif: true });
      }
    },
    async users() {
      const { data } = await sb().from('profiles').select('id, full_name, opt_role, opt_initials, opt_color, created_at');
      return (data || []).map(u => ({ ...u, name: u.full_name || '—', role: u.opt_role || 'izleyici', initials: u.opt_initials || (u.full_name || '?')[0].toUpperCase(), avatar_color: u.opt_color || '#6366f1' }));
    },
    async updateUser(id, body) {
      const update = {};
      if (body.name) update.full_name = body.name;
      if (body.role) update.opt_role = body.role;
      if (body.avatar_color) update.opt_color = body.avatar_color;
      if (body.initials) update.opt_initials = body.initials;
      const { data, error } = await sb().from('profiles').update(update).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  };

  // ── AKTİVİTE ──
  const aktivite = {
    async list(modul) {
      let q = sb().from('opt_aktivite').select('*').order('created_at', { ascending: false }).limit(60);
      if (modul && modul !== 'all') q = q.eq('modul', modul);
      const { data } = await q;
      return data || [];
    },
    async bildirimler() {
      const user = (await sb().auth.getUser()).data.user;
      if (!user) return [];
      const { data } = await sb().from('opt_bildirimler').select('*').eq('alici_id', user.id).order('created_at', { ascending: false }).limit(30);
      return data || [];
    },
    async markAllRead() {
      const user = (await sb().auth.getUser()).data.user;
      if (!user) return;
      await sb().from('opt_bildirimler').update({ okundu: true }).eq('alici_id', user.id).eq('okundu', false);
    },
    async sayac() {
      const user = (await sb().auth.getUser()).data.user;
      if (!user) return 0;
      const { count } = await sb().from('opt_bildirimler').select('*', { count: 'exact', head: true }).eq('alici_id', user.id).eq('okundu', false);
      return count || 0;
    }
  };

  // ── YARDIMCI FONKSİYONLAR ──
  async function log(siparisId, modul, mesaj, renk) {
    const user = (await sb().auth.getUser()).data.user;
    await sb().from('opt_siparis_log').insert({ siparis_id: siparisId, modul, mesaj, renk, yapan_id: user?.id });
  }

  async function aktiviteLog(modul, baslik, altBaslik, renk) {
    const user = (await sb().auth.getUser()).data.user;
    await sb().from('opt_aktivite').insert({ modul, baslik, alt_baslik: altBaslik, renk, yapan_id: user?.id });
  }

  async function bildirimGonder(rol, baslik, icerik, renk) {
    const { data: users } = await sb().from('profiles').select('id').eq('opt_role', rol);
    const me = (await sb().auth.getUser()).data.user;
    for (const u of (users || [])) {
      if (u.id !== me?.id) {
        await sb().from('opt_bildirimler').insert({ alici_id: u.id, baslik, icerik, renk });
      }
    }
  }

  // ── MEVCUT KULLANICI ──
  async function currentUser() {
    const { data: { user } } = await sb().auth.getUser();
    if (!user) return null;
    const { data: profile } = await sb().from('profiles').select('full_name, opt_role, opt_initials, opt_color').eq('id', user.id).single();
    return {
      id: user.id,
      email: user.email,
      name: profile?.full_name || user.email,
      role: profile?.opt_role || 'izleyici',
      initials: profile?.opt_initials || (profile?.full_name || user.email)[0].toUpperCase(),
      avatar_color: profile?.opt_color || '#6366f1'
    };
  }

  function hasRole(...roles) {
    const u = window._optCurrentUser;
    return u && roles.includes(u.role);
  }

  // ── PUBLIC API ──
  return {
    getDurumlar, stCol, getAsamaSablonlari,
    siparisler, uretim, stok, personel, program, admin, aktivite,
    currentUser, hasRole,
    log, aktiviteLog
  };
})();

// ── GLOBAL HELPERS ──
function toast(type, title, msg = '') {
  let wrap = document.getElementById('toastWrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toastWrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${ {success:'✓',error:'✕',info:'ℹ',warning:'⚠'}[type] || 'ℹ' }</span> <strong>${title}</strong>${msg ? ' '+msg : ''}`;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(110%)'; el.style.transition='all .3s'; setTimeout(()=>el.remove(),300); }, 3200);
}

let _confirmCb = null;
function showConfirm(msg, onYes, title='Onay', yesLabel='Evet') {
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmYesBtn').textContent = yesLabel;
  document.getElementById('confirmModal').style.display = 'flex';
  _confirmCb = onYes; if (typeof lucide !== 'undefined') lucide.createIcons();
}
function confirmResolve(yes) { document.getElementById('confirmModal').style.display='none'; if(yes&&_confirmCb)_confirmCb(); _confirmCb=null; }
function showAlert(msg, title='Bilgi') { document.getElementById('alertMsg').textContent=msg; document.getElementById('alertTitle').textContent=title; document.getElementById('alertModal').style.display='flex'; if(typeof lucide!=='undefined')lucide.createIcons(); }

function fmt(d) { if(!d)return'—'; try{return new Date(d).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'});}catch{return d;} }
function money(v) { if(v===null||v===undefined)return'—'; const n=Number(v); if(isNaN(n))return'—'; return'₺'+n.toLocaleString('tr-TR',{minimumFractionDigits:0,maximumFractionDigits:0}); }
function clamp(n,a,b) { return Math.max(a,Math.min(b,n)); }
function toTL(amt, birim) { const n=Number(amt)||0; const EUR=window._kurEUR||38; const USD=window._kurUSD||34; if(!birim||birim==='TRY')return n; if(birim==='EUR')return n*EUR; if(birim==='USD')return n*USD; return n; }
function parseTutar(s) { return parseFloat(String(s||0).replace(/\./g,'').replace(',','.'))||0; }

function toggleTheme() { const d=document.documentElement.classList.toggle('dark'); localStorage.setItem('optimizi:theme',d?'dark':'light'); if(typeof lucide!=='undefined')lucide.createIcons(); }
function toggleSidebar() { document.getElementById('appSidebar')?.classList.toggle('collapsed'); }
function toggleSubmenu(id) { const el=document.getElementById(id); const chv=document.getElementById('chv_'+id); const open=el?.classList.toggle('open'); if(chv)chv.style.transform=open?'rotate(180deg)':''; }

function renderTimeline(barId, calId, segs, events, avg) {
  const bar = document.getElementById(barId), cal = document.getElementById(calId);
  if (bar) {
    let left = 0;
    bar.innerHTML = segs.filter(s => s.pct > 0).map((s, i, arr) => {
      const isF = i===0, isL = i===arr.length-1;
      const br = isF&&isL?'8px':isF?'8px 0 0 8px':isL?'0 8px 8px 0':'0';
      const el = `<div class="tl-seg" title="${s.label}" style="left:${left.toFixed(1)}%;width:${s.pct.toFixed(1)}%;background:${s.color};border-radius:${br}"></div>`;
      left += s.pct; return el;
    }).join('');
    if (avg > 0 && avg < 100) bar.innerHTML += `<div class="tl-avg-line" style="left:${avg}%"></div><div class="tl-avg-label" style="left:${avg}%">ort. ${avg}%</div>`;
  }
  if (cal) {
    const now = new Date(), year = now.getFullYear(), month = now.getMonth();
    const days = new Date(year, month+1, 0).getDate(), today = now.getDate();
    const todayStr = now.toISOString().split('T')[0];
    const evByDay = {};
    (events||[]).forEach(ev => { if(!evByDay[ev.day])evByDay[ev.day]=[]; evByDay[ev.day].push(ev); });
    let html = '';
    for (let d = 1; d <= days; d++) {
      const pct = ((d-1)/Math.max(days-1,1))*100;
      const isToday = d===today, evs = evByDay[d]||[], hasEv = evs.length>0, isOver = evs.some(e=>e.overdue);
      const dt = new Date(year,month,d), dow = dt.getDay();
      const showNum = d===1||d===days||dow===0||dow===6||isToday||hasEv||d%5===0;
      let cls = 'tl-day'; if(isToday)cls+=' d-today'; else if(isOver)cls+=' d-overdue'; else if(hasEv)cls+=' d-event';
      html += `<div class="${cls}" style="left:${pct.toFixed(2)}%"><div class="tl-day-num" style="${showNum?'':'visibility:hidden'}">${d}</div><div class="tl-day-tick"></div>`;
      evs.forEach((ev, i) => { html += `<div class="tl-evt-dot" style="top:${-(16+i*12)}px;width:10px;height:10px;background:${ev.color}"><div class="tl-evt-tip">${ev.title}</div></div>`; });
      html += '</div>';
    }
    cal.innerHTML = html;
  }
}

// Kur bilgisi
(function() {
  fetch('https://api.frankfurter.app/latest?from=TRY&to=EUR,USD', {cache:'no-store'})
    .then(r=>r.json()).then(j=>{window._kurEUR=1/Number(j.rates.EUR);window._kurUSD=1/Number(j.rates.USD);
    const eu=document.getElementById('fxEur'),ud=document.getElementById('fxUsd');
    if(eu)eu.innerHTML=`<strong>EUR</strong> ${window._kurEUR.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    if(ud)ud.innerHTML=`<strong>USD</strong> ${window._kurUSD.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    if(typeof lucide!=='undefined')lucide.createIcons();
  }).catch(()=>{});
})();

// Dış tıklamada bildirim paneli kapat
document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  if (panel && panel.style.display !== 'none' && !e.target.closest('#notifPanel') && !e.target.closest('#notifBtn'))
    panel.style.display = 'none';
});
