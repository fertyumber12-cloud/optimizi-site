// ============================================================================
// OPTİMİZİ - BROWSER SABİTLER & DOĞRULAMA
// HTML <script> tag ile yüklemek için (ES Module değil)
// ============================================================================
window.OPT = window.OPT || {};

// ─── BORU DIŞ ÇAPLARI (mm) ─── DIN EN 10220 ───
window.OPT.PIPES = {
  15:21.3, 20:26.7, 25:33.7, 32:42.4, 40:48.3,
  50:60.3, 65:76.1, 80:88.9, 100:114.3, 125:139.7,
  150:168.3, 200:219.1, 250:273.0, 300:323.9,
  350:355.6, 400:406.4, 500:508.0
};

// ─── SEPARATÖR YÜZEYLERİ (m²) ───
window.OPT.SEPARATORS = {
  15:0.15, 20:0.18, 25:0.22, 32:0.28, 40:0.35,
  50:0.45, 65:0.60, 80:0.75, 100:1.10, 125:1.45,
  150:1.90, 200:2.80
};

// ─── YALITIM MALZEMELERİ ─── λ(T) = a + bT + cT² ───
window.OPT.MATS = {
  rockwool:  { a:0.035,  b:0.00017,  c:0,       maxTemp:650,  minTemp:-50,  name:"Taş Yünü" },
  glasswool: { a:0.025,  b:0.00015,  c:0,       maxTemp:250,  minTemp:-50,  name:"Cam Yünü" },
  ceramic:   { a:0.025,  b:0.00012,  c:1.2e-7,  maxTemp:1200, minTemp:0,    name:"Seramik Fiber" },
  aerogel:   { a:0.019,  b:0.00004,  c:5e-8,    maxTemp:650,  minTemp:-200, name:"Aerogel" },
  rubber:    { a:0.034,  b:0.000075, c:0,        maxTemp:105,  minTemp:-50,  name:"Elastomerik Kauçuk" },
  bare:      { a:25,     b:0,        c:0,        maxTemp:9999, minTemp:-273, name:"Çıplak (İzolasyonsuz)" }
};

// ─── VANA FAKTÖRLERİ ───
window.OPT.VALVE_FACTORS = {
  gate:1.2, globe:1.4, butterfly:0.6, ball:1.0,
  strainer:1.5, check:0.9,
  trap_float:1.6, trap_thermo:0.8, trap_bimetal:1.0, trap_bucket:1.5,
  flange:0.35
};

// ─── YAKIT PARAMETRELERİ ───
window.OPT.FUEL_PARAMS = {
  gas:      { lhv:8250,  co2:0.202, unit:"m³",  name:"Doğalgaz" },
  elec:     { lhv:860,   co2:0.478, unit:"kWh", name:"Elektrik" },
  lng:      { lhv:11500, co2:0.220, unit:"kg",  name:"LNG" },
  fueloil:  { lhv:9600,  co2:0.270, unit:"kg",  name:"Fuel Oil" },
  coal_imp: { lhv:6000,  co2:0.340, unit:"kg",  name:"İthal Kömür" },
  coal_loc: { lhv:3500,  co2:0.380, unit:"kg",  name:"Yerli Linyit" }
};

window.OPT.CO2_FACTORS = {
  gas:0.202, elec:0.440, lng:0.226, fueloil:0.279,
  coal_imp:0.340, coal_loc:0.380, manual:0.300
};

// ─── MİNİMUM KALINLIKLAR (mm) ───
window.OPT.MIN_THICKNESS = {
  rockwool:  { pipe:25, flat:20 },
  glasswool: { pipe:25, flat:20 },
  ceramic:   { pipe:13, flat:10 },
  aerogel:   { pipe:5,  flat:3  },
  rubber:    { pipe:9,  flat:6  },
  pu:        { pipe:20, flat:15 }
};

// ─── KAZAN YAKITLARI ───
window.OPT.BOILER_FUELS = {
  gas:         { val:8250,  unit:'m³',   eUnit:'kcal/m³' },
  lng:         { val:11500, unit:'kg',   eUnit:'kcal/kg' },
  fueloil:     { val:9600,  unit:'kg',   eUnit:'kcal/kg' },
  motorin:     { val:10200, unit:'kg',   eUnit:'kcal/kg' },
  komur:       { val:6000,  unit:'kg',   eUnit:'kcal/kg' },
  komur_yerli: { val:3500,  unit:'kg',   eUnit:'kcal/kg' },
  custom:      { val:0,     unit:'birim', eUnit:'kcal/birim' }
};

// ─── YOĞUŞMA MALZEMELERİ ───
window.OPT.CONDENSATION_MATS = [
  { name:'Elastomerik Kauçuk', lambda:0.037, thicknesses:[9,13,19,25,32] },
  { name:'Taşyünü (Rockwool)', lambda:0.040, thicknesses:[30,40,50,60,80,100] },
  { name:'Camyünü (Glasswool)', lambda:0.038, thicknesses:[30,40,50,60,80,100] },
  { name:'Poliüretan (PUR)',    lambda:0.028, thicknesses:[30,40,50,60,80] },
  { name:'Aerogel',             lambda:0.015, thicknesses:[5,10,15,20] }
];

