// ==========================================
// OPTİMİZİ - BACKEND HESAPLAMA MOTORU
// (ISO 12241 Standartları)
// ==========================================

const PIPES={15:21.3,20:26.7,25:33.4,32:42.2,40:48.3,50:60.3,65:73.0,80:88.9,100:114.3,125:141.3,150:168.3,200:219.1,250:273.0,300:323.9,350:355.6,400:406.4,500:508.0};
const SEPARATORS = {15:0.15, 20:0.18, 25:0.22, 32:0.28, 40:0.35, 50:0.45, 65:0.60, 80:0.75, 100:1.10, 125:1.45, 150:1.90, 200:2.80};
const MATS={rockwool:{a:0.035,b:0.00017,c:0},glasswool:{a:0.025,b:0.00015,c:0},ceramic:{a:0.025,b:0.00012,c:1.2e-7},aerogel:{a:0.019,b:0.00004,c:5e-8},rubber:{a:0.034,b:0.000075,c:0},bare:{a:25,b:0,c:0}};
const VALVE_FACTORS={gate:1.2,globe:1.4,butterfly:0.6,ball:1.0,strainer:1.5,check:0.9,trap_float: 1.6, trap_thermo: 0.8, trap_bimetal: 1.0, trap_bucket: 1.5,flange: 0.35};
const FUEL_PARAMS = {gas: { lhv: 8250, co2: 0.202 }, elec: { lhv: 860, co2: 0.478 }, lng: { lhv: 11500, co2: 0.22 }, fueloil: { lhv: 9600, co2: 0.27 }, coal_imp: { lhv: 6000, co2: 0.34 }, coal_loc: { lhv: 3500, co2: 0.38 }};

function getK(matKey,T){if(!MATS[matKey])return 0.04;const m=MATS[matKey];return m.a+(m.b*T)+((m.c||0)*T*T);}

function getSurfaceCoeff(std, vWind, Ts, Ta, D_out, isFlat) {
    const dT = Math.abs(Ts - Ta);
    const sigma = 5.67e-8, eps = 0.9;
    let h_rad = eps * sigma * (Math.pow(Ts + 273.15, 4) - Math.pow(Ta + 273.15, 4)) / (dT || 1);
    if (dT < 0.1) h_rad = 5;
    let h_cv = 0;
    if (vWind < 0.1) {
        if (isFlat) h_cv = 1.95 * Math.pow(dT, 0.25);
        else h_cv = 1.32 * Math.pow(dT / (D_out || 1), 0.25);
    } else {
        h_cv = 10.0 * Math.pow(vWind, 0.6) / Math.pow((D_out || 1), 0.4);
        if (isFlat) h_cv = 5.8 + 3.8 * vWind;
    }
    if (h_cv < 1) h_cv = 1;
    return h_rad + h_cv;
}

