// ============================================================================
// OPTİMİZİ - MÜHENDİSLİK DOĞRULAMA (VALIDATION) MODÜLÜ
// "Aptal geçirmez" (Fool-proof) katmanı
// ============================================================================

import { MATS, CHILLER_MATS, MIN_THICKNESS, PIPES } from './constants.js';

// ─── HATA SEVİYELERİ ───
export const SEVERITY = {
  BLOCK:   'block',    // Hesaplamayı engelle, kırmızı alarm
  WARN:    'warn',     // Uyarı göster ama hesapla
  INFO:    'info'      // Bilgi notu
};

// ─── ANA DOĞRULAMA FONKSİYONU ───
// Tüm inputları tek seferde kontrol eder, hata listesi döner
export function validateInputs({ type, tProc, tAmb, matKey, thk, vWind, pDN, vDN, eff, hours, qty, pLen, useL2, matKey2, thk2, valveType }) {
  const errors = [];

  // 1) SICAKLIK LİMİTLERİ
  const mat = MATS[matKey];
  if (mat && matKey !== 'bare') {
    if (tProc > mat.maxTemp) {
      errors.push({
        severity: SEVERITY.BLOCK,
        field: 'matKey',
        message: `${mat.name} maksimum ${mat.maxTemp}°C'de kullanılabilir! Proses sıcaklığınız ${tProc}°C. Seramik fiber veya daha yüksek sınıf malzeme seçin.`
      });
    }
    if (tProc < mat.minTemp) {
      errors.push({
        severity: SEVERITY.BLOCK,
        field: 'matKey',
        message: `${mat.name} minimum ${mat.minTemp}°C'de kullanılabilir! Proses sıcaklığınız ${tProc}°C.`
      });
    }
  }

  // 2) İKİNCİ KAT MALZEME SICAKLIK KONTROLÜ
  if (useL2 && matKey2 && matKey2 !== 'bare') {
    const mat2 = MATS[matKey2];
    if (mat2 && tProc > mat2.maxTemp) {
      errors.push({
        severity: SEVERITY.WARN,
        field: 'matKey2',
        message: `2. kat ${mat2.name} maksimum ${mat2.maxTemp}°C. Dış kat sıcaklığı daha düşük olacağından sorun olmayabilir, ancak kontrol edin.`
      });
    }
  }

  // 3) TERS SICAKLIK FARKI (GIGO koruması)
  if (type !== 'chiller' && tProc < tAmb) {
    errors.push({
      severity: SEVERITY.WARN,
      field: 'tProc',
      message: `Proses sıcaklığı (${tProc}°C) ortam sıcaklığından (${tAmb}°C) düşük. Soğutma hattı hesabı için Chiller modülünü kullanın.`
    });
  }

  // 4) MİNİMUM İZOLASYON KALINLIĞI (Üretilebilirlik)
  if (matKey !== 'bare' && thk > 0) {
    const minThk = MIN_THICKNESS[matKey];
    if (minThk) {
      const limit = (type === 'tank') ? minThk.flat : minThk.pipe;
      if (thk < limit) {
        errors.push({
          severity: SEVERITY.WARN,
          field: 'thk',
          message: `${MATS[matKey]?.name || matKey} için minimum üretilebilir kalınlık: ${limit}mm. ${thk}mm pratik olarak uygulanamaz.`
        });
      }
    }
  }

  // 5) BORU ÇAPI GEÇERLİLİĞİ
  const dn = (type === 'valve') ? vDN : pDN;
  if (dn && !PIPES[dn]) {
    errors.push({
      severity: SEVERITY.BLOCK,
      field: (type === 'valve') ? 'vDN' : 'pDN',
      message: `DN${dn} standart boru çapları arasında yok. Geçerli değerler: ${Object.keys(PIPES).join(', ')}`
    });
  }

  // 6) VERİM SINIRI
  if (eff !== undefined) {
    if (eff <= 0 || eff > 1) {
      errors.push({
        severity: SEVERITY.BLOCK,
        field: 'eff',
        message: `Kazan verimi 0-1 arasında olmalı (girilen: ${eff}). Örneğin %90 verim için 0.90 girin.`
      });
    }
    if (eff < 0.5) {
      errors.push({
        severity: SEVERITY.WARN,
        field: 'eff',
        message: `Kazan verimi %${(eff * 100).toFixed(0)} çok düşük. Tipik kazan verimi %80-95 arasıdır. Değeri kontrol edin.`
      });
    }
  }

  // 7) ÇALIŞMA SAATİ SINIRI
  if (hours !== undefined) {
    if (hours > 8760) {
      errors.push({
        severity: SEVERITY.BLOCK,
        field: 'hours',
        message: `Yıllık çalışma saati 8760'ı (365 gün × 24 saat) aşamaz. Girilen: ${hours}`
      });
    }
    if (hours <= 0) {
      errors.push({
        severity: SEVERITY.BLOCK,
        field: 'hours',
        message: `Çalışma saati 0'dan büyük olmalı.`
      });
    }
  }

  // 8) RÜZGAR HIZI SINIRI
  if (vWind !== undefined) {
    if (vWind > 30) {
      errors.push({
        severity: SEVERITY.WARN,
        field: 'vWind',
        message: `${vWind} m/s fırtına seviyesi rüzgar hızı! Tipik endüstriyel ortam: 0-10 m/s. İç mekan için 0, dış mekan için 3-5 m/s önerilir.`
      });
    }
    if (vWind < 0) {
      errors.push({
        severity: SEVERITY.BLOCK,
        field: 'vWind',
        message: `Rüzgar hızı negatif olamaz.`
      });
    }
  }

  // 9) MİKTAR & UZUNLUK
  if (qty !== undefined && qty <= 0) {
    errors.push({
      severity: SEVERITY.BLOCK,
      field: 'qty',
      message: `Miktar 0'dan büyük olmalı.`
    });
  }
  if (type === 'pipe' && pLen !== undefined && pLen <= 0) {
    errors.push({
      severity: SEVERITY.BLOCK,
      field: 'pLen',
      message: `Boru uzunluğu 0'dan büyük olmalı.`
    });
  }

  // 10) AŞIRI KALINLIK UYARISI
  if (thk > 300) {
    errors.push({
      severity: SEVERITY.WARN,
      field: 'thk',
      message: `${thk}mm izolasyon kalınlığı alışılmadık derecede yüksek. Tipik sınır: 200mm. Değeri kontrol edin.`
    });
  }

  // 11) ORTAM SICAKLIĞI SINIRI
  if (tAmb !== undefined) {
    if (tAmb > 60) {
      errors.push({
        severity: SEVERITY.WARN,
        field: 'tAmb',
        message: `Ortam sıcaklığı ${tAmb}°C çok yüksek. Tipik endüstriyel ortam: -20°C ile 50°C arası.`
      });
    }
    if (tAmb < -40) {
      errors.push({
        severity: SEVERITY.WARN,
        field: 'tAmb',
        message: `Ortam sıcaklığı ${tAmb}°C aşırı düşük. Değeri kontrol edin.`
      });
    }
  }

  return errors;
}

