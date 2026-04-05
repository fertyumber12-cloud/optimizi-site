// ==========================================
// OPTİMİZİ - ANLIK KAYIP HESAPLAMA MOTORU
// (ISO 12241 / ASTM C680 / VDI 2055)
// ==========================================

import { PIPES, SEPARATORS, MATS, VALVE_FACTORS, FUEL_PARAMS, PHYSICS, getK, getDN, getSurfaceCoeff } from './_shared.js';

export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).json({ mesaj: "Anlık Kayıp API Mutfak hazır!" });

    try {
        const { qty, type, tProc, tAmb, vWind, matKey, thk, useL2, matKey2, thk2, standard, pLen, eff, priceInReportCurr, hours, vDN, pDN, valveType, fuelType, LHV_Val, LHV_Unit, currentSurfaces, currentCircles, valveTypeName } = req.body;

        const mat = MATS[matKey];
        if (mat && matKey !== 'bare' && tProc > mat.maxTemp)
            return res.status(400).json({ hata: `${matKey} maksimum ${mat.maxTemp}°C. Proses: ${tProc}°C` });

        let multiplier = 1, isFlat = (type === 'tank'), dPipe = 0, Name = "", unitLabel = "Adet", displayQty = qty;

        if (isFlat) {
            let totalSurfM2 = 0;
            if (currentSurfaces) currentSurfaces.forEach(s => totalSurfM2 += (s.w * s.h) / 1000000);
            if (currentCircles) currentCircles.forEach(c => { const r = (c.d / 2) / 1000; totalSurfM2 += Math.PI * r * r; });
            if ((!currentSurfaces || !currentSurfaces.length) && (!currentCircles || !currentCircles.length)) {
                multiplier = 1; Name = `Düz Yüzey (Ölçüsüz)`; unitLabel = "Set";
            } else {
                multiplier = totalSurfM2; Name = `Düz Yüzey`; unitLabel = "m²";
                displayQty = Number((totalSurfM2 * qty).toFixed(4));
            }
            dPipe = 1.0;
        } else {
            const dn = (type === 'valve') ? vDN : pDN;
            const mm = parseFloat(dn) || 100; dPipe = mm / 1000;
            const dnLabel = getDN(mm);
            if (type === 'valve') {
                if (valveType === 'separator') { multiplier = SEPARATORS[dnLabel] || 0.5; Name = `Buhar Separatörü (DN${dnLabel})`; }
                else if (valveType === 'elbow') { multiplier = 2.36 * dPipe; Name = `Dirsek 90° (DN${dnLabel})`; }
                else { multiplier = 1; Name = `${valveTypeName} (DN${dnLabel})`; }
                unitLabel = "Adet"; displayQty = qty;
            } else {
                Name = `Boru (DN${dnLabel})`; unitLabel = "m"; multiplier = pLen; displayQty = pLen * qty;
            }
        }

        const h_bare = getSurfaceCoeff(standard, vWind, tProc, tAmb, dPipe, isFlat);
        const A_bare_unit = isFlat ? 1 : Math.PI * dPipe;
        const Q_bare_unit = h_bare * A_bare_unit * (tProc - tAmb);
        let Q_bare_total = 0;
        if (type === 'valve') {
            if (valveType === 'separator') Q_bare_total = Q_bare_unit * (multiplier * 3) * qty;
            else if (valveType === 'elbow') Q_bare_total = Q_bare_unit * multiplier * qty;
            else Q_bare_total = Q_bare_unit * (VALVE_FACTORS[valveType] || 1.2) * qty;
        } else Q_bare_total = Q_bare_unit * multiplier * qty;

        const thkM = thk / 1000, thkM2 = thk2 / 1000;
        let minTs = tAmb, maxTs = tProc, Ts = (minTs + maxTs) / 2, Q_unit = 0;

        if (thkM === 0 && (!useL2 || thkM2 === 0)) { Ts = tProc; Q_unit = Q_bare_unit; }
        else {
            for (let i = 0; i < 80; i++) {
                const Tm = (tProc + Ts) / 2, k1 = getK(matKey, Tm);
                let R1 = 0, R2 = 0;
                if (isFlat) { R1 = thkM / k1; if (useL2) { R2 = thkM2 / getK(matKey2, (Tm + Ts) / 2 - 10); } }
                else { R1 = Math.log((dPipe + 2 * thkM) / dPipe) / (2 * Math.PI * k1); if (useL2) { R2 = Math.log((dPipe + 2 * thkM + 2 * thkM2) / (dPipe + 2 * thkM)) / (2 * Math.PI * getK(matKey2, (Tm + Ts) / 2 - 10)); } }
                const R_total = R1 + R2;
                if (R_total === 0) { Ts = tProc; break; }
                const Q_cond = (tProc - Ts) / R_total;
                const D_out = isFlat ? 1.0 : dPipe + 2 * (thkM + thkM2);
                const Q_conv = getSurfaceCoeff(standard, vWind, Ts, tAmb, D_out, isFlat) * (isFlat ? 1 : Math.PI * D_out) * (Ts - tAmb);
                if (Q_cond > Q_conv) minTs = Ts; else maxTs = Ts;
                Ts = (minTs + maxTs) / 2;
            }
            const D_out_f = isFlat ? 1.0 : dPipe + 2 * (thkM + thkM2);
            Q_unit = getSurfaceCoeff(standard, vWind, Ts, tAmb, D_out_f, isFlat) * (isFlat ? 1 : Math.PI * D_out_f) * (Ts - tAmb);
        }

        let Q_ins_total = 0;
        if (type === 'valve') {
            if (valveType === 'separator') Q_ins_total = Q_unit * (multiplier * 3) * qty;
            else if (valveType === 'elbow') Q_ins_total = Q_unit * multiplier * qty;
            else Q_ins_total = Q_unit * (VALVE_FACTORS[valveType] || 1.2) * qty;
        } else Q_ins_total = Q_unit * multiplier * qty;

        if (Q_ins_total > Q_bare_total) Q_ins_total = Q_bare_total;

        const energyLostBare_kWh = (Q_bare_total * hours) / 1000;
        const fuelLostBare = (energyLostBare_kWh * PHYSICS.KWH_TO_KCAL) / (LHV_Val * eff);
        const moneyLostBare = fuelLostBare * priceInReportCurr;
        const energyLostIns_kWh = (Q_ins_total * hours) / 1000;
        const fuelLostIns = (energyLostIns_kWh * PHYSICS.KWH_TO_KCAL) / (LHV_Val * eff);
        const moneyLostIns = fuelLostIns * priceInReportCurr;
        const selectedCo2Factor = (FUEL_PARAMS[fuelType] && FUEL_PARAMS[fuelType].co2) || 0.3;
        const co2 = ((Q_bare_total * hours / 1000) / eff) * selectedCo2Factor / 1000;

        return res.status(200).json({
            Name, unitLabel, qty: displayQty,
            moneyLostBare, potentialSaveMoney: moneyLostBare - moneyLostIns, fuelLostBare,
            energyLostBare_kWh, energyLostIns_kWh, potentialSaveKwh: energyLostBare_kWh - energyLostIns_kWh,
            co2, Ts
        });
    } catch (error) {
        return res.status(500).json({ hata: error.message });
    }
}