export default function handler(req, res) {
    // Güvenlik: Sadece POST (Veri gönderme) isteklerini kabul et
    if (req.method !== 'POST') {
        return res.status(200).json({ mesaj: "Mutfak hazır ve güvenli!" });
    }

    try {
        // UI'dan gelen siparişi (verileri) alıyoruz
        const { 
            type, qty, tProc, tAmb, vWind, matKey, thk, useL2, matKey2, thk2, 
            standard, pLen, invRaw, invRate, eff, priceTL, hours, 
            currentSurfaces, vDN, pDN, valveType, fuelType, LHV_Val, co2Factor, valveTypeName
        } = req.body;

        let multiplier=1; 
        if(type==='pipe'){ multiplier = pLen * qty; }

        let invTotalTL = (invRaw * invRate) * qty;
        
        let isFlat=(type==='tank');
        let dPipe=0, D_ext=0, Name="", unitLabel="Adet";

        if(isFlat){
            if(!currentSurfaces || currentSurfaces.length === 0) {
                multiplier = 1; Name = `Tank/Düz (Ölçüsüz)`; unitLabel = "Set";
            } else {
                let totalArea = 0;
                currentSurfaces.forEach(s => {
                    if(s.type === 'circle') totalArea += Math.PI * Math.pow((s.d / 2000), 2);
                    else totalArea += (s.w * s.h) / 1000000;
                });
                multiplier = totalArea; Name = `Düz Yüzey (${totalArea.toFixed(2)} m²)`; unitLabel = "Set";
            }
            dPipe=1.0; D_ext=1.0; 
        } else {
            const dn=(type==='valve')?vDN:pDN;
            const mm=parseFloat(dn)||100;
            dPipe=mm/1000; D_ext=dPipe;
            if(type==='valve'){
                if(valveType === 'separator'){
                     const sepArea = SEPARATORS[Object.keys(PIPES).find(k=>PIPES[k]==mm)] || 0.5;
                     multiplier = sepArea; Name=`Buhar Separatörü (DN${Object.keys(PIPES).find(k=>PIPES[k]==mm)})`;
                } else if(valveType === 'elbow') {
                    multiplier = 2.36 * dPipe; Name=`Dirsek 90° (DN${Object.keys(PIPES).find(k=>PIPES[k]==mm)})`;
                } else {
                     multiplier=1; Name=`${valveTypeName} (DN${Object.keys(PIPES).find(k=>PIPES[k]==mm)})`;
                }
                unitLabel="Adet";
            } else {
                Name=`Boru (DN${Object.keys(PIPES).find(k=>PIPES[k]==mm)})`; unitLabel="m";
            }
        }
        
        const thkM=thk/1000; const thkM2=thk2/1000;
        let minTs=tAmb,maxTs=tProc,Ts=(minTs+maxTs)/2;
        
        if(matKey==='bare'){
            for(let i=0;i<100;i++){let D_out=isFlat?1.0:dPipe;const h_total=getSurfaceCoeff(standard,vWind,tProc,tAmb,D_out,isFlat);Ts=tProc;break;}
        }else{
            for(let i=0;i<100;i++){
                const Tm=(tProc+Ts)/2; const k1=getK(matKey,Tm);
                let R1 = 0, R2 = 0;
                if(isFlat) {
                    R1 = thkM / k1;
                    if(useL2) { const Tm2 = (Tm + Ts)/2 - 10; const k2 = getK(matKey2, Tm2); R2 = thkM2 / k2; }
                } else {
                    R1 = Math.log((dPipe + 2*thkM)/dPipe) / (2*Math.PI*k1);
                    if(useL2) { const Tm2 = (Tm + Ts)/2 - 10; const k2 = getK(matKey2, Tm2); R2 = Math.log((dPipe + 2*thkM + 2*thkM2) / (dPipe + 2*thkM)) / (2*Math.PI*k2); }
                }
                const R_total = R1 + R2;
                const Q_cond=(tProc-Ts)/R_total;
                let D_out = isFlat ? 1.0 : dPipe + 2*(thkM + thkM2);
                const h_total=getSurfaceCoeff(standard,vWind,Ts,tAmb,D_out,isFlat);
                let A_surf=isFlat?1:2*Math.PI*(D_out/2);
                const Q_conv=h_total*A_surf*(Ts-tAmb);
                if(Q_cond>Q_conv)minTs=Ts;else maxTs=Ts;Ts=(minTs+maxTs)/2;
            }
        }
        
        const finalTs=Ts;
        let D_out_final = isFlat ? 1.0 : dPipe + (matKey==='bare' ? 0 : 2*(thkM + thkM2));
        const h_final=getSurfaceCoeff(standard,vWind,finalTs,tAmb,D_out_final,isFlat);
        let A_outer_unit=isFlat?1:Math.PI*D_out_final;
        const Q_unit=h_final*A_outer_unit*(finalTs-tAmb); 
        
        let Q_total_watts=0;
        if(type==='valve'){
             if(valveType === 'separator'){ Q_total_watts = Q_unit * (multiplier*3) * qty; } 
             else if(valveType === 'elbow') { Q_total_watts = Q_unit * multiplier * qty; } 
             else { const factor=VALVE_FACTORS[valveType]||1.2; Q_total_watts=Q_unit*factor*qty; }
        } else if(type==='pipe'){ Q_total_watts=Q_unit*multiplier; } 
        else { Q_total_watts=Q_unit*multiplier*qty; }
        
        let h_bare=getSurfaceCoeff(standard,vWind,tProc,tAmb,dPipe,isFlat);
        let A_bare_unit=isFlat?1:Math.PI*dPipe;
        let Q_bare_unit=h_bare*A_bare_unit*(tProc-tAmb);
        let Q_bare_total=0;
        
        if(type==='valve'){
            if(valveType==='separator'){ Q_bare_total = Q_bare_unit * (multiplier*3) * qty; } 
            else if (valveType === 'elbow') { Q_bare_total = Q_bare_unit * multiplier * qty; } 
            else { const factor=VALVE_FACTORS[valveType]||1.2; Q_bare_total=Q_bare_unit*factor*qty; }
        } else if(type==='pipe'){ Q_bare_total=Q_bare_unit*multiplier; } 
        else { Q_bare_total=Q_bare_unit*multiplier*qty; }

        const energyLostIns_kWh = (Q_total_watts * hours) / 1000;
        const energyLostBare_kWh = (Q_bare_total * hours) / 1000;
        const energySaved_kWh = energyLostBare_kWh - energyLostIns_kWh;
        
        const energySaved_kcal = energySaved_kWh * 860;
        const energyLostBare_kcal = energyLostBare_kWh * 860;

        const fuelSavedAmount = energySaved_kcal / (LHV_Val * eff);
        const fuelLostAmount = energyLostBare_kcal / (LHV_Val * eff);

        const fuelEnergyInputSaved_kWh = energySaved_kWh / eff; 
        const co2SavedTotal = (matKey==='bare') ? 0 : (fuelEnergyInputSaved_kWh * co2Factor) / 1000;

        const loss_money_insulated_TL = (energyLostIns_kWh * 860 / (LHV_Val * eff)) * priceTL;
        const loss_money_bare_TL = (energyLostBare_kcal / (LHV_Val * eff)) * priceTL;
        
        const save_money_TL = (matKey==='bare') ? 0 : (loss_money_bare_TL - loss_money_insulated_TL);
        const annual_loss_TL = (matKey==='bare') ? loss_money_bare_TL : loss_money_insulated_TL;
        
        let roiCalc = 0;
        if(save_money_TL > 0.01 && invTotalTL > 0) { roiCalc = (invTotalTL / save_money_TL * 12); }

        const realBareTemp = (matKey === 'bare') ? finalTs : tProc; 
        const realInsTemp = (matKey === 'bare') ? "-" : finalTs;

        // Hesaplanan Değerleri UI'a Geri Döndür
        return res.status(200).json({
            Name: Name,
            qty: (type==='pipe' ? multiplier : qty),
            unit: unitLabel,
            invTotalTL: invTotalTL,
            save_money_TL: save_money_TL,
            annual_loss_TL: annual_loss_TL,
            loss_money_bare_TL: loss_money_bare_TL,
            fuelSavedAmount: (matKey==='bare') ? 0 : fuelSavedAmount,
            fuelLostAmount: fuelLostAmount,
            energyLostBare_kWh: energyLostBare_kWh,
            energyLostIns_kWh: energyLostIns_kWh,
            energySaved_kWh: energySaved_kWh,
            co2SavedTotal: co2SavedTotal,
            realBareTemp: realBareTemp,
            realInsTemp: realInsTemp,
            Q_bare_unit: Q_bare_unit,
            Q_unit: Q_unit,
            roiCalc: roiCalc
        });

    } catch (error) {
        return res.status(500).json({ hata: "Hesaplama Hatası: " + error.message });
    }
}
