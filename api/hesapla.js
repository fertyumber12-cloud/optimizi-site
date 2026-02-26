// ==========================================
// OPTİMİZİ - ROI HESAPLAMA MOTORU
// (ISO 12241 / ASTM C680 / VDI 2055)
// ==========================================

import { PIPES, SEPARATORS, MATS, VALVE_FACTORS, FUEL_PARAMS, PHYSICS, getK, getDN, getSurfaceCoeff } from './_shared.js';

function validateBackend(params) {
    const warnings = [];
    const { type, tProc, tAmb, matKey, thk, eff, hours, qty, vWind } = params;
    const mat = MATS[matKey];
    if (mat && matKey !== 'bare' && tProc > mat.maxTemp) {
        return { block: true, message: `${matKey} maksimum ${mat.maxTemp}°C. Proses: ${tProc}°C` };
    }
    if (eff !== undefined && (eff <= 0 || eff > 1)) return { block: true, message: `Verim 0-1 arasında olmalı: ${eff}` };
    if (hours !== undefined && (hours <= 0 || hours > 8760)) return { block: true, message: `Çalışma saati 1-8760 arası olmalı: ${hours}` };
    if (qty !== undefined && qty <= 0) return { block: true, message: `Miktar 0'dan büyük olmalı` };
    if (type !== 'chiller' && tProc < tAmb) warnings.push('Proses < Ortam sıcaklığı');
    if (vWind !== undefined && vWind > 30) warnings.push('Rüzgar hızı çok yüksek');
    if (thk > 300) warnings.push('İzolasyon kalınlığı alışılmadık yüksek');
    return { block: false, warnings };
}