// ============================================================================
// DOĞRULAMA (VALIDATION) FONKSİYONU
// ============================================================================
window.OPT.validate = function(params) {
  const errors = [];
  const { type, tProc, tAmb, matKey, thk, vWind, eff, hours, qty, pLen } = params;
  const mat = window.OPT.MATS[matKey];

  // 1) Malzeme sıcaklık limiti
  if (mat && matKey !== 'bare') {
    if (tProc > mat.maxTemp) {
      errors.push({ severity:'block', field:'matKey',
        message:`${mat.name} maksimum ${mat.maxTemp}°C'de kullanılabilir! Proses sıcaklığınız ${tProc}°C. Daha yüksek sınıf malzeme seçin.` });
    }
    if (tProc < mat.minTemp) {
      errors.push({ severity:'block', field:'matKey',
        message:`${mat.name} minimum ${mat.minTemp}°C'de kullanılabilir! Proses sıcaklığınız ${tProc}°C.` });
    }
  }

  // 2) Ters sıcaklık farkı
  if (type !== 'chiller' && tProc !== undefined && tAmb !== undefined && tProc < tAmb) {
    errors.push({ severity:'warn', field:'tProc',
      message:`Proses sıcaklığı (${tProc}°C) ortamdan (${tAmb}°C) düşük. Soğutma hattı hesabı için Chiller modülünü kullanın.` });
  }

  // 3) Minimum kalınlık (üretilebilirlik)
  if (matKey !== 'bare' && thk > 0) {
    const min = window.OPT.MIN_THICKNESS[matKey];
    if (min) {
      const limit = (type === 'tank') ? min.flat : min.pipe;
      if (thk < limit) {
        errors.push({ severity:'warn', field:'thk',
          message:`${mat?.name || matKey} için minimum üretilebilir kalınlık: ${limit}mm. ${thk}mm pratik olarak sarılamaz.` });
      }
    }
  }

  // 4) Aşırı kalınlık
  if (thk > 300) {
    errors.push({ severity:'warn', field:'thk',
      message:`${thk}mm izolasyon kalınlığı alışılmadık derecede yüksek. Kontrol edin.` });
  }

  // 5) Verim
  if (eff !== undefined) {
    if (eff <= 0 || eff > 1) {
      errors.push({ severity:'block', field:'eff',
        message:`Verim 0-1 arasında olmalı (girilen: ${eff}). %90 verim için 0.90 girin.` });
    }
    if (eff > 0 && eff < 0.5) {
      errors.push({ severity:'warn', field:'eff',
        message:`Verim %${(eff*100).toFixed(0)} çok düşük. Tipik: %80-95.` });
    }
  }

  // 6) Çalışma saati
  if (hours !== undefined) {
    if (hours > 8760) {
      errors.push({ severity:'block', field:'hours',
        message:`Yıllık çalışma saati 8760'ı aşamaz (365×24). Girilen: ${hours}` });
    }
    if (hours <= 0) {
      errors.push({ severity:'block', field:'hours', message:'Çalışma saati 0\'dan büyük olmalı.' });
    }
  }

  // 7) Rüzgar hızı
  if (vWind !== undefined && vWind > 30) {
    errors.push({ severity:'warn', field:'vWind',
      message:`${vWind} m/s fırtına seviyesi! İç mekan: 0, dış mekan: 3-5 m/s önerilir.` });
  }

  // 8) Miktar & Uzunluk
  if (qty !== undefined && qty <= 0) {
    errors.push({ severity:'block', field:'qty', message:'Miktar 0\'dan büyük olmalı.' });
  }
  if (type === 'pipe' && pLen !== undefined && pLen <= 0) {
    errors.push({ severity:'block', field:'pLen', message:'Boru uzunluğu 0\'dan büyük olmalı.' });
  }

  return errors;
};

// Yardımcı: BLOCK hatası var mı?
window.OPT.hasBlocker = function(errors) {
  return errors.some(function(e) { return e.severity === 'block'; });
};

// Yardımcı: Hataları HTML'e çevir (Tailwind dark tema uyumlu)
window.OPT.renderErrors = function(errors) {
  if (!errors || errors.length === 0) return '';
  return errors.map(function(e) {
    var isBlock = e.severity === 'block';
    var icon = isBlock ? '🛑' : '⚠️';
    var bg = isBlock ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30';
    var text = isBlock ? 'text-red-300' : 'text-amber-300';
    return '<div class="flex items-start gap-2 p-3 rounded-lg border ' + bg + ' text-sm">' +
      '<span class="text-lg leading-none shrink-0">' + icon + '</span>' +
      '<span class="' + text + '">' + e.message + '</span></div>';
  }).join('');
};