// ─── CHILLER ÖZEL DOĞRULAMA ───
export function validateChillerInputs({ type, tProc, tAmb, matKey, thk, cop, vDN, pDN, hours, qty, pLen }) {
  const errors = [];

  // Soğutma hattında proses < ortam olmalı
  if (tProc >= tAmb) {
    errors.push({
      severity: SEVERITY.WARN,
      field: 'tProc',
      message: `Soğutma hattında proses sıcaklığı (${tProc}°C) ortamdan (${tAmb}°C) düşük olmalı. Isıtma hesabı için ROI modülünü kullanın.`
    });
  }

  // COP sınırları
  if (cop !== undefined) {
    if (cop <= 0 || cop > 10) {
      errors.push({
        severity: SEVERITY.BLOCK,
        field: 'cop',
        message: `COP değeri 0-10 arasında olmalı (girilen: ${cop}). Tipik chiller COP: 3-6.`
      });
    }
  }

  // Malzeme sıcaklık kontrolü
  const mat = CHILLER_MATS[matKey];
  if (mat && matKey !== 'bare') {
    if (tProc < mat.minTemp) {
      errors.push({
        severity: SEVERITY.BLOCK,
        field: 'matKey',
        message: `${mat.name} minimum ${mat.minTemp}°C'de kullanılabilir. Proses sıcaklığınız ${tProc}°C.`
      });
    }
  }

  // DN kontrolü
  const dn = (type === 'valve') ? vDN : pDN;
  if (dn && !PIPES[dn]) {
    errors.push({
      severity: SEVERITY.BLOCK,
      field: (type === 'valve') ? 'vDN' : 'pDN',
      message: `DN${dn} standart boru çapları arasında yok.`
    });
  }

  // Saat & miktar
  if (hours > 8760) {
    errors.push({ severity: SEVERITY.BLOCK, field: 'hours', message: `Çalışma saati 8760'ı aşamaz.` });
  }
  if (qty <= 0) {
    errors.push({ severity: SEVERITY.BLOCK, field: 'qty', message: `Miktar 0'dan büyük olmalı.` });
  }

  return errors;
}

// ─── YARDIMCI: BLOCK hatası var mı? ───
export function hasBlockingError(errors) {
  return errors.some(e => e.severity === SEVERITY.BLOCK);
}

// ─── YARDIMCI: Hata mesajlarını HTML'e çevir ───
export function errorsToHTML(errors) {
  if (errors.length === 0) return '';
  return errors.map(e => {
    const icon = e.severity === SEVERITY.BLOCK ? '🛑' : e.severity === SEVERITY.WARN ? '⚠️' : 'ℹ️';
    const color = e.severity === SEVERITY.BLOCK ? 'red' : e.severity === SEVERITY.WARN ? 'amber' : 'blue';
    return `<div class="flex items-start gap-2 p-3 rounded-lg bg-${color}-500/10 border border-${color}-500/30 text-sm">
      <span class="text-lg leading-none">${icon}</span>
      <span class="text-${color}-300">${e.message}</span>
    </div>`;
  }).join('');
}
