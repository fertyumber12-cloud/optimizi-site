// Isı İletim Katsayısı (k) Hesapla
function getK(matKey, T) {
    if(!MATS[matKey]) return 0.04;
    const m = MATS[matKey];
    return m.a + (m.b * T) + ((m.c || 0) * T * T);
}

// Yüzey Isı Taşınım Katsayısı (h) Hesapla
function getSurfaceCoeff(std, vWind, Ts, Ta, D_out, isFlat) {
    const dT = Math.abs(Ts - Ta);
    const sigma = 5.67e-8, eps = 0.9;

    // Radyasyon
    let h_rad = eps * sigma * (Math.pow(Ts + 273.15, 4) - Math.pow(Ta + 273.15, 4)) / (dT || 1);
    if (dT < 0.1) h_rad = 5;

    let h_cv = 0;

    // Rüzgar ve Konveksiyon Hesabı
    if (vWind < 0.1) {
        // Durgun Hava (Doğal Konveksiyon)
        if (isFlat) h_cv = 1.95 * Math.pow(dT, 0.25);
        else h_cv = 1.32 * Math.pow(dT / (D_out || 1), 0.25);
    } else {
        // Rüzgarlı Hava (Zorlanmış Konveksiyon)
        h_cv = 10.0 * Math.pow(vWind, 0.6) / Math.pow((D_out || 1), 0.4);
        if (isFlat) h_cv = 5.8 + 3.8 * vWind;
    }

    if (h_cv < 1) h_cv = 1;
    return h_rad + h_cv;
}