export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).json({ mesaj: "Mutfak hazır ve güvenli!" });

    try {
        const { type, qty, tProc, tAmb, vWind, matKey, thk, useL2, matKey2, thk2, standard, pLen, invRaw, invRate, eff, priceTL, hours, currentSurfaces, vDN, pDN, valveType, fuelType, LHV_Val, co2Factor, valveTypeName } = req.body;

        const val = validateBackend({ type, tProc, tAmb, matKey, thk, eff, hours, qty, vWind });
        if (val.block) return res.status(400).json({ hata: val.message });
        const warnings = val.warnings || [];

        let multiplier = 1; 
        if (type === 'pipe') multiplier = pLen * qty;
        let invTotalTL = (invRaw * invRate) * qty;
        let isFlat = (type === 'tank');
        let dPipe = 0, Name = "", unitLabel = "Adet";

        if (isFlat) {
            if (!currentSurfaces || currentSurfaces.length === 0) {
                multiplier = 1; Name = `Tank/Düz (Ölçüsüz)`; unitLabel = "Set";
            } else {
                let totalArea = 0;
                currentSurfaces.forEach(s => {
                    if (s.type === 'circle') totalArea += Math.PI * Math.pow((s.d / 2000), 2);
                    else totalArea += (s.w * s.h) / 1000000;
                });
                multiplier = totalArea; Name = `Düz Yüzey (${totalArea.toFixed(2)} m²)`; unitLabel = "Set";
            }
            dPipe = 1.0;
        } else {
            const dn = (type === 'valve') ? vDN : pDN;
            const mm = parseFloat(dn) || 100;
            dPipe = mm / 1000;
            const dnLabel = getDN(mm);
            if (type === 'valve') {
                if (valveType === 'separator') { multiplier = SEPARATORS[dnLabel] || 0.5; Name = `Buhar Separatörü (DN${dnLabel})`; }
                else if (valveType === 'elbow') { multiplier = 2.36 * dPipe; Name = `Dirsek 90° (DN${dnLabel})`; }
                else { multiplier = 1; Name = `${valveTypeName} (DN${dnLabel})`; }
                unitLabel = "Adet";
            } else { Name = `Boru (DN${dnLabel})`; unitLabel = "m"; }
        }

        const thkM = thk / 1000, thkM2 = thk2 / 1000;
        let minTs = tAmb, maxTs = tProc, Ts = (minTs + maxTs) / 2;

        if (matKey === 'bare') { Ts = tProc; }
        else {
            for (let i = 0; i < 80; i++) {
                const Tm = (tProc + Ts) / 2, k1 = getK(matKey, Tm);
                let R1 = 0, R2 = 0;
                if (isFlat) { R1 = thkM / k1; if (useL2) { const k2 = getK(matKey2, (Tm + Ts) / 2 - 10); R2 = thkM2 / k2; } }
                else { R1 = Math.log((dPipe + 2 * thkM) / dPipe) / (2 * Math.PI * k1); if (useL2) { const k2 = getK(matKey2, (Tm + Ts) / 2 - 10); R2 = Math.log((dPipe + 2 * thkM + 2 * thkM2) / (dPipe + 2 * thkM)) / (2 * Math.PI * k2); } }
                const Q_cond = (tProc - Ts) / (R1 + R2);
                const D_out = isFlat ? 1.0 : dPipe + 2 * (thkM + thkM2);
                const h_total = getSurfaceCoeff(standard, vWind, Ts, tAmb, D_out, isFlat);
                const Q_conv = h_total * (isFlat ? 1 : Math.PI * D_out) * (Ts - tAmb);
                if (Q_cond > Q_conv) minTs = Ts; else maxTs = Ts;
                Ts = (minTs + maxTs) / 2;
            }
        }

        const finalTs = Ts;
        const D_out_final = isFlat ? 1.0 : dPipe + (matKey === 'bare' ? 0 : 2 * (thkM + thkM2));
        const h_final = getSurfaceCoeff(standard, vWind, finalTs, tAmb, D_out_final, isFlat);
        const A_outer_unit = isFlat ? 1 : Math.PI * D_out_final;
        const Q_unit = h_final * A_outer_unit * (finalTs - tAmb);

        let Q_total_watts = 0;
        if (type === 'valve') {
            if (valveType === 'separator') Q_total_watts = Q_unit * (multiplier * 3) * qty;
            else if (valveType === 'elbow') Q_total_watts = Q_unit * multiplier * qty;
            else Q_total_watts = Q_unit * (VALVE_FACTORS[valveType] || 1.2) * qty;
        } else if (type === 'pipe') Q_total_watts = Q_unit * multiplier;
        else Q_total_watts = Q_unit * multiplier * qty;

        const h_bare = getSurfaceCoeff(standard, vWind, tProc, tAmb, dPipe, isFlat);
        const A_bare_unit = isFlat ? 1 : Math.PI * dPipe;
        const Q_bare_unit = h_bare * A_bare_unit * (tProc - tAmb);
        let Q_bare_total = 0;
        if (type === 'valve') {
            if (valveType === 'separator') Q_bare_total = Q_bare_unit * (multiplier * 3) * qty;
            else if (valveType === 'elbow') Q_bare_total = Q_bare_unit * multiplier * qty;
            else Q_bare_total = Q_bare_unit * (VALVE_FACTORS[valveType] || 1.2) * qty;
        } else if (type === 'pipe') Q_bare_total = Q_bare_unit * multiplier;
        else Q_bare_total = Q_bare_unit * multiplier * qty;

        const energyLostIns_kWh = (Q_total_watts * hours) / 1000;
        const energyLostBare_kWh = (Q_bare_total * hours) / 1000;
        const energySaved_kWh = energyLostBare_kWh - energyLostIns_kWh;
        const energySaved_kcal = energySaved_kWh * PHYSICS.KWH_TO_KCAL;
        const energyLostBare_kcal = energyLostBare_kWh * PHYSICS.KWH_TO_KCAL;
        const fuelSavedAmount = energySaved_kcal / (LHV_Val * eff);
        const fuelLostAmount = energyLostBare_kcal / (LHV_Val * eff);
        const co2SavedTotal = (matKey === 'bare') ? 0 : ((energySaved_kWh / eff) * co2Factor) / 1000;
        const loss_money_insulated_TL = (energyLostIns_kWh * PHYSICS.KWH_TO_KCAL / (LHV_Val * eff)) * priceTL;
        const loss_money_bare_TL = (energyLostBare_kcal / (LHV_Val * eff)) * priceTL;
        const save_money_TL = (matKey === 'bare') ? 0 : (loss_money_bare_TL - loss_money_insulated_TL);
        const annual_loss_TL = (matKey === 'bare') ? loss_money_bare_TL : loss_money_insulated_TL;
        let roiCalc = 0;
        if (save_money_TL > 0.01 && invTotalTL > 0) roiCalc = (invTotalTL / save_money_TL * 12);

        return res.status(200).json({
            Name, qty: (type === 'pipe' ? multiplier : qty), unit: unitLabel,
            invTotalTL, save_money_TL, annual_loss_TL, loss_money_bare_TL,
            fuelSavedAmount: (matKey === 'bare') ? 0 : fuelSavedAmount,
            fuelLostAmount, energyLostBare_kWh, energyLostIns_kWh, energySaved_kWh,
            co2SavedTotal, realBareTemp: (matKey === 'bare') ? finalTs : tProc,
            realInsTemp: (matKey === 'bare') ? "-" : finalTs, Q_bare_unit, Q_unit, roiCalc, warnings
        });
    } catch (error) {
        return res.status(500).json({ hata: "Hesaplama Hatası: " + error.message });
    }
}
