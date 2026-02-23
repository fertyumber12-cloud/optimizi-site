// api/chiller.js
import { PIPES, CHILLER_MATS as MAT_DATA, CHILLER_VALVE_FACTORS as VALVE_FACTORS } from '../shared/constants.js';
import { validateChillerInputs, hasBlockingError } from '../shared/validation.js';

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).json({ mesaj: "Chiller API Mutfak hazır!" });
    }

    try {
        const {
            type, qty, tAmb, tProc, vWind, cop, hours, thk, matKey,
            vDN, valveType, pDN, pLen, surfaces, circles,
            priceTL, invUnitTL, valveTypeName
        } = req.body;

        // ── MÜHENDİSLİK DOĞRULAMA ──
        const validationErrors = validateChillerInputs({ type, tProc, tAmb, matKey, thk, cop, vDN, pDN, hours, qty, pLen });
        if (hasBlockingError(validationErrors)) {
            return res.status(400).json({ hata: "Geçersiz giriş", hatalar: validationErrors.filter(e => e.severity === 'block') });
        }

        let surfaceArea = 0, name = "", dPipe = 0, unitLabel = "Adet", multiplier = 1, totalSurfM2 = 0;
        
        if(type === 'tank'){
            if (surfaces) surfaces.forEach(s => totalSurfM2 += (s.w * s.h) / 1000000);
            if (circles) circles.forEach(c => { const r = (c.d/2)/1000; totalSurfM2 += Math.PI * r * r; });
            
            if((!surfaces || surfaces.length === 0) && (!circles || circles.length === 0)) { 
                multiplier = 1; name = "Düz Alan / Eşanjör"; unitLabel = "Set"; surfaceArea = 1; totalSurfM2 = 1; 
            } else { 
                surfaceArea = totalSurfM2; name = "Düz Alan / Eşanjör"; unitLabel = "Set"; 
            }
            dPipe = 1.0; 
        } else {
            const dnKey = (type==='valve') ? vDN : pDN;
            const mm = PIPES[dnKey] || 50; 
            dPipe = mm / 1000; 
            const perimeter = Math.PI * dPipe;
            
            if(type === 'pipe'){
                const len = parseFloat(pLen) || 1;
                surfaceArea = perimeter * len; name = `Boru (DN ${dnKey})`; multiplier = len; unitLabel = "m";
            } else {
                name = `${valveTypeName} (DN ${dnKey})`;
                let factor = VALVE_FACTORS[valveType] || 1;
                surfaceArea = perimeter * (dPipe * 5 * factor); 
            }
        }
        
        const dT = Math.abs(tAmb - tProc);
        const U_bare = 25 + (2 * vWind); 
        const Q_watts_bare = U_bare * surfaceArea * dT * qty;
        
        let Q_watts_ins = 0;
        if(matKey === 'bare'){ 
            Q_watts_ins = Q_watts_bare; 
        } else {
            const k = MAT_DATA[matKey].k; 
            const thkM = thk / 1000;
            if(type === 'tank') { 
                const R_ins = thkM / k; 
                Q_watts_ins = (surfaceArea * dT * qty) / (R_ins + (1/U_bare)); 
            } else {
                const totalLen = (type==='pipe' ? multiplier : (dPipe * 5 * (VALVE_FACTORS[valveType]||1))) * qty;
                const D_in = dPipe; 
                const D_out = dPipe + 2*thkM;
                Q_watts_ins = (2 * Math.PI * k * totalLen * dT) / Math.log(D_out/D_in);
            }
        }

        const kwh_bare = (Q_watts_bare * hours / 1000) / cop;
        const kwh_ins = (Q_watts_ins * hours / 1000) / cop;
        const kwh_save = Math.max(0, kwh_bare - kwh_ins);
        const money_save_tl = kwh_save * priceTL;
        
        let invTotal_tl = (type === 'pipe') ? invUnitTL * multiplier : invUnitTL * qty;
        let roiCalc = (money_save_tl > 0.01) ? (invTotal_tl / money_save_tl * 12) : 0;

        return res.status(200).json({
            name, unitLabel, qty: (type==='pipe' ? multiplier : qty),
            kwhBare: kwh_bare, kwhIns: kwh_ins, kwhSave: kwh_save,
            invTL: invTotal_tl, saveTL: money_save_tl, roi: roiCalc
        });
    } catch (error) {
        return res.status(500).json({ hata: "Hesaplama Hatası: " + error.message });
    }
}
