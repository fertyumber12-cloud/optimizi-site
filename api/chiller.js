// api/chiller.js
const PIPES={15:21.3,20:26.7,25:33.4,32:42.2,40:48.3,50:60.3,65:73.0,80:88.9,100:114.3,125:141.3,150:168.3,200:219.1,250:273.0,300:323.9,350:355.6,400:406.4,500:508.0};
const MAT_DATA={ rubber:{k:0.034}, aerogel:{k:0.019}, glasswool:{k:0.032}, pu:{k:0.024}, bare:{k:25} };
const VALVE_FACTORS={gate:1.2,globe:1.4,butterfly:0.6,ball:1.0,strainer:1.5,check:0.9,flange:0.4,elbow:0.3};

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
