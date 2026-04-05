// ==========================================
// OPTİMİZİ - CHILLER ROI HESAPLAMA MOTORU
// (ISO 12241 / ASTM C680 / VDI 2055)
// ==========================================

import { PIPES, MATS, VALVE_FACTORS, PHYSICS, getK, getSurfaceCoeff } from './_shared.js';

export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).json({ mesaj: "Chiller API Mutfak hazır!" });

    try {
        const { type, qty, tAmb, tProc, vWind, cop, hours, thk, matKey, vDN, valveType, pDN, pLen, surfaces, circles, priceTL, invUnitTL, valveTypeName } = req.body;

        if (cop !== undefined && (cop <= 0 || cop > 10)) return res.status(400).json({ hata: `COP 0-10 arasında olmalı: ${cop}` });
        if (hours > 8760) return res.status(400).json({ hata: `Çalışma saati 8760'ı aşamaz: ${hours}` });

        const standard = 'iso';
        let name = "", dPipe = 0, unitLabel = "Adet", multiplier = 1, isFlat = (type === 'tank'), totalSurfM2 = 0;

        if (type === 'tank') {
            if (surfaces) surfaces.forEach(s => totalSurfM2 += (s.w * s.h) / 1000000);
            if (circles) circles.forEach(c => { const r = (c.d / 2) / 1000; totalSurfM2 += Math.PI * r * r; });
            if ((!surfaces || !surfaces.length) && (!circles || !circles.length)) {
                multiplier = 1; name = "Düz Alan / Eşanjör"; unitLabel = "Set"; totalSurfM2 = 1;
            } else { multiplier = totalSurfM2; name = "Düz Alan / Eşanjör"; unitLabel = "Set"; }
            dPipe = 1.0;
        } else {
            const dnKey = (type === 'valve') ? vDN : pDN;
            const mm = PIPES[dnKey] || 50; dPipe = mm / 1000;
            if (type === 'pipe') { multiplier = parseFloat(pLen) || 1; name = `Boru (DN ${dnKey})`; unitLabel = "m"; }
            else { name = `${valveTypeName} (DN ${dnKey})`; }
        }

        const dT = Math.abs(tAmb - tProc);
        const thkM = thk / 1000;

        // BARE — gerçek h katsayısı ile
        const h_bare = Math.abs(getSurfaceCoeff(standard, vWind, tProc, tAmb, dPipe, isFlat)) || 10;
        let Q_watts_bare = 0;
        if (type === 'tank') Q_watts_bare = h_bare * totalSurfM2 * dT * qty;
        else if (type === 'pipe') Q_watts_bare = h_bare * Math.PI * dPipe * multiplier * dT * qty;
        else { const eqLen = dPipe * 5 * (VALVE_FACTORS[valveType] || 1); Q_watts_bare = h_bare * Math.PI * dPipe * eqLen * dT * qty; }

        // İZOLASYONLU — R_ins + R_ext modeli
        let Q_watts_ins = 0;
        if (matKey === 'bare') { Q_watts_ins = Q_watts_bare; }
        else {
            const T_mean = Math.abs((tProc + tAmb) / 2);
            const k = getK(matKey, T_mean);

            if (type === 'tank') {
                const R_ins = thkM / k;
                const R_ext = 1 / h_bare;
                Q_watts_ins = (totalSurfM2 * dT * qty) / (R_ins + R_ext);
            } else {
                const D_in = dPipe, D_out = dPipe + 2 * thkM;
                let totalLen;
                if (type === 'pipe') totalLen = multiplier * qty;
                else totalLen = dPipe * 5 * (VALVE_FACTORS[valveType] || 1) * qty;

                const R_ins_per_m = Math.log(D_out / D_in) / (2 * Math.PI * k);
                const Ts_est = tAmb + (tProc - tAmb) * 0.1;
                const h_ext = Math.abs(getSurfaceCoeff(standard, vWind, Ts_est, tAmb, D_out, false)) || 10;
                const R_ext_per_m = 1 / (h_ext * Math.PI * D_out);
                Q_watts_ins = (dT * totalLen) / (R_ins_per_m + R_ext_per_m);
            }
        }

        if (Q_watts_ins > Q_watts_bare) Q_watts_ins = Q_watts_bare;

        const kwh_bare = (Q_watts_bare * hours / 1000) / cop;
        const kwh_ins = (Q_watts_ins * hours / 1000) / cop;
        const kwh_save = Math.max(0, kwh_bare - kwh_ins);
        const money_save_tl = kwh_save * priceTL;
        const invTotal_tl = (type === 'pipe') ? invUnitTL * multiplier : invUnitTL * qty;
        const roiCalc = (money_save_tl > 0.01) ? (invTotal_tl / money_save_tl * 12) : 0;

        return res.status(200).json({
            name, unitLabel, qty: (type === 'pipe' ? multiplier : qty),
            kwhBare: kwh_bare, kwhIns: kwh_ins, kwhSave: kwh_save,
            invTL: invTotal_tl, saveTL: money_save_tl, roi: roiCalc
        });
    } catch (error) {
        return res.status(500).json({ hata: "Hesaplama Hatası: " + error.message });
    }
}
