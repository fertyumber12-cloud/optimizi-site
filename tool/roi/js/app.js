let LIST=[], PACKAGE_BASKET=[], isPackageMode=false;
let FX={USD:34.50,EUR:36.50,TL:1.0}, currImg=null, userQrImg=null, currPkgImg=null, editingIndex=null;
let currentSurfaces = []; 
let printTemplateCache = null;

// Başlatıcı
function initApp(){ init(); }
function init(){ fillDN('vDN'); fillDN('pDN'); getFx(); lucide.createIcons(); setType('valve'); }

// Yardımcılar
function fmt(n){ return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function toggleQrVisibility() {
    const isChecked = document.getElementById('toggleQrInput').checked;
    if (!isChecked) document.body.classList.add('hide-qr-section');
    else document.body.classList.remove('hide-qr-section');
}

function toggleL2() {
    const box = document.getElementById('layer2Box');
    if(document.getElementById('useL2').checked) box.classList.remove('hidden'); else box.classList.add('hidden');
}

function toggleFuelMode() {
    const fuel = document.getElementById('fuel').value;
    const box = document.getElementById('manualFuelBox');
    if(fuel === 'manual') box.classList.remove('hidden'); else box.classList.add('hidden');
}

function setType(t){
    ['valve','pipe','tank'].forEach(x=>{document.getElementById('g-'+x).classList.add('hidden');});
    document.getElementById('g-'+t).classList.remove('hidden');
    document.getElementById('type').value=t;
    
    const buttons={valve:document.getElementById('btn-valve'),pipe:document.getElementById('btn-pipe'),tank:document.getElementById('btn-tank')};
    const activeClass="bg-white text-slate-900 shadow";
    const inactiveClass="text-slate-500 hover:text-slate-900";
    
    Object.values(buttons).forEach(btn=>{btn.className="flex-1 py-1.5 text-xs font-medium rounded transition-all "+inactiveClass;});
    buttons[t].className="flex-1 py-1.5 text-xs font-medium rounded transition-all "+activeClass;
    
    const qtyInput = document.getElementById('qty');
    qtyInput.disabled = false;
    qtyInput.value = 1;
}

function fillDN(id){const el=document.getElementById(id);el.innerHTML='';for(const[k,v]of Object.entries(PIPES)){let o=document.createElement('option');o.value=v;o.text=`DN ${k}`;el.add(o);}if(id==='vDN')el.value=60.3;if(id==='pDN')el.value=88.9;}

// Resim Okuma
function readImg(i){if(i.files&&i.files[0]){const r=new FileReader();r.onload=e=>{currImg=e.target.result;document.getElementById('prevImg').src=currImg;document.getElementById('prevImg').classList.remove('hidden');};r.readAsDataURL(i.files[0]);}}
function readQr(i){if(i.files&&i.files[0]){const r=new FileReader();r.onload=e=>{userQrImg=e.target.result;alert("QR Kod yüklendi! Raporun son sayfasında görünecek.");};r.readAsDataURL(i.files[0]);}}
function readPkgImg(i){if(i.files&&i.files[0]){const r=new FileReader();r.onload=e=>{currPkgImg=e.target.result;document.getElementById('pkgPrevImg').src=currPkgImg;document.getElementById('pkgPrevImg').classList.remove('hidden');};r.readAsDataURL(i.files[0]);}}

async function getFx(){try{const r=await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY');const d=await r.json();FX.USD=d.rates.TRY;const r2=await fetch('https://api.frankfurter.app/latest?from=EUR&to=TRY');const d2=await r2.json();FX.EUR=d2.rates.TRY;document.getElementById('fxVal').innerText=FX.USD.toFixed(2);}catch(e){}}

// Yüzey (Tank) İşlemleri
function addSurface(type){
    if (type === 'rect') {
        const w = parseFloat(document.getElementById('surfW').value);
        const h = parseFloat(document.getElementById('surfH').value);
        if(!w || !h){ alert("Lütfen En ve Boy giriniz."); return; }
        currentSurfaces.push({type: 'rect', w: w, h: h});
        document.getElementById('surfW').value = ''; document.getElementById('surfH').value = '';
    } else if (type === 'circle') {
        const d = parseFloat(document.getElementById('surfD').value);
        if(!d){ alert("Lütfen Çap giriniz."); return; }
        currentSurfaces.push({type: 'circle', d: d});
        document.getElementById('surfD').value = '';
    }
    renderSurfaces();
}
function removeSurface(idx){ currentSurfaces.splice(idx,1); renderSurfaces(); }
function renderSurfaces(){
    const listEl = document.getElementById('surfaceList');
    const totalEl = document.getElementById('totalSurfArea');
    listEl.innerHTML = '';
    let totalAreaM2 = 0;
    
    currentSurfaces.forEach((s, idx) => {
        let m2 = 0; let label = "";
        if(s.type === 'circle') { m2 = Math.PI * Math.pow((s.d / 200), 2); label = `Ø ${s.d} cm Daire`; } 
        else { m2 = (s.w * s.h) / 10000; label = `${s.w} x ${s.h} cm`; }
        totalAreaM2 += m2;
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white p-1.5 rounded border border-slate-200";
        div.innerHTML = `<span>${label}</span> <button onclick="removeSurface(${idx})" class="text-red-500 hover:text-red-700"><i data-lucide="x" class="w-3 h-3"></i></button>`;
        listEl.appendChild(div);
    });
    totalEl.innerText = totalAreaM2.toFixed(3);
    lucide.createIcons();
}

// Paket Modu
function togglePackageMode(){
    isPackageMode = !isPackageMode;
    const panel = document.getElementById('packagePanel');
    const btnToggle = document.getElementById('btnTogglePkg');
    const btnAdd = document.getElementById('btnAddText');
    const invBox = document.getElementById('singleInvBox');
    const invInput = document.getElementById('inv');
    const invCurr = document.getElementById('invCurr');

    if(isPackageMode){
        panel.classList.remove('hidden');
        btnToggle.classList.replace('bg-slate-200', 'bg-indigo-600');
        btnToggle.classList.replace('text-slate-600', 'text-white');
        btnToggle.innerHTML = `<i data-lucide="box" class="w-3 h-3"></i> Paket Modunu Kapat`;
        btnAdd.innerText = "Sepete Ekle";
        invInput.disabled = true; invCurr.disabled = true; invBox.classList.add('opacity-30');
    } else {
        panel.classList.add('hidden');
        btnToggle.classList.replace('bg-indigo-600', 'bg-slate-200');
        btnToggle.classList.replace('text-white', 'text-slate-600');
        btnToggle.innerHTML = `<i data-lucide="box" class="w-3 h-3"></i> Paket Modunu Aç`;
        btnAdd.innerText = "Hesapla & Ekle";
        invInput.disabled = false; invCurr.disabled = false; invBox.classList.remove('opacity-30');
    }
    lucide.createIcons();
}

function addToPackageBasket(){
    const res = getCalculationResult(true); 
    PACKAGE_BASKET.push(res);
    renderPackageBasket();
    resetForm();
}

function renderPackageBasket(){
    const ul = document.getElementById('pkgList');
    ul.innerHTML = '';
    let totalSave = 0; let totalQty = 0;
    const currSymVal=document.getElementById('curr')?document.getElementById('curr').value:'TL';
    const reportRate = FX[currSymVal] || 1; 

    PACKAGE_BASKET.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = "flex justify-between items-center border-b border-slate-100 pb-1 last:border-0";
        li.innerHTML = `<span>${item.qty} ${item.unit} ${item.name}</span> <button onclick="removeFromBasket(${idx})" class="text-red-400 hover:text-red-600"><i data-lucide="x" class="w-3 h-3"></i></button>`;
        ul.appendChild(li);
        totalSave += item.saveTL; totalQty++;
    });

    if(PACKAGE_BASKET.length === 0) ul.innerHTML = '<li class="text-slate-400 text-center italic py-2">Henüz sepete ürün eklenmedi.</li>';
    document.getElementById('pkgTotalQty').innerText = totalQty + " Kalem";
    document.getElementById('pkgTotalSave').innerText = fmt(totalSave / reportRate) + " " + currSymVal;
    lucide.createIcons();
}

function removeFromBasket(idx){ PACKAGE_BASKET.splice(idx,1); renderPackageBasket(); }

function buildPackageItem(basket, pkgName, pkgQty, pkgInvRaw, pkgInvCurr) {
    const pkgInvRate = FX[pkgInvCurr] || 1;
    const pkgTotalInvTL = pkgInvRaw * pkgInvRate * pkgQty;

    let totalSaveTL = 0; let totalLossTL = 0; let totalLossBareTL = 0;
    let totalFuelSaved = 0; let totalFuelLost = 0; let totalCo2 = 0;
    let totalKwhBare = 0; let totalKwhIns = 0; let totalKwhSave = 0;
    let itemsDesc = []; let fuelUnit = basket.length > 0 ? basket[0].fuelUnit : ""; 
    let maxTemp = -9999; let displayTs = "-"; let displayTins = "-";

    basket.forEach(item => {
        totalSaveTL += item.saveTL; totalLossTL += item.lossTL; totalLossBareTL += item.lossBareTL;
        totalFuelSaved += item.fuelSaved; totalFuelLost += item.fuelLost; totalCo2 += item.co2;
        totalKwhBare += parseFloat(item.kwhBare.replace(/\./g,'').replace(',','.'));
        totalKwhIns += parseFloat(item.kwhIns.replace(/\./g,'').replace(',','.'));
        totalKwhSave += parseFloat(item.kwhSave.replace(/\./g,'').replace(',','.'));
        itemsDesc.push(`${item.qty}x ${item.name}`);
        let tVal = parseFloat(item.Ts);
        if(!isNaN(tVal) && tVal > maxTemp){ maxTemp = tVal; displayTs = item.Ts; displayTins = item.Tins; }
    });

    totalSaveTL *= pkgQty; totalLossTL *= pkgQty; totalLossBareTL *= pkgQty;
    totalFuelSaved *= pkgQty; totalFuelLost *= pkgQty; totalCo2 *= pkgQty;
    totalKwhBare *= pkgQty; totalKwhIns *= pkgQty; totalKwhSave *= pkgQty;

    let roiCalc = 0;
    if(totalSaveTL > 0.01) { roiCalc = (pkgTotalInvTL / totalSaveTL * 12); }

    return {
        name: `📦 PAKET: ${pkgName}`,
        desc: `(${pkgQty} SET) - ${basket.length} Kalem İçerir: ` + itemsDesc.join(', '), 
        location: basket.length > 0 ? (basket[0].location || "Muhtelif") : "Muhtelif",
        qty: pkgQty, unit: "Set", invTL: pkgTotalInvTL, saveTL: totalSaveTL, lossTL: totalLossTL, lossBareTL: totalLossBareTL,
        fuelSaved: totalFuelSaved, fuelLost: totalFuelLost, fuelUnit: fuelUnit,
        kwhBare: Math.round(totalKwhBare).toLocaleString('tr-TR'), kwhIns: Math.round(totalKwhIns).toLocaleString('tr-TR'), kwhSave: Math.round(totalKwhSave).toLocaleString('tr-TR'),
        co2: totalCo2, Ts: displayTs, Tins: displayTins, img: currPkgImg, roi: roiCalc,
        inputs: { type: 'package', matKey: 'mixed', inv: pkgInvRaw, invCurr: pkgInvCurr, isLumpSum: true, subItems: JSON.parse(JSON.stringify(basket)), vWind: 0 }
    };
}

function commitPackage(){
    if(PACKAGE_BASKET.length === 0) { alert("Sepet boş!"); return; }
    const pkgName = document.getElementById('pkgName').value || "İsimsiz Paket";
    const pkgQty = parseFloat(document.getElementById('pkgQty').value) || 1;
    const pkgInvRaw = parseFloat(document.getElementById('pkgInv').value) || 0;
    const pkgInvCurr = document.getElementById('pkgInvCurr').value;

    const compositeItem = buildPackageItem(PACKAGE_BASKET, pkgName, pkgQty, pkgInvRaw, pkgInvCurr);
    LIST.push(compositeItem);
    
    PACKAGE_BASKET = []; document.getElementById('pkgName').value = ''; document.getElementById('pkgInv').value = ''; document.getElementById('pkgQty').value = '1';
    currPkgImg = null; document.getElementById('pkgPrevImg').src = ''; document.getElementById('pkgPrevImg').classList.add('hidden');
    renderPackageBasket(); render(); alert("Paket başarıyla oluşturuldu ve listeye eklendi!");
}

// ANA HESAPLAMA MOTORU (DOM BAĞIMLILIĞI NEDENİYLE APP.JS İÇİNDE)
function getCalculationResult(ignoreInvestment = false){
    const qty=parseFloat(document.getElementById('qty').value)||1;
    const type=document.getElementById('type').value;
    const location=document.getElementById('location').value||"";
    const tProc=parseFloat(document.getElementById('tProc').value)||0;
    const tAmb=parseFloat(document.getElementById('tAmb').value)||25;
    const vWindInput = document.getElementById('vWind').value;
    const vWind = (vWindInput === "") ? 0 : parseFloat(vWindInput);
    const matKey=document.getElementById('matSelect').value;
    const thk=parseFloat(document.getElementById('thk').value)||0;
    const useL2 = document.getElementById('useL2').checked;
    const matKey2 = useL2 ? document.getElementById('matSelect2').value : null;
    const thk2 = useL2 ? (parseFloat(document.getElementById('thk2').value)||0) : 0;
    const standard=document.getElementById('calcStd').value;
    const pLen = parseFloat(document.getElementById('pLen').value)||1; 
    
    let multiplier=1; 
    if(type==='pipe'){ multiplier = pLen * qty; }

    let invTotalTL = 0; let invRaw = 0; let invCurrencyCode = 'TL';
    if(!ignoreInvestment) {
        invRaw=parseFloat(document.getElementById('inv').value)||0;
        invCurrencyCode = document.getElementById('invCurr').value; 
        const invRate = FX[invCurrencyCode] || 1; 
        let invUnitTL = invRaw * invRate;
        invTotalTL = invUnitTL * qty; 
    }
    
    const eff=(parseFloat(document.getElementById('eff').value)||85)/100;
    const priceRaw=parseFloat(document.getElementById('price').value)||0;
    const energyCurrencyCode = document.getElementById('energyCurr').value;
    const energyRate = FX[energyCurrencyCode] || 1;
    const priceTL = priceRaw * energyRate; 
    const hours=parseFloat(document.getElementById('hours').value)||8000;
    
    let isFlat=(type==='tank'); let dPipe=0,D_ext=0,Name="",unitLabel="Adet";

    if(isFlat){
        if(currentSurfaces.length === 0) { multiplier = 1; Name = `Tank/Düz (Ölçüsüz)`; unitLabel = "Set"; } 
        else {
            let totalArea = 0; let dims = [];
            currentSurfaces.forEach(s => {
                if(s.type === 'circle'){ let m2 = Math.PI * Math.pow((s.d / 200), 2); totalArea += m2; dims.push(`Ø${s.d}`); } 
                else { totalArea += (s.w * s.h) / 10000; dims.push(`${s.w}x${s.h}`); }
            });
            multiplier = totalArea; Name = `Yüzey (${dims.join(' + ')})`; unitLabel = "Set";
        }
        dPipe=1.0; D_ext=1.0; 
    } else {
        const dn=(type==='valve')?document.getElementById('vDN').value:document.getElementById('pDN').value;
        const mm=parseFloat(dn)||100; dPipe=mm/1000; D_ext=dPipe;
        if(type==='valve'){
            const vType=document.getElementById('valveType').value;
            if(vType === 'separator'){ const sepArea = SEPARATORS[Object.keys(PIPES).find(k=>PIPES[k]==mm)] || 0.5; multiplier = sepArea; Name=`Buhar Separatörü (DN${Object.keys(PIPES).find(k=>PIPES[k]==mm)})`; } 
            else if(vType === 'elbow') { multiplier = 2.36 * dPipe; Name=`Dirsek 90° (DN${Object.keys(PIPES).find(k=>PIPES[k]==mm)})`; } 
            else { multiplier=1; const sel = document.getElementById('valveType'); const txt = sel.options[sel.selectedIndex].text; Name=`${txt} (DN${Object.keys(PIPES).find(k=>PIPES[k]==mm)})`; }
            unitLabel="Adet";
        } else { Name=`Boru (DN${Object.keys(PIPES).find(k=>PIPES[k]==mm)})`; unitLabel="m"; }
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
            const R_total = R1 + R2; const Q_cond=(tProc-Ts)/R_total;
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
    
    let Q_total_watts=0; const vType=document.getElementById('valveType').value;
    if(type==='valve'){
         if(vType === 'separator'){ Q_total_watts = Q_unit * (multiplier*3) * qty; } 
         else if(vType === 'elbow') { Q_total_watts = Q_unit * multiplier * qty; } 
         else { const factor=VALVE_FACTORS[vType]||1.2; Q_total_watts=Q_unit*factor*qty; }
    } else if(type==='pipe'){ Q_total_watts=Q_unit*multiplier; } 
    else { Q_total_watts=Q_unit*multiplier*qty; }
    
    let h_bare=getSurfaceCoeff(standard,vWind,tProc,tAmb,dPipe,isFlat);
    let A_bare_unit=isFlat?1:Math.PI*dPipe;
    let Q_bare_unit=h_bare*A_bare_unit*(tProc-tAmb);
    let Q_bare_total=0;
    
    if(type==='valve'){
        if(vType==='separator'){ Q_bare_total = Q_bare_unit * (multiplier*3) * qty; } 
        else if (vType === 'elbow') { Q_bare_total = Q_bare_unit * multiplier * qty; } 
        else { const factor=VALVE_FACTORS[vType]||1.2; Q_bare_total=Q_bare_unit*factor*qty; }
    } else if(type==='pipe'){ Q_bare_total=Q_bare_unit*multiplier; } 
    else { Q_bare_total=Q_bare_unit*multiplier*qty; }

    const fuelType = document.getElementById('fuel').value;
    let LHV_Val = 8250; let co2Factor = 0.202; let LHV_Unit = "m3";

    if(fuelType === 'manual') {
        LHV_Val = parseFloat(document.getElementById('fuelLhv').value) || 0;
        LHV_Unit = document.getElementById('fuelUnit').value;
        if(LHV_Unit === 'm3') co2Factor = 0.202; else if(LHV_Unit === 'kwh') co2Factor = 0.478; else co2Factor = 0.3; 
    } else {
        LHV_Val = FUEL_PARAMS[fuelType].lhv; co2Factor = FUEL_PARAMS[fuelType].co2;
        if(fuelType === 'gas') LHV_Unit = 'm3'; else if(fuelType === 'elec') LHV_Unit = 'kwh'; else LHV_Unit = 'kg';
    }
    
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
    
    let roiCalc = 0; if(save_money_TL > 0.01 && !ignoreInvestment) { roiCalc = (invTotalTL / save_money_TL * 12); }
    const savedSurfaces = JSON.parse(JSON.stringify(currentSurfaces));

    const inputs={
        type,qty,pLen,location,tProc,tAmb,matKey,thk,useL2, matKey2, thk2,
        inv:invRaw, standard, vDN:document.getElementById('vDN').value, pDN:document.getElementById('pDN').value,
        valveType: document.getElementById('valveType').value, surfaces: savedSurfaces, img:currImg,
        invCurr: invCurrencyCode, energyCurr: energyCurrencyCode, fuelType: fuelType, fuelLhv: LHV_Val, fuelUnit: LHV_Unit, vWind: vWind 
    };
    
    const matName1=document.getElementById('matSelect').options[document.getElementById('matSelect').selectedIndex].text;
    let descStr = "";
    if(matKey==='bare') { descStr = "Yalıtımsız"; } else {
        descStr = `${thk}mm ${matName1}`;
        if(useL2) { const matName2 = document.getElementById('matSelect2').options[document.getElementById('matSelect2').selectedIndex].text; descStr += ` + ${thk2}mm ${matName2}`; }
    }
    
    const realBareTemp = (matKey === 'bare') ? finalTs : tProc; 
    const realInsTemp = (matKey === 'bare') ? "-" : finalTs;

    return{
        name:Name, desc:descStr, location: location, qty: (type==='pipe' ? multiplier : qty), unit: unitLabel,
        invTL: invTotalTL, saveTL: save_money_TL, lossTL: annual_loss_TL, lossBareTL: loss_money_bare_TL, 
        fuelSaved: (matKey==='bare') ? 0 : fuelSavedAmount, fuelLost: fuelLostAmount, fuelUnit: LHV_Unit,
        kwhBare: Math.round(energyLostBare_kWh).toLocaleString('tr-TR'), kwhIns: Math.round(energyLostIns_kWh).toLocaleString('tr-TR'), kwhSave: Math.round(energySaved_kWh).toLocaleString('tr-TR'),
        co2: co2SavedTotal, Ts: realBareTemp.toFixed(1), Tins: (matKey === 'bare') ? "-" : realInsTemp.toFixed(1), 
        qBare:Q_bare_unit, qIns:Q_unit, img:currImg, roi: roiCalc, inputs
    };
}

// CRUD & UI
function calc(){ if(isPackageMode) { addToPackageBasket(); } else { LIST.push(getCalculationResult()); resetForm(); render(); } }
function finishUpdate(){if(editingIndex!==null)LIST[editingIndex]=getCalculationResult();editingIndex=null;document.getElementById('btnAdd').classList.remove('hidden');document.getElementById('btnUpdate').classList.add('hidden');resetForm();render();}

function edit(i){
    editingIndex=i; const d=LIST[i].inputs;
    if(d.type === 'package') { alert("Paketler şu an düzenlenemez, silip tekrar oluşturunuz."); editingIndex = null; return; }
    if(isPackageMode) togglePackageMode();
    setType(d.type);
    document.getElementById('tProc').value = d.tProc;
    document.getElementById('matSelect').value = d.matKey;
    document.getElementById('thk').value = d.thk;
    document.getElementById('inv').value = d.inv;
    document.getElementById('qty').value = d.qty;
    document.getElementById('calcStd').value = d.standard;
    document.getElementById('location').value = d.location || ""; 
    document.getElementById('useL2').checked = d.useL2 || false;
    document.getElementById('vWind').value = (d.vWind !== undefined && d.vWind !== null) ? d.vWind : 1; 
    toggleL2();
    if(d.useL2) { document.getElementById('matSelect2').value = d.matKey2; document.getElementById('thk2').value = d.thk2; }
    if(d.invCurr) document.getElementById('invCurr').value = d.invCurr;
    if(d.energyCurr) document.getElementById('energyCurr').value = d.energyCurr;
    document.getElementById('fuel').value = d.fuelType || 'gas';
    toggleFuelMode();
    if(d.fuelType === 'manual') { document.getElementById('fuelLhv').value = d.fuelLhv; document.getElementById('fuelUnit').value = d.fuelUnit; }
    if(d.img){ currImg=d.img; document.getElementById('prevImg').src=currImg; document.getElementById('prevImg').classList.remove('hidden'); }
    if(d.type === 'valve'){ document.getElementById('valveType').value = d.valveType || 'gate'; document.getElementById('vDN').value = d.vDN; } 
    else if (d.type === 'pipe'){ document.getElementById('pDN').value = d.pDN; document.getElementById('pLen').value = d.pLen || 1; } 
    else if (d.type === 'tank'){ currentSurfaces = d.surfaces || []; renderSurfaces(); }
    document.getElementById('btnAdd').classList.add('hidden');
    document.getElementById('btnUpdate').classList.remove('hidden');
}

function del(i){if(confirm('Silmek istediğine emin misin?')){LIST.splice(i,1);render();}}

function resetForm(){
    currImg=null; document.getElementById('prevImg').classList.add('hidden'); document.getElementById('inv').value=''; document.getElementById('location').value='';
    document.getElementById('vWind').value = 0; currentSurfaces = []; renderSurfaces();
} 

function clearAll(){if(confirm('Tüm listeyi temizle?')){LIST=[];render();}}

function exportCSV(){
    if(LIST.length===0){alert("Liste boş!");return;}
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "Type,Qty,PipeLen,Temp_Proc,Temp_Amb,Material,Thickness,Invest,Standard,Valve_DN,Pipe_DN,Valve_Type,Surfaces,Invest_Curr,Energy_Curr,Location,UseL2,Mat2,Thk2,FuelType,FuelLHV,FuelUnit,PackageName,SubItemsCount,WindSpeed,SubItemsDump\n";
    LIST.forEach(row => {
        const i = row.inputs;
        let surfStr = "";
        if(i.surfaces && i.surfaces.length > 0){ surfStr = i.surfaces.map(s => s.type === 'circle' ? `C:${s.d}` : `${s.w}x${s.h}`).join('|'); }
        const pkgName = i.type === 'package' ? row.name.replace("📦 PAKET: ", "") : "";
        const subCount = i.type === 'package' ? i.subItems.length : 0;
        const subItemsDump = i.type === 'package' ? btoa(unescape(encodeURIComponent(JSON.stringify(i.subItems)))) : "";
        const r = [
            i.type, row.qty, i.pLen, i.tProc || 0, i.tAmb || 0, i.matKey, i.thk || 0, i.inv, i.standard || "", i.vDN || "", i.pDN || "", i.valveType || "", surfStr, i.invCurr, i.energyCurr, 
            `"${row.location}"`, i.useL2, i.matKey2, i.thk2, i.fuelType, i.fuelLhv, i.fuelUnit, `"${pkgName}"`, subCount, i.vWind || 1, subItemsDump
        ];
        csvContent += r.join(",") + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "izolasyon_data.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function importCSV(input){
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e){
        const text = e.target.result; const rows = text.split('\n'); rows.shift(); let addedCount = 0;
        const el = {
            type: document.getElementById('type'), qty: document.getElementById('qty'), pLen: document.getElementById('pLen'),
            tProc: document.getElementById('tProc'), tAmb: document.getElementById('tAmb'), matKey: document.getElementById('matSelect'),
            thk: document.getElementById('thk'), inv: document.getElementById('inv'), calcStd: document.getElementById('calcStd'),
            vDN: document.getElementById('vDN'), pDN: document.getElementById('pDN'), valveType: document.getElementById('valveType'),
            invCurr: document.getElementById('invCurr'), energyCurr: document.getElementById('energyCurr'), location: document.getElementById('location'),
            useL2: document.getElementById('useL2'), matSelect2: document.getElementById('matSelect2'), thk2: document.getElementById('thk2'),
            fuel: document.getElementById('fuel'), fuelLhv: document.getElementById('fuelLhv'), fuelUnit: document.getElementById('fuelUnit'), vWind: document.getElementById('vWind')
        };
        if(isPackageMode) togglePackageMode();
        rows.forEach(row => {
            if(!row.trim()) return;
            let cols = row.split(','); if(cols.length < 5) cols = row.split(';'); if(cols.length < 10) return;
            try {
                const type = cols[0];
                if (type === 'package' && cols[25] && cols[25].length > 5) {
                    try {
                        const subItemsJson = decodeURIComponent(escape(window.atob(cols[25])));
                        const basket = JSON.parse(subItemsJson);
                        const pkgName = cols[22] ? cols[22].replace(/^"|"$/g, '') : "Paket";
                        const pkgQty = parseFloat(cols[1]) || 1;
                        const pkgInv = parseFloat(cols[7]) || 0;
                        const pkgInvCurr = cols[13] || "TL";
                        const compositeItem = buildPackageItem(basket, pkgName, pkgQty, pkgInv, pkgInvCurr);
                        LIST.push(compositeItem); addedCount++; return; 
                    } catch (pkgErr) { console.error("Paket parse hatası:", pkgErr); return; }
                }
                setType(type);
                el.qty.value = cols[1]; el.pLen.value = cols[2]; el.tProc.value = cols[3]; el.tAmb.value = cols[4];
                el.matKey.value = cols[5]; el.thk.value = cols[6]; el.inv.value = cols[7]; el.calcStd.value = cols[8]; 
                if(type === 'valve') { el.vDN.value = cols[9] || ""; el.valveType.value = cols[11] || "gate"; } 
                else if (type === 'pipe') { el.pDN.value = cols[10] || ""; } 
                if(type === 'tank' && cols[12] && cols[12].length > 2) {
                    currentSurfaces = []; 
                    const sList = cols[12].split('|');
                    sList.forEach(s => {
                        if(s.startsWith('C:')){ const dVal = parseFloat(s.split(':')[1]); currentSurfaces.push({type: 'circle', d: dVal}); } 
                        else { const dims = s.split('x'); if(dims.length===2) currentSurfaces.push({type: 'rect', w: parseFloat(dims[0]), h: parseFloat(dims[1])}); }
                    });
                }
                el.invCurr.value = cols[13] || "TL"; el.energyCurr.value = cols[14] || "TL";
                let locRaw = cols[15] || ""; el.location.value = locRaw.replace(/^"|"$/g, '');
                const isL2 = (cols[16] === 'true'); el.useL2.checked = isL2; toggleL2(); 
                if(isL2){ el.matSelect2.value = cols[17]; el.thk2.value = cols[18]; }
                el.fuel.value = cols[19] || 'gas'; toggleFuelMode();
                if(cols[19] === 'manual'){ el.fuelLhv.value = cols[20]; el.fuelUnit.value = cols[21]; }
                if(cols[24] !== undefined) { el.vWind.value = cols[24]; }
                const resultObj = getCalculationResult(); LIST.push(resultObj); addedCount++;
            } catch(err) { console.error("Satır işleme hatası:", err, row); }
        });
        resetForm(); render(); input.value = ''; 
        if(addedCount > 0) { alert(`${addedCount} kalem başarıyla içe aktarıldı!`); } else { alert("İçe aktarılacak veri bulunamadı."); }
    };
    reader.readAsText(file);
}

function render(){
    const tb=document.getElementById('gridBody');tb.innerHTML='';let gInv=0,gSave=0,gCo2=0;
    const currSymVal=document.getElementById('curr')?document.getElementById('curr').value:'TL';
    const reportRate = FX[currSymVal] || 1; 
    const currSymMap={'USD':'$','EUR':'€','TL':'₺'};
    const currSym=currSymMap[currSymVal]||'';

    LIST.forEach((i,x)=>{
        const invDisp = i.invTL / reportRate; const saveDisp = i.saveTL / reportRate;
        if(i.inputs.matKey!=='bare'){gInv+=invDisp;gSave+=saveDisp;gCo2+=i.co2;}
        const roiSuffix="Ay"; const roi=i.roi > 0 ? i.roi.toFixed(1)+" "+roiSuffix : "-";
        const imgTag=i.img?`<img src="${i.img}" class="w-10 h-10 object-cover rounded">`:`<div class="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-500">${i.inputs.type==='package'?'PKG':'-'}</div>`;
        const locTag = i.location ? `<div class="text-[9px] text-indigo-500 font-bold mt-1 uppercase"><i data-lucide="map-pin" class="w-3 h-3 inline"></i> ${i.location}</div>` : '';
        const rowClass = i.inputs.type === 'package' ? "bg-indigo-50/50 border-l-4 border-l-indigo-500" : "";
        const qtyInput = `<input type="number" class="grid-input font-bold text-slate-800" value="${i.qty}" onchange="quickUpdate(${x}, 'qty', this.value)">`;
        const invInput = `<div class="flex items-center gap-1 justify-end text-xs"><span class="text-slate-400">${currSym}</span><input type="number" class="grid-input text-right text-slate-600 w-20" value="${invDisp.toFixed(2)}" onchange="quickUpdate(${x}, 'inv', this.value)"></div>`;
        tb.insertAdjacentHTML('beforeend',`<tr class="hover:bg-slate-100 transition border-b border-slate-200 ${x===editingIndex?'bg-indigo-50':''} ${rowClass}">
        <td class="px-6 py-4">${imgTag}</td><td class="px-6 py-4 font-bold text-slate-800">${i.name} ${locTag}</td><td class="px-6 py-4 text-slate-500 text-xs">${i.desc}</td>
        <td class="px-6 py-4 text-center">${qtyInput} <span class="text-[9px] text-slate-400 block">${i.unit}</span></td>
        <td class="px-6 py-4 text-center"><div class="font-bold text-slate-700">${i.Ts}</div><div class="text-[10px] font-bold text-red-500">${i.kwhBare} kWh</div></td>
        <td class="px-6 py-4 text-center"><div class="font-bold text-slate-700">${i.Tins}</div><div class="text-[10px] font-bold text-orange-500">${i.kwhIns} kWh</div></td>
        <td class="px-6 py-4 text-center"><div class="font-bold text-green-600">+${i.kwhSave} kWh</div></td>
        <td class="px-6 py-4 text-right">${invInput}</td><td class="px-6 py-4 text-right text-green-600 font-bold">${i.inputs.matKey!=='bare'?'+'+currSym+fmt(saveDisp):'-'}</td>
        <td class="px-6 py-4 text-right font-bold text-indigo-500">${roi}</td>
        <td class="px-6 py-4 text-right"><button onclick="edit(${x})" class="text-indigo-500 mr-2 hover:text-slate-900"><i data-lucide="pencil" class="w-4 h-4"></i></button><button onclick="del(${x})" class="text-red-500 hover:text-slate-900"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`);
    });
    if(LIST.length===0)tb.innerHTML=`<tr><td colspan="11" class="px-6 py-20 text-center text-slate-500"><i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-20"></i><span id="emptyMsg">Henüz hesaplama eklenmedi.</span></td></tr>`;
    document.getElementById('dashInv').innerText=currSym+fmt(gInv); document.getElementById('dashSave').innerText=currSym+fmt(gSave);
    document.getElementById('dashCo2').innerHTML=gCo2.toFixed(1)+' Ton';
    const totalRoi=gSave>0?(gInv/gSave*12):0;
    document.getElementById('dashRoi').innerHTML=totalRoi>0?totalRoi.toFixed(1)+` <span class="text-lg text-slate-500 font-normal">Ay</span>`:'---';
    document.getElementById('barRoi').style.width=totalRoi>0?Math.min((totalRoi/24)*100,100)+'%':'0%';
    lucide.createIcons();
}

function quickUpdate(i, field, val) {
    if(LIST[i].inputs.type === 'package' && field === 'qty') { if(confirm("Paketlerin adedini değiştirmek için paketi silip yeniden oluşturmalısınız.")) { render(); return; } }
    const oldInputs = LIST[i].inputs; if(oldInputs.type === 'package') return;
    setType(oldInputs.type);
    document.getElementById('tProc').value = oldInputs.tProc; document.getElementById('tAmb').value = oldInputs.tAmb;
    document.getElementById('matSelect').value = oldInputs.matKey; document.getElementById('thk').value = oldInputs.thk;
    document.getElementById('calcStd').value = oldInputs.standard; document.getElementById('location').value = oldInputs.location || "";
    document.getElementById('vWind').value = oldInputs.vWind || 0; 
    if(oldInputs.type==='pipe') { document.getElementById('pDN').value = oldInputs.pDN; document.getElementById('pLen').value = oldInputs.pLen; } 
    else if(oldInputs.type==='valve'){ document.getElementById('vDN').value = oldInputs.vDN; document.getElementById('valveType').value = oldInputs.valveType; }
    if(field === 'qty') document.getElementById('qty').value = val; else document.getElementById('qty').value = oldInputs.qty; 
    if(field === 'inv') { document.getElementById('inv').value = val; document.getElementById('invCurr').value = document.getElementById('curr').value; } 
    else { document.getElementById('inv').value = oldInputs.inv; document.getElementById('invCurr').value = oldInputs.invCurr; }
    LIST[i] = getCalculationResult(false); resetForm(); render();
}

function printRep(){
    try{
        const printArea = document.getElementById('print-area');
        if(!printTemplateCache){ printTemplateCache = printArea.innerHTML; }
        printArea.innerHTML = printTemplateCache;
        const today = new Date().toLocaleDateString('tr-TR');
        const auditInput = document.getElementById('auditDate').value;
        let auditDateStr = today; if(auditInput){ const parts = auditInput.split('-'); auditDateStr = `${parts[2]}.${parts[1]}.${parts[0]}`; }
        const currSymVal = document.getElementById('curr').value; const reportRate = FX[currSymVal] || 1;
        const currSymMap = {'USD':'$','EUR':'€','TL':'₺'}; const currSym = currSymMap[currSymVal]||'';
        let gInv=0, gSave=0, gCo2=0, gLoss=0, gFuelLost=0; let gTotalKwh = 0; let lastFuelUnit = ""; let maxTempDetected = 0; let allWinds = [];

        LIST.forEach(i => {
            const invDisp = i.invTL / reportRate; const saveDisp = i.saveTL / reportRate; const lossDisp = i.lossTL / reportRate; const lossBareDisp = i.lossBareTL / reportRate;
            const itemTs = parseFloat(i.Ts) || 0; if(itemTs > maxTempDetected) maxTempDetected = itemTs;
            if(i.inputs.type !== 'package') { allWinds.push(i.inputs.vWind || 1); }
            const rawKwh = parseFloat(i.kwhBare.replace(/\./g,'').replace(',','.')); gTotalKwh += rawKwh;
            if(i.inputs.matKey!=='bare'){ gInv += invDisp; gSave += saveDisp; gCo2 += i.co2; gLoss += lossBareDisp; gFuelLost += i.fuelLost; } else { gLoss += lossDisp; gFuelLost += i.fuelLost; }
            lastFuelUnit = i.inputs.fuelUnit || "";
        });

        let uniqueWinds = new Set(allWinds); let windNarrativeBit = "";
        if(uniqueWinds.size > 1 || LIST.some(x=>x.inputs.type==='package')) { windNarrativeBit = "tesis içi farklı lokasyonların rüzgar şartlarına uygun olarak"; } 
        else { let val = allWinds.length > 0 ? allWinds[0] : document.getElementById('vWind').value; windNarrativeBit = `<strong>${val} m/s</strong> rüzgar hızı koşullarında`; }

        const ghostContainer = document.createElement('div');
        ghostContainer.style.width = '210mm'; ghostContainer.style.padding = '40px'; ghostContainer.style.position = 'absolute'; ghostContainer.style.top = '-9999px'; ghostContainer.style.left = '-9999px'; ghostContainer.style.visibility = 'hidden';
        document.body.appendChild(ghostContainer);
        const tableHeaderHTML = `<th class="w-6">#</th><th class="w-20 text-center">Görsel</th><th class="text-left w-48">Ekipman</th><th class="text-center w-20 text-xs text-red-500">Çıplak<br><span class="text-[8px] font-normal">(Kayıp kWh)</span></th><th class="text-center w-20 text-xs text-blue-500">İzolasyon<br><span class="text-[8px] font-normal">(Kayıp kWh)</span></th><th class="text-center w-20 text-xs text-green-500">Kazanç<br><span class="text-[8px] font-normal">(Fark kWh)</span></th><th class="text-center w-8">Adet</th><th class="text-right text-slate-700">Yatırım</th><th class="text-right text-green-600 font-black">Net Kazanç</th><th class="text-right w-10">ROI</th>`;
        const PAGE_SAFE_HEIGHT = 880; const pages = []; let currentPage = []; let currentHeight = 0;
        let tempTable = document.createElement('table'); tempTable.className = 'w-full text-sm'; ghostContainer.appendChild(tempTable);
        let tempTbody = document.createElement('tbody'); tempTable.appendChild(tempTbody);

        LIST.forEach((i, idx) => {
            const globalIndex = idx + 1; const iInv = i.invTL / reportRate; const iSave = i.saveTL / reportRate; const roi = i.roi > 0 ? i.roi.toFixed(1) : "-";
            const imgTag = i.img ? `<img src="${i.img}" class="w-16 h-16 object-cover rounded mx-auto border border-slate-200">` : `<div class="w-8 h-8 bg-slate-100 rounded mx-auto flex items-center justify-center text-[8px]">${i.inputs.type==='package'?'PKG':'-'}</div>`;
            const locText = i.location ? `<div class="text-[8px] uppercase text-slate-400 mt-1 font-bold">📍 ${i.location}</div>` : '';
            const trHTML = `<td class="text-center font-bold text-slate-400 border-b border-slate-100">${globalIndex}</td><td class="text-center border-b border-slate-100 p-1">${imgTag}</td><td class="font-bold text-slate-800 border-b border-slate-100 text-[10px]">${i.name} ${locText}<div class="text-[8px] text-slate-500 font-normal mt-0.5">${i.desc}</div></td><td class="text-center border-b border-slate-100"><div class="font-bold text-slate-700">${i.Ts}</div><div class="text-[9px] font-bold text-red-500">${i.kwhBare} kWh</div></td><td class="text-center border-b border-slate-100"><div class="font-bold text-slate-700">${i.Tins}</div><div class="text-[9px] font-bold text-orange-500">${i.kwhIns} kWh</div></td><td class="text-center border-b border-slate-100"><div class="font-bold text-green-600">+${i.kwhSave} kWh</div></td><td class="text-center border-b border-slate-100 text-[10px]">${i.qty} ${i.unit}</td><td class="text-right font-mono text-[10px] text-slate-700 border-b border-slate-100">${currSym}${fmt(iInv)}</td><td class="text-right font-mono text-[10px] text-green-600 font-bold border-b border-slate-100">${i.inputs.matKey!=='bare'?'+'+currSym+fmt(iSave):'-'}</td><td class="text-right font-bold text-blue-600 text-[10px] border-b border-slate-100">${roi}</td>`;
            const tr = document.createElement('tr'); tr.innerHTML = trHTML; tempTbody.appendChild(tr); const rowHeight = tr.offsetHeight;
            if (currentHeight + rowHeight > PAGE_SAFE_HEIGHT) { pages.push(currentPage); currentPage = []; currentHeight = 0; tempTbody.innerHTML = ''; tempTbody.appendChild(tr); }
            currentPage.push({ html: trHTML }); currentHeight += rowHeight;
        });
        if (currentPage.length > 0) pages.push(currentPage); document.body.removeChild(ghostContainer);
        const tablePageTemplate = document.getElementById('p-table'); const summaryPage = document.getElementById('p-summary'); tablePageTemplate.remove(); 
        const totalPages = 1 + pages.length + 1; 
        pages.forEach((pageRows, index) => {
            const newPage = tablePageTemplate.cloneNode(true); newPage.id = '';
            const titleEl = newPage.querySelector('h2'); titleEl.innerText = "Detaylı Analiz Dökümü"; if(index > 0) { titleEl.innerHTML += ` <span class="text-sm text-slate-400 font-normal">(${index+1})</span>`; }
            newPage.querySelector('#rDate').innerText = today; newPage.querySelector('thead tr').innerHTML = tableHeaderHTML;
            const pageNum = index + 2; newPage.querySelector('.page-num').innerText = `Sayfa ${pageNum} / ${totalPages}`;
            const tbody = newPage.querySelector('tbody'); tbody.innerHTML = ''; 
            pageRows.forEach(row => { tbody.innerHTML += `<tr>${row.html}</tr>`; });
            document.getElementById('print-area').insertBefore(newPage, summaryPage);
        });

        const totalRoi = gSave>0 ? (gInv/gSave*12) : 0;
        document.getElementById('covClient').innerText = document.getElementById('cName').value || "FİRMA ADI";
        document.getElementById('covContact').innerText = document.getElementById('cEng').value || "";
        document.getElementById('covProv').innerText = document.getElementById('pName').value || "TEDARİKÇİ";
        document.getElementById('covDate').innerText = today; document.getElementById('covIntroDate').innerText = auditDateStr; 
        document.getElementById('covRoiBig').innerText = totalRoi>0 ? totalRoi.toFixed(1) : "---";
        
        const fuelYearly = gFuelLost; const fuelMonthly = gFuelLost / 12; const fuelWeekly = gFuelLost / 52; const fuelDaily = gFuelLost / 365;
        document.getElementById('covFuelYear').innerText = Math.round(fuelYearly).toLocaleString(); document.getElementById('covFuelMonth').innerText = Math.round(fuelMonthly).toLocaleString(); document.getElementById('covFuelWeek').innerText = Math.round(fuelWeekly).toLocaleString(); document.getElementById('covFuelDay').innerText = Math.round(fuelDaily).toLocaleString();
        
        const kwhYearly = gTotalKwh; const kwhMonthly = gTotalKwh / 12; const kwhWeekly = gTotalKwh / 52; const kwhDaily = gTotalKwh / 365;
        document.getElementById('covKwhYear').innerText = Math.round(kwhYearly).toLocaleString(); document.getElementById('covKwhMonth').innerText = Math.round(kwhMonthly).toLocaleString(); document.getElementById('covKwhWeek').innerText = Math.round(kwhWeekly).toLocaleString(); document.getElementById('covKwhDay').innerText = Math.round(kwhDaily).toLocaleString();
        
        const fuelLabels = document.querySelectorAll('.fuel-unit-label'); fuelLabels.forEach(el => el.innerText = lastFuelUnit);
        const tAmb = document.getElementById('tAmb').value; const eff = document.getElementById('eff').value; const price = document.getElementById('price').value; const hours = document.getElementById('hours').value; const energyCurr = document.getElementById('energyCurr').value;
        const narrative = `Simülasyonlar; <strong>${tAmb}°C</strong> ortam sıcaklığı, ${windNarrativeBit}, <strong>%${eff}</strong> sistem verimi ve yıllık <strong>${hours} saat</strong> çalışma süresi baz alınarak hesaplanmıştır. Enerji birim maliyeti <strong>${price} ${energyCurr}</strong> olarak kabul edilmiştir.`;
        document.getElementById('covNarrative').innerHTML = narrative;
        const qrImgEl = document.getElementById('covQrCode'); if (userQrImg) { qrImgEl.src = userQrImg; qrImgEl.classList.remove('opacity-20'); } else { qrImgEl.src = ""; qrImgEl.classList.add('opacity-50'); }

        document.getElementById('sumLoss').innerText = currSym + fmt(gLoss); document.getElementById('sumFuelLost').innerText = `(${Math.round(gFuelLost).toLocaleString()} ${lastFuelUnit})`;
        document.getElementById('sumCo2').innerText = gCo2.toFixed(1); document.getElementById('sumTrees').innerText = Math.round(gCo2*40).toLocaleString();
        document.getElementById('sumInvSummary').innerText = currSym + fmt(gInv); document.getElementById('sumNetSaveSummary').innerText = currSym + fmt(gSave);
        document.getElementById('sumRoiSummary').innerText = totalRoi>0 ? totalRoi.toFixed(1) + " AY" : "---";

        const pt = document.getElementById('projTable'); pt.innerHTML = '';
        let rowL = `<tr class="border-b border-slate-200"><td class="p-2 text-left font-bold text-red-600">Mevcut Durum (Kümülatif Kayıp)</td>`; let tL=0;
        for(let y=1; y<=5; y++){ tL += gLoss; rowL += `<td class="p-2 text-red-500">-${currSym}${fmt(tL)}</td>`; } rowL += `<td class="p-2 font-black text-red-700">-${currSym}${fmt(tL)}</td></tr>`;
        let rowG = `<tr><td class="p-2 text-left font-bold text-green-600">Yatırım Sonrası (Kümülatif Kazanç)</td>`; let tG = -gInv;
        for(let y=1; y<=5; y++){ tG += gSave; rowG += `<td class="p-2 ${tG>=0?'text-green-600':'text-red-400'}">${currSym}${fmt(tG)}</td>`; } rowG += `<td class="p-2 font-black ${tG>=0?'text-green-700':'text-red-700'}">${tG>0?'+':''}${currSym}${fmt(tG)}</td></tr>`;
        pt.innerHTML = rowL + rowG;
        setTimeout(()=>{ lucide.createIcons(); window.print(); }, 100);
    }catch(e){ alert('Rapor oluşturulurken hata oluştu: ' + e.message); console.error(e); }
}