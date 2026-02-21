// ================================================================
// OPTIMIZI.APP - FIYAT TEKLIF ARACI v4.0 (Nihai)
// JSON Veritabanı ve Akıllı Extrapolasyon Sistemi
// ================================================================

let VALVE_DATA = {};
let BRAND_INDEX = {};
let BRANDS = {};
let STANDARDS = {};
let MATERIALS_DB = [];

// ============ DATA LOADER ============
async function loadAllData() {
    const base = './'; 
    try {
        const [matRes, stdRes, idxRes] = await Promise.all([
            fetch(base + 'data/materials.json'),
            fetch(base + 'data/standards.json'),
            fetch(base + 'data/brands/_index.json')
        ]);
        
        if (!matRes.ok || !stdRes.ok || !idxRes.ok) throw new Error('JSON dosyaları yüklenemedi');
        
        const matData = await matRes.json();
        const stdData = await stdRes.json();
        BRAND_INDEX = await idxRes.json();
        STANDARDS = stdData;
        MATERIALS_DB = matData.materials;
        
        const brandPromises = Object.entries(BRAND_INDEX.brands || {}).map(async ([key, brand]) => {
            const res = await fetch(base + 'data/brands/' + brand.file);
            if (res.ok) BRANDS[key] = await res.json();
        });
        await Promise.all(brandPromises);
        
        applyDataCompat();
        return true;
    } catch(e) {
        console.error('❌ Veri yükleme hatası:', e);
        toast('Veri dosyaları yüklenemedi! Sayfa düzgün çalışmayabilir.', 'er');
        return false;
    }
}

function applyDataCompat() {
    M = MATERIALS_DB.map(m => ({
        t: m.type, s: m.subtype, n: m.name,
        u: m.unit, p: m.price, c: m.currency,
        k: m.thickness_mm
    }));
    M.forEach(m => { if (m.k) TK[m.n] = m.k; });
    
    FD = {};
    for (const [dn, cls] of Object.entries(STANDARDS.flange_diameters || {})) {
        FD[parseInt(dn)] = {};
        for (const [c, v] of Object.entries(cls)) FD[parseInt(dn)][parseInt(c)] = v;
    }
    
    // CRITICAL BUG FIX: #VALUE! filters
    BL = {};
    for (const [ty, tbl] of Object.entries(STANDARDS.body_lengths || {})) {
        BL[ty] = {};
        for (const [dn, cls] of Object.entries(tbl)) {
            BL[ty][parseInt(dn)] = {};
            for (const [c, v] of Object.entries(cls)) {
                let obj = {};
                if(v && typeof v === 'object') {
                    for(const [dim, val] of Object.entries(v)) {
                        obj[dim] = (val === "#VALUE!" || isNaN(val)) ? null : parseFloat(val);
                    }
                }
                BL[ty][parseInt(dn)][parseInt(c)] = obj;
            }
        }
    }
    
    AP = STANDARDS.agraf_pul || {};
    if (STANDARDS.fx) { P.usd = STANDARDS.fx.USD || P.usd; P.eur = STANDARDS.fx.EUR || P.eur; }
    if (STANDARDS.hourly_cost) P.hc = STANDARDS.hourly_cost;
    
    VALVE_DATA = {};
    for (const [brandKey, brandData] of Object.entries(BRANDS)) {
        for (const [vKey, vData] of Object.entries(brandData.valves || {})) {
            const intDims = {};
            for (const [dk, dv] of Object.entries(vData.dims || {})) { intDims[parseInt(dk)] = dv; }
            VALVE_DATA[vKey] = { ...vData, dims: intDims, _brand: brandKey, _brandName: brandData.brand };
        }
    }
    
    // Fallback hardcoded logic into JSON
    const PDF_DIMS = {
        '3way': { '15':{L:130,D:95}, '25':{L:160,D:115}, '50':{L:230,D:165}, '100':{L:350,D:220} },
        'yfilter': { '15':{L:130,D:95}, '50':{L:230,D:165}, '150':{L:480,D:285} },
        'check_clv': { '15':{L:25,D:45}, '50':{L:43,D:107}, '100':{L:64,D:162}, '300':{L:114,D:380} }, 
        'trap': { '15':{L:150,D:95}, '25':{L:160,D:115} }
    };
    for(const [k, v] of Object.entries(PDF_DIMS)){
        if(!VALVE_DATA[k]) VALVE_DATA[k] = { dims: v, desc: TN[k] || k, type: TT[k] };
    }

    initExtrapolation(); // Extrapolate cleanly without NaN crashes
}

// ============ EXTRAPOLATION ENGINE ============
function extrapolateValue(dict, targetX) {
    let keys = Object.keys(dict).map(Number).filter(k => !isNaN(dict[k]) && dict[k] !== null).sort((a,b)=>a-b);
    if(keys.length === 0) return 0;
    if(keys.length === 1) return dict[keys[0]];
    if(keys.includes(targetX)) return dict[targetX];

    let lower = keys[0], upper = keys[keys.length-1];
    if (targetX <= lower) { lower = keys[0]; upper = keys[1]; } 
    else if (targetX >= upper) { lower = keys[keys.length-2]; upper = keys[keys.length-1]; }
    else {
        for(let i=0; i<keys.length; i++) {
            if(keys[i] < targetX) lower = keys[i];
            if(keys[i] > targetX) { upper = keys[i]; break; }
        }
    }
    if (lower === upper) return dict[lower];
    let y1 = dict[lower], y2 = dict[upper];
    let slope = (y2 - y1) / (upper - lower);
    let res = y1 + slope * (targetX - lower);
    return res > 0 ? res : 0; 
}

function initExtrapolation() {
    DN_LIST.forEach(dn => {
        if(!FD[dn]) FD[dn] = {};
        CLS.forEach(cl => {
            if(!FD[dn][cl]) {
                let classDict = {};
                Object.keys(FD).forEach(k => { if (k != dn && FD[k] && FD[k][cl]) classDict[k] = FD[k][cl]; });
                FD[dn][cl] = extrapolateValue(classDict, dn);
            }
        });
    });

    ['gate', 'globe', 'butterfly'].forEach(ty => {
        if(!BL[ty]) BL[ty] = {};
        DN_LIST.forEach(dn => {
            if(!BL[ty][dn]) BL[ty][dn] = {};
            CLS.forEach(cl => {
                if(!BL[ty][dn][cl]) {
                    ['L1', 'L1p', 'L2'].forEach(dim => {
                        let dimDict = {};
                        Object.keys(BL[ty]).forEach(k => {
                            if (k != dn && BL[ty][k] && BL[ty][k][cl] && typeof BL[ty][k][cl][dim] === 'number') dimDict[k] = BL[ty][k][cl][dim];
                        });
                        if(!BL[ty][dn][cl]) BL[ty][dn][cl] = {};
                        BL[ty][dn][cl][dim] = extrapolateValue(dimDict, dn);
                    });
                }
            });
        });
    });

    DN_LIST.forEach(dn => {
        let inch = DN_INCH[dn];
        if (inch && !AP[String(inch)]) {
            let aDict = {}, pDict = {};
            Object.keys(AP).forEach(k => { if (k != inch && AP[k]) { aDict[k] = AP[k].a; pDict[k] = AP[k].p; } });
            AP[String(inch)] = { a: Math.round(extrapolateValue(aDict, inch)), p: Math.round(extrapolateValue(pDict, inch)) };
        }
    });
}

// ============ INITIALIZE UI VARIABLES ============
let currentTheme = localStorage.getItem('insjack_theme') || 'dark';
const DN_LIST = [15,20,25,32,40,50,65,80,100,125,150,200,250,300,350,400,450,500,550,600,650,700,750,800,850,900,1000];
const DN_INCH = {15:.5,20:.75,25:1,32:1.25,40:1.5,50:2,65:2.5,80:3,100:4,125:5,150:6,200:8,250:10,300:12,350:14,400:16,450:18,500:20,550:22,600:24,650:26,700:28,750:30,800:32,850:34,900:36,1000:40};
const CLS = [150,300,400,600,900,1500,2500];

const TN = {gate:'Gate Vana', globe:'Globe Vana', butterfly:'Kelebek Vana', yfilter:'Pislik Tutucu', check_clv:'Çekvalf CLV', ball_2:'2 Prç Küresel', ball_3:'3 Prç Küresel', '3way':'Üç Yollu Vana', trap:'Kondenstop', elbow:'Dirsek 90°', flange:'Flanş', manual_pad:'Manuel Yastık'};
const TT = {gate:'gate', globe:'globe', butterfly:'butterfly', yfilter:'butterfly', check_clv:'butterfly', ball_2:'gate', ball_3:'gate', '3way':'globe', trap:'globe', elbow:'pipe', flange:'butterfly', manual_pad:null};
const TP = {gate:['Gövde','Flanş'], globe:['Gövde','Flanş','Kapak'], butterfly:['Tek Parça'], yfilter:['Tek Parça'], check_clv:['Gövde'], ball_2:['Gövde','Flanş'], ball_3:['Gövde','Flanş'], '3way':['Gövde','Flanş','Kapak'], trap:['Gövde','Flanş'], elbow:['Gövde'], flange:['Tek Parça'], manual_pad:['Yastık']};

let P={prefix:'Optimizi', usd:43.1, eur:50.3, hc:459.33, oh:.33, mul:2.5, pd:60, ir:.03, sr:.00948, fw:.1, iw:.1, sw:.3, fr:50, fl:50, sm:15, re:150, lbw:.01, lbx:.3, lby:.3, lbyf:.2, gFB:'1 Sİ - 0.5 mm - Gri', gFT:'1 Sİ - 0.5 mm - Gri', gFL:'TY-50mm', gST:'SS - 3', gDS:'CamElyf-4mm', gVL:'40 mm - Gri', gSP:'SS Z+A+P', gND:'SS Ç.Pul Set', gBK:'D-Toka', gLB:'30*60', gDF:1};
let M=[], FD={}, BL={}, AP={}, TK={}, IT=[], RN=1, plQty={}, curShow={TL:true,USD:false,EUR:true};
let colVis = {ref:true, tip:true, parca:true, dn:true, cls:true, adet:true, zorluk:true, altk:true, ustk:true, dolgu:true, izol:true, fcap:true, s:true, t:true, mkumas:false, mdolgu:false, mdikis:false, mbogma:false, mcirt:false, magraf:false, mpul:false, mlz:true, isc:true, bmly:true, bsat:true, toplam:true, sil:true};
let SVC={cad:0, montaj:0, montajGun:0, montajGunMly:0, nakliye:0};

let PP={gun:22, servis:2750, yemek:220, kkd:31200, saat:9, fcRate:0.05, ekKat:0};
let PERS=[
 {g:"USTABAŞI",a:"Mehmet Şahin",net:78000,kidem:1,servis:2750},
 {g:"ORTACI",a:"Metehan Cin",net:42900,kidem:1,servis:2750},
 {g:"DİKİŞÇİ",a:"Aziz-SR",net:44700,kidem:1,servis:2750},
 {g:"DOLUMCU",a:"Dol - 1",net:63800,kidem:0,servis:0}
];

// ====== HELPERS ======
function gfd(dn,cl){return (FD[dn]&&FD[dn][cl])||0;}
function gbl(ty,dn,cl){
    if(VALVE_DATA[ty] && VALVE_DATA[ty].dims && VALVE_DATA[ty].dims[dn]) return {L1:VALVE_DATA[ty].dims[dn].L, L1p:0, L2:0};
    const t=TT[ty]; if(!t||!BL[t]||!BL[t][dn])return{L1:0,L1p:0,L2:0};
    if(BL[t][dn][cl])return BL[t][dn][cl];
    const a=Object.keys(BL[t][dn]).map(Number).sort((x,y)=>x-y);
    const c=a.reduce((p,c2)=>Math.abs(c2-cl)<Math.abs(p-cl)?c2:p,a[0]);
    return BL[t][dn][c]||{L1:0,L1p:0,L2:0}
}
function gap(inch){return AP[String(inch)]||{a:0,p:0}}

const fm=(v,d=2)=>Number(v).toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d});
const ftl=v=>'₺'+fm(v); const feu=v=>'€'+fm(v); const fus=v=>'$'+fm(v);
function mn2(n){return M.find(m=>m.n===n)}
function mp(m){if(!m)return 0; return m.c==='USD'?m.p*P.usd:m.c==='EUR'?m.p*P.eur:m.p}
function tk2(n){return TK[n]||20}
function curConv(tl,cur){return cur==='USD'?tl/P.usd:cur==='EUR'?tl/P.eur:tl}

// ====== FETCH KUR ======
async function fetchKur() {
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        const tryRate = data.rates.TRY;
        const eurRate = data.rates.TRY / data.rates.EUR;
        if(tryRate && eurRate) {
            P.usd = tryRate;
            P.eur = eurRate;
            recalcAll();
            try { rPar(); } catch(e){}
            const badge = document.getElementById('apiStatusBadge');
            if(badge) badge.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-[var(--gn)]"></i> Güncel`;
            toast('Kurlar TCMB muadili API ile güncellendi', 'in');
        }
    } catch(e) { console.log('Kur API hatası', e); }
}

// ====== PERSONEL CALCULATIONS ======
function calcPers(p){
 const E=p.net*1.4*12; const F=p.kidem?E/12:0; const G=p.kidem?F/2:0;
 const base=E+F+G+(p.servis||0)*12+PP.yemek*PP.gun*12+PP.kkd;
 const M=base*PP.fcRate*1.5; const N=base+M; const O=N/12/PP.gun/PP.saat/(1+PP.fcRate);
 return{E,F,G,M,N,O};
}
function calcAllPers(){
 let tN=0,tO=0,tM=0,cnt=PERS.length;
 PERS.forEach(p=>{const c=calcPers(p);p._c=c;tN+=c.N;tO+=c.O;tM+=c.M});
 const avg=cnt>0?tO/cnt*(1+PP.ekKat):0;
 P.hc=avg; // MASTER LINK TO PARAMETERS
 return{tN,avg,cnt,tM};
}

function rPers(){
 const res=calcAllPers();
 document.getElementById('pmAvg').textContent=ftl(res.avg);
 document.getElementById('pmCnt').textContent=res.cnt;
 document.getElementById('pmTot').textContent=ftl(res.tN);
 document.getElementById('pmDay').textContent=ftl(res.tN/12/PP.gun);
 
 document.getElementById('pmParams').innerHTML=
  `<div class="pr"><span class="l">Aylık Çalışılan Gün</span><input type="number" value="${PP.gun}" step="1" onchange="PP.gun=parseInt(this.value)||22;rPers();recalcAll()"><span class="u">g</span></div>`+
  `<div class="pr"><span class="l">Günlük Saat</span><input type="number" value="${PP.saat}" step="1" onchange="PP.saat=parseInt(this.value)||9;rPers();recalcAll()"><span class="u">sa</span></div>`+
  `<div class="pr"><span class="l">Günlük Yemek</span><input type="number" value="${PP.yemek}" step="10" onchange="PP.yemek=parseFloat(this.value)||0;rPers();recalcAll()"><span class="u">₺</span></div>`+
  `<div class="pr"><span class="l">Yıllık KKD</span><input type="number" value="${PP.kkd}" step="100" onchange="PP.kkd=parseFloat(this.value)||0;rPers();recalcAll()"><span class="u">₺</span></div>`+
  `<div class="pr"><span class="l">Fazla Çalışma %</span><input type="number" value="${PP.fcRate*100}" step="1" onchange="PP.fcRate=parseFloat(this.value)/100||0;rPers();recalcAll()"><span class="u">%</span></div>`+
  `<div class="pr"><span class="l">Ek Katsayı</span><input type="number" value="${PP.ekKat*100}" step="1" onchange="PP.ekKat=parseFloat(this.value)/100||0;rPers();recalcAll()"><span class="u">%</span></div>`;
 
 const b=document.getElementById('pmBody');b.innerHTML='';
 let sTotN=0,sTotO=0,sTotM=0;
 PERS.forEach((p,i)=>{const c=p._c;sTotN+=c.N;sTotO+=c.O;sTotM+=c.M;
  const tr=document.createElement('tr');
  tr.innerHTML=`<td class="lb text-center">${i+1}</td>`+
   `<td><select class="font-bold text-[var(--cy)]" style="background:transparent;border:none;outline:none" onchange="PERS[${i}].g=this.value;rPers();recalcAll()">${['USTABAŞI','ORTACI','DİKİŞÇİ','DOLUMCU','KALİTE','DİĞER'].map(g=>`<option${p.g===g?' selected':''}>${g}</option>`).join('')}</select></td>`+
   `<td><input value="${p.a}" onchange="PERS[${i}].a=this.value" class="font-bold text-[var(--tx-main)]"></td>`+
   `<td><input type="number" value="${p.net}" step="100" onchange="PERS[${i}].net=parseFloat(this.value)||0;rPers();recalcAll()"></td>`+
   `<td class="c">${fm(c.E)}</td><td class="c">${fm(c.F)}</td><td class="c">${fm(c.G)}</td>`+
   `<td><input type="number" value="${p.servis}" step="100" onchange="PERS[${i}].servis=parseFloat(this.value)||0;rPers();recalcAll()"></td>`+
   `<td class="c">${PP.yemek}</td><td class="c">${fm(PP.kkd,0)}</td>`+
   `<td class="c text-[var(--am)] font-bold">${fm(c.M)}</td>`+
   `<td class="c text-[var(--ac)] font-bold">${fm(c.N)}</td>`+
   `<td class="g font-mono font-black text-[0.85rem]">${fm(c.O)}</td>`+
   `<td class="text-center"><button onclick="optConfirm('Personeli silmek istiyor musunuz?', ()=>{PERS.splice(${i},1);rPers();recalcAll()})" class="bt bt2 px-2 py-1"><i data-lucide="x" class="w-3 h-3"></i></button></td>`;
  b.appendChild(tr)});
 document.getElementById('pmFcTot').textContent=fm(sTotM);
 document.getElementById('pmNTot').textContent=fm(sTotN);
 document.getElementById('pmOTot').textContent=fm(res.avg);
}

// ====== PRODUCT CALCULATION ======
function calcItem(it){
 const gFM=mn2(P.gFL), I=gFM?tk2(gFM.n):20, N=gfd(it.dn,it.cl), lens=gbl(it.ty,it.dn,it.cl), inch=DN_INCH[it.dn]||0, apv=gap(inch);
 let tMC=0, tLC=0, tLH=0;
 it.parts.forEach((pt,pi)=>{
  const mFB=mn2(pt.matOv.fb||P.gFB), mFT=mn2(pt.matOv.ft||P.gFT), mFL=mn2(pt.matOv.fl||P.gFL);
  const localI=mFL?tk2(mFL.n):I;
  const fbP=mp(mFB), ftP=mp(mFT), flP=mp(mFL), stP=mp(mn2(P.gST)), dsP=mp(mn2(P.gDS)), vlP=mp(mn2(P.gVL)), spP=mp(mn2(P.gSP)), ndP=mp(mn2(P.gND));
  let S,T;
  if(it.ty==='manual_pad'){S=pt.ov.S||500;T=pt.ov.T||300}
  else if(pt.nm==='Gövde'||pt.nm==='Tek Parça'){const K=(lens.L1||0)+P.fr+P.fl; S=it.qt===0?0:(((N+2*localI)*Math.PI)+P.sm); T=it.qt===0?0:(K+localI+P.sm)}
  else if(pt.nm==='Flanş'){const fL=lens.L1p||lens.L2||(lens.L1||0); const K=fL-N/2; S=it.qt===0?0:(((N+2*localI)*Math.PI)+P.sm); T=it.qt===0?0:(K+localI+P.sm)}
  else if(pt.nm==='Kapak'){S=it.qt===0?0:((N+2*localI)+P.sm); T=S}
  else{S=pt.ov.S||0;T=pt.ov.T||0}
  if(pt.ov.S!=null)S=pt.ov.S; if(pt.ov.T!=null)T=pt.ov.T;
  if(it.qt===0||!S||!T){pt.calc={S:0,T:0,I:localI,N,fab:0,fil:0,sew:0,drw:0,vlc:0,ag:0,pl:0,mc:0,lc:0,lh:0};return}
  const fB2=S*T*2*(1+P.fw)/1e6, fE=90*T*(1+P.fw)/1e6, fR=(50*2*S)*(1+P.fw)/1e6;
  let fab=pt.ov.fab!=null?pt.ov.fab:(fB2+fE+fR);
  let fil=pt.ov.fil!=null?pt.ov.fil:((S-P.sm)*(T-localI-P.sm)*(1+P.iw)/1e6);
  let sew=pt.ov.sew!=null?pt.ov.sew:(((2*(S+T))+(2*S)+(7.5*T))*((1+P.sw)*2.4/1000));
  let drw=pt.ov.drw!=null?pt.ov.drw:(((S+P.re)*2)/1000);
  let vlc=pt.ov.vlc!=null?pt.ov.vlc:((lens.L1||T)/1000);
  let ag=pt.ov.ag!=null?pt.ov.ag:apv.a, pl=pt.ov.pl!=null?pt.ov.pl:apv.p;
  let mc=pt.ov.mc!=null?pt.ov.mc:((fab/2*fbP)+(fab/2*ftP)+(fil*flP)+(sew*stP)+(drw*dsP)+(vlc*vlP)+(ag*spP)+(pl*ndP));
  const lh=(pt.bw*sew+pt.bx*fil+pt.by)*it.df;
  let lc=pt.ov.lc!=null?pt.ov.lc:(lh*P.hc);
  pt.calc={S,T,I:localI,N,fab,fil,sew,drw,vlc,ag,pl,mc,lc,lh}; tMC+=mc; tLC+=lc; tLH+=lh;
 });
 it.calc={tMC,tLC,tLH,uc:tMC+tLC,us:(tMC+tLC)*P.mul,tMA:tMC*it.qt,tLA:tLC*it.qt,tS:(tMC+tLC)*P.mul*it.qt}
}

function recalcAll(){
 IT.forEach(calcItem); rProd();
 const ap2=document.querySelector('.pane.on'); if(ap2){if(ap2.id==='p-pl')rPL(); if(ap2.id==='p-ms')rMas();}
 const tI=IT.length, tJ=IT.reduce((s,i)=>s+i.qt,0);
 document.getElementById('sI').textContent=tI; document.getElementById('sJ').textContent=tJ;
}

// ====== RENDERS ======
function rProd(){
 const b=document.getElementById('pdBody'); b.innerHTML=''; const cur=document.getElementById('pdCur').value;
 const fab=M.filter(m=>m.t==='Kumaş'), fil=M.filter(m=>m.t==='Dolgu');
 IT.forEach((it,ii)=>{ const ic=it.calc;
  it.parts.forEach((pt,pi)=>{ const pc=pt.calc||{}, f0=pi===0, np=it.parts.length;
   const oc=k=>pt.ov[k]!=null?' o':'';
   const dcol = k => `data-col="${k}" ${colVis[k] ? '' : 'class="col-hidden"'}`;
   const dcolc = k => `data-col="${k}" class="c${oc(k)}${colVis[k] ? '' : ' col-hidden'}"`;
   const matSel=(k,list)=>`<select style="font-size:.68rem;max-width:100px" onchange="IT[${ii}].parts[${pi}].matOv.${k}=this.value||null;recalcAll()"><option value="">Global</option>${list.map(m=>`<option value="${m.n}"${(pt.matOv[k]||'')==m.n?' selected':''}>${m.n}</option>`).join('')}</select>`;
   
   const tr=document.createElement('tr');
   let h = '';
   if(f0) h += `<td ${dcol('ref')} class="lb text-[var(--ac)] text-center" rowspan="${np}">${it.ref}</td><td ${dcol('tip')} class="lb text-[var(--tx-main)]" rowspan="${np}">${TN[it.ty]||it.ty}</td>`;
   h += `<td ${dcol('parca')} class="text-xs font-semibold text-[var(--tx-mut)] px-2">${pt.nm}</td>`;
   if(f0) h += `<td ${dcol('dn')} style="text-align:center; font-weight:700" rowspan="${np}">${it.dn||'—'}</td><td ${dcol('cls')} style="text-align:center" rowspan="${np}">${it.cl}</td><td ${dcol('adet')} rowspan="${np}"><input type="number" value="${it.qt}" min="0" style="text-align:center; font-weight:700; color:var(--tx-main)" onchange="IT[${ii}].qt=parseInt(this.value)||0;recalcAll()"></td><td ${dcol('zorluk')} rowspan="${np}"><input type="number" value="${it.df}" min=".5" max="5" step=".1" style="text-align:center" class="text-[var(--ac)] font-bold bg-[rgba(99,102,241,0.1)] rounded" onchange="IT[${ii}].df=parseFloat(this.value)||1;recalcAll()"></td>`;
   
   h += `<td ${dcol('altk')}>${matSel('fb',fab)}</td><td ${dcol('ustk')}>${matSel('ft',fab)}</td><td ${dcol('dolgu')}>${matSel('fl',fil)}</td>`;
   h += `<td ${dcol('izol')} class="c text-[var(--am)]" style="text-align:center">${pc.I||'—'}</td><td ${dcol('fcap')} class="c">${pc.N?fm(pc.N,0):'—'}</td>`;
   h += `<td data-col="s" class="c text-[var(--cy)]${oc('S')} ${colVis.s?'':'col-hidden'}" ondblclick="ovr(${ii},${pi},'S',this)" title="Çift tıkla düzenle">${pc.S?fm(pc.S,1):'—'}</td><td data-col="t" class="c text-[var(--cy)]${oc('T')} ${colVis.t?'':'col-hidden'}" ondblclick="ovr(${ii},${pi},'T',this)" title="Çift tıkla düzenle">${pc.T?fm(pc.T,1):'—'}</td>`;
   
   h += `<td ${dcolc('mkumas')} ondblclick="ovr(${ii},${pi},'fab',this)">${pc.fab?fm(pc.fab,4):'—'}</td><td ${dcolc('mdolgu')} ondblclick="ovr(${ii},${pi},'fil',this)">${pc.fil?fm(pc.fil,4):'—'}</td><td ${dcolc('mdikis')} ondblclick="ovr(${ii},${pi},'sew',this)">${pc.sew?fm(pc.sew,3):'—'}</td><td ${dcolc('mbogma')} ondblclick="ovr(${ii},${pi},'drw',this)">${pc.drw?fm(pc.drw,3):'—'}</td><td ${dcolc('mcirt')} ondblclick="ovr(${ii},${pi},'vlc',this)">${pc.vlc?fm(pc.vlc,3):'—'}</td><td ${dcolc('magraf')} ondblclick="ovr(${ii},${pi},'ag',this)">${pc.ag||0}</td><td ${dcolc('mpul')} ondblclick="ovr(${ii},${pi},'pl',this)">${pc.pl||0}</td>`;
   
   h += `<td data-col="mlz" class="c text-[var(--ac)] font-mono${oc('mc')} ${colVis.mlz?'':'col-hidden'}" ondblclick="ovr(${ii},${pi},'mc',this)">${fm(curConv(pc.mc||0,cur))}</td><td data-col="isc" class="c text-[var(--ac)] font-mono${oc('lc')} ${colVis.isc?'':'col-hidden'}" ondblclick="ovr(${ii},${pi},'lc',this)">${fm(curConv(pc.lc||0,cur))}</td>`;
   
   if(f0) h += `<td ${dcol('bmly')} class="c text-[var(--gn)] font-mono" style="font-weight:900; font-size:.85rem" rowspan="${np}">${fm(curConv(ic.uc||0,cur))}</td><td ${dcol('bsat')} class="g text-[var(--gn)] font-mono" rowspan="${np}">${fm(curConv(ic.us||0,cur))}</td><td ${dcol('toplam')} class="g text-[var(--gn)] font-mono" style="font-weight:900; font-size:1rem" rowspan="${np}">${fm(curConv(ic.tS||0,cur))}</td><td ${dcol('sil')} style="text-align:center" rowspan="${np}"><button onclick="optConfirm('Sil?', ()=>{IT.splice(${ii},1);recalcAll()})" class="bt bt2 px-2 py-1"><i data-lucide="x" class="w-3 h-3"></i></button></td>`;
   tr.innerHTML = h; b.appendChild(tr);
  });
 });
 
 let fHtml = '<tr><td colspan="21" class="lb text-right font-black text-[var(--tx-main)]">TOPLAM</td>';
 fHtml += `<td ${colVis.bmly?'':'class="col-hidden"'} class="c font-mono text-[var(--gn)] font-black">${fm(curConv(IT.reduce((s,i)=>s+((i.calc.uc||0)*i.qt),0),cur))}</td>`;
 fHtml += `<td ${colVis.bsat?'':'class="col-hidden"'} class="g font-mono text-[var(--gn)]">${fm(curConv(IT.reduce((s,i)=>s+((i.calc.us||0)*i.qt),0),cur))}</td>`;
 fHtml += `<td ${colVis.toplam?'':'class="col-hidden"'} class="g font-mono text-[var(--gn)] font-black text-[1.1rem]">${fm(curConv(IT.reduce((s,i)=>s+(i.calc.tS||0),0),cur))}</td><td ${colVis.sil?'':'class="col-hidden"'}></td></tr>`;
 document.getElementById('pdFoot').innerHTML = IT.length ? fHtml : '';
 applyColVis(); lucide.createIcons();
}

function ovr(ii,pi,k,td){
 const pt=IT[ii].parts[pi], cv=pt.calc[k]||0;
 const inp=document.createElement('input'); inp.type='number'; inp.value=cv; inp.step='any';
 inp.style.cssText='width:100%;height:100%;background:rgba(245,158,11,.2);color:var(--am);font-weight:800;border:2px solid var(--am);font-size:.76rem;padding:2px 4px;text-align:right;font-family:inherit;border-radius:4px;outline:none;';
 td.textContent=''; td.appendChild(inp); inp.focus(); inp.select();
 function ok(){const nv=parseFloat(inp.value); if(!isNaN(nv)&&nv!==cv){pt.ov[k]=nv; toast(k+' override edildi','in')} recalcAll()}
 inp.onblur=ok; inp.onkeydown=e=>{if(e.key==='Enter')ok(); if(e.key==='Escape'){delete pt.ov[k]; recalcAll()}}
}

// SÜTUN AYARLARI 
function applyColVis() {
    Object.keys(colVis).forEach(key => {
        const th = document.querySelector(`th[data-col="${key}"]`);
        if(th) { if(!colVis[key]) th.classList.add('col-hidden'); else th.classList.remove('col-hidden'); }
    });
}
function rColSettings() {
    const box = document.getElementById('colToggles'); if(!box) return;
    let html = '';
    const labels = {ref:'REF', tip:'Tip', parca:'Parça', dn:'DN', cls:'Class', adet:'Adet', zorluk:'Zorluk', altk:'Alt Kumaş', ustk:'Üst Kumaş', dolgu:'Dolgu', izol:'İzolasyon', fcap:'F.Çap', s:'S (Çevre)', t:'T (Boy)', mkumas:'M.Kumaş', mdolgu:'M.Dolgu', mdikis:'M.Dikiş', mbogma:'M.Boğma', mcirt:'M.Cırt', magraf:'M.Agraf', mpul:'M.Pul', mlz:'Malzeme Fyt', isc:'İşçilik Fyt', bmly:'B.Maliyet', bsat:'B.Satış', toplam:'Toplam', sil:'Sil'};
    Object.keys(colVis).forEach(k => {
        html += `<label class="flex items-center gap-2 cursor-pointer text-[var(--tx-main)]"><input type="checkbox" ${colVis[k]?'checked':''} onchange="colVis['${k}']=this.checked; applyColVis(); rProd(); saveData();" style="accent-color:var(--ac);width:16px;height:16px;"> ${labels[k]}</label>`;
    });
    box.innerHTML = html;
}

function openGlobalMatModal(){
 document.getElementById('globalMatModal').classList.add('show');
 const fab=M.filter(m=>m.t==='Kumaş'), fil=M.filter(m=>m.t==='Dolgu'), hlp=M.filter(m=>m.t==='Yardımcı');
 function gs(lb,k,list,cur){return`<div><label class="text-[10px] font-bold text-[var(--tx-mut)] uppercase">${lb}</label><select class="ps mt-1 font-bold" data-k="${k}" onchange="P[this.dataset.k]=this.value;recalcAll()">${list.map(m=>`<option value="${m.n}"${m.n===cur?' selected':''}>${m.n}</option>`).join('')}</select></div>`}
 const el = document.getElementById('globalMatContent');
 if(el){
     el.innerHTML=
      gs('Alt Kumaş','gFB',fab,P.gFB)+gs('Üst Kumaş','gFT',fab,P.gFT)+gs('Dolgu Malzemesi','gFL',fil,P.gFL)+
      gs('Dikiş İpi','gST',hlp.filter(m=>m.s==='Dikiş İpi'),P.gST)+gs('Boğma İpi','gDS',hlp.filter(m=>m.s==='Boğma İpi'),P.gDS)+
      gs('Cırt Bant','gVL',hlp.filter(m=>m.s==='Cırtbant'),P.gVL)+
      gs('Agraf','gSP',hlp.filter(m=>m.s==='Zımba Set'),P.gSP)+gs('Ç.Pul','gND',hlp.filter(m=>m.s==='Ç.Pul Set'),P.gND)+
      gs('Toka','gBK',hlp.filter(m=>m.s==='Toka'),P.gBK)+gs('Etiket','gLB',hlp.filter(m=>m.s==='Etiket'),P.gLB);
 }
}

function rPL(){
 const ct=document.getElementById('curToggle'); if(ct) ct.innerHTML=['TL','USD','EUR'].map(c=>`<button class="${curShow[c]?'on':''}" onclick="curShow['${c}']=!curShow['${c}'];rPL()">${c}</button>`).join('');
 const hd=document.getElementById('plHead'); if(!hd) return;
 let hh='<tr><th><div class="resizer">REF</div></th><th><div class="resizer">DN</div></th><th><div class="resizer" style="min-width:80px">Mahal</div></th><th><div class="resizer" style="min-width:200px">Açıklama</div></th><th><div class="resizer">Adet</div></th><th><div class="resizer">Birim</div></th>';
 if(curShow.TL)hh+='<th style="background:rgba(99,102,241,.1); color:var(--ac)"><div class="resizer">B.TL</div></th><th style="background:rgba(99,102,241,.13); color:var(--ac)"><div class="resizer">T.TL</div></th>';
 if(curShow.USD)hh+='<th style="background:rgba(16,185,129,.1); color:var(--gn)"><div class="resizer">B.USD</div></th><th style="background:rgba(16,185,129,.15); color:var(--gn)"><div class="resizer">T.USD</div></th>';
 if(curShow.EUR)hh+='<th style="background:rgba(6,182,212,.1); color:var(--cy)"><div class="resizer">B.EUR</div></th><th style="background:rgba(6,182,212,.15); color:var(--cy)"><div class="resizer">T.EUR</div></th>';
 hh+='</tr>'; hd.innerHTML=hh;
 const b=document.getElementById('plBody'); b.innerHTML=''; let totTL=0;
 IT.forEach(it=>{const ic=it.calc, q=plQty[it.ref]||1, aq=it.qt*q, uTL=ic.us||0, tTL=uTL*aq; totTL+=tTL;
  const tr=document.createElement('tr');
  let pfx = P.prefix ? P.prefix + ' ' : '';
  let h=`<td class="lb font-bold text-[var(--ac)] text-center">${it.ref}</td><td class="text-center font-bold">DN${it.dn}</td><td><input value="${it.mh}" onchange="IT.find(x=>x.ref===${it.ref}).mh=this.value" placeholder="—"></td><td class="lb text-left text-[var(--tx-main)]">${pfx}${TN[it.ty]||it.ty} DN${it.dn} Cl${it.cl}</td><td class="o text-center font-bold text-[var(--tx-main)]" ondblclick="openQtyModal(${it.ref})">${aq}</td><td class="text-center text-[var(--tx-mut)]">AD</td>`;
  if(curShow.TL)h+=`<td class="c font-mono text-[var(--ac)]">${fm(uTL)}</td><td class="c font-mono font-bold text-[var(--ac)]">${fm(tTL)}</td>`;
  if(curShow.USD)h+=`<td class="c font-mono text-[var(--gn)]">${fm(uTL/P.usd)}</td><td class="c font-mono font-bold text-[var(--gn)]">${fm(tTL/P.usd)}</td>`;
  if(curShow.EUR)h+=`<td class="c font-mono text-[var(--cy)]">${fm(uTL/P.eur)}</td><td class="c font-mono font-bold text-[var(--cy)]">${fm(tTL/P.eur)}</td>`;
  tr.innerHTML=h; b.appendChild(tr)
 });
 const ft=document.getElementById('plFoot'); let fh='<td colspan="6" class="lb text-right font-extrabold text-[var(--tx-main)]">TOPLAM</td>';
 if(curShow.TL)fh+=`<td class="c"></td><td class="c font-mono font-black text-[1.1rem] text-[var(--ac)]">${ftl(totTL)}</td>`;
 if(curShow.USD)fh+=`<td class="c"></td><td class="c font-mono font-black text-[1.1rem] text-[var(--gn)]">${fus(totTL/P.usd)}</td>`;
 if(curShow.EUR)fh+=`<td class="c"></td><td class="c font-mono font-black text-[1.1rem] text-[var(--cy)]">${feu(totTL/P.eur)}</td>`;
 ft.innerHTML=fh;
}

function rMas(){
 const tM=IT.reduce((s,i)=>s+(i.calc.tMA||0),0), tL=IT.reduce((s,i)=>s+(i.calc.tLA||0),0), tLH=IT.reduce((s,i)=>s+((i.calc.tLH||0)*i.qt),0), tS0=IT.reduce((s,i)=>s+(i.calc.tS||0),0), tJ=IT.reduce((s,i)=>s+i.qt,0);
 const svcMontaj=SVC.montajGun*SVC.montajGunMly; const svcTotal=SVC.cad+svcMontaj+SVC.nakliye;
 const tS=tS0+svcTotal; const dir=tM+tL, ind=dir*P.oh, raw=dir+ind, stmp=raw*P.sr, fin=raw*(P.pd/365)*P.ir, tc=raw+stmp+fin+svcTotal, pr=tS-tc, mg=tS>0?(pr/tS*100):0;
 document.getElementById('kC').textContent=ftl(tc); document.getElementById('kS').textContent=ftl(tS);
 document.getElementById('kP').textContent=ftl(pr); document.getElementById('kP').style.color=pr>=0?'var(--gn)':'var(--rd)';
 document.getElementById('kM').textContent='%'+fm(mg,1); document.getElementById('kJ').textContent=tJ;
 
 document.getElementById('msServices').innerHTML=
  `<div class="pr"><span class="l">CAD/CAM Hizmet</span><input type="number" value="${SVC.cad}" step="100" onchange="SVC.cad=parseFloat(this.value)||0;rMas()"><span class="u">₺</span></div>`+
  `<div class="pr"><span class="l">Montaj (adam gün)</span><input type="number" value="${SVC.montajGun}" step="1" onchange="SVC.montajGun=parseFloat(this.value)||0;rMas()"><span class="u">g</span></div>`+
  `<div class="pr"><span class="l">Adam gün maliyeti</span><input type="number" value="${SVC.montajGunMly}" step="100" onchange="SVC.montajGunMly=parseFloat(this.value)||0;rMas()"><span class="u">₺</span></div>`+
  `<div class="text-[0.7rem] text-[var(--tx-mut)] pl-1 mb-3 font-bold">→ Toplam Montaj: ${fm(svcMontaj)} ₺</div>`+
  `<div class="pr"><span class="l">Nakliye</span><input type="number" value="${SVC.nakliye}" step="100" onchange="SVC.nakliye=parseFloat(this.value)||0;rMas()"><span class="u">₺</span></div>`;
 document.getElementById('msSvcTotal').textContent=ftl(svcTotal);
 
 const mr=(l,d,v)=>`<tr><td class="lb text-left text-[var(--tx-main)]">${l}</td><td style="text-align:center;color:var(--tx-mut);font-size:.68rem">${d}</td><td class="c font-mono text-[var(--tx-main)]">${v}</td></tr>`;
 document.getElementById('tMC').innerHTML=`<tr><td class="hd" colspan="3">DOĞRUDAN</td></tr>${mr('Malzeme','',ftl(tM))}${mr('İşçilik',fm(P.hc)+' ₺/sa',ftl(tL))}<tr><td class="hd2 font-bold" colspan="2">DİREKT</td><td class="c font-bold font-mono text-[var(--cy)]">${ftl(dir)}</td></tr><tr><td class="hd" colspan="3">DOLAYLI</td></tr>
  <tr><td class="lb text-left flex items-center gap-2 text-[var(--tx-main)]">Overhead <input type="number" value="${P.oh*100}" step="1" style="width:50px; background:var(--bg-inp); border:1px solid var(--brd); border-radius:4px; padding:2px; font-size:0.7rem; color:var(--tx-main);" onchange="P.oh=parseFloat(this.value)/100||0; recalcAll(); rPar();">%</td><td style="text-align:center;color:var(--tx-mut);font-size:.68rem">x Dir</td><td class="c font-mono text-[var(--tx-main)]">${ftl(ind)}</td></tr>
  <tr><td class="hd2 font-bold" colspan="2">HAM MALİYET</td><td class="c font-bold font-mono text-[var(--am)]">${ftl(raw)}</td></tr>${mr('Damga V.',fm(P.sr*100,3)+'%',ftl(stmp))}${mr('Finansal',P.pd+'g',ftl(fin))}${mr('Hizmet Bedeli','',ftl(svcTotal))}<tr><td class="hd2 font-bold" colspan="2">TOPLAM MALİYET</td><td class="c font-bold font-mono text-[var(--gn)]" style="font-size:1.1rem">${ftl(tc)}</td></tr><tr><td colspan="3" style="height:4px"></td></tr><tr><td class="hd" colspan="3">SATIŞ</td></tr>
  <tr><td class="lb text-left flex items-center gap-2 text-[var(--tx-main)]">Çarpan <input type="number" value="${P.mul}" step="0.1" style="width:50px; background:var(--bg-inp); border:1px solid var(--brd); border-radius:4px; padding:2px; font-size:0.7rem; color:var(--tx-main);" onchange="P.mul=parseFloat(this.value)||2.5; recalcAll();"></td><td style="text-align:center;color:var(--tx-mut);font-size:.68rem">x Mly</td><td class="c font-mono text-[var(--tx-main)] font-bold">${ftl(tS)}</td></tr>
  ${mr('Kâr','',ftl(pr))}${mr('Marj','','%'+fm(mg,1))}`;
 
 let tots={fab:0,fil:0,sew:0,drw:0,vlc:0,ag:0,pl:0};
 IT.forEach(it=>it.parts.forEach(pt=>{const pc=pt.calc||{};tots.fab+=(pc.fab||0)*it.qt;tots.fil+=(pc.fil||0)*it.qt;tots.sew+=(pc.sew||0)*it.qt;tots.drw+=(pc.drw||0)*it.qt;tots.vlc+=(pc.vlc||0)*it.qt;tots.ag+=(pc.ag||0)*it.qt;tots.pl+=(pc.pl||0)*it.qt}));
 const mm=(l,s,q,u)=>{const m=mn2(s),p=mp(m);return`<tr><td class="lb text-[var(--tx-main)]">${l}</td><td style="font-size:.68rem;color:var(--tx-mut)">${s}</td><td class="c font-mono text-[var(--cy)]">${fm(q,2)}</td><td style="text-align:center;font-size:.68rem;color:var(--tx-mut)">${u}</td><td class="c font-mono text-[var(--tx-main)]">${fm(p)}</td><td class="c font-mono font-bold text-[var(--tx-main)]">${ftl(q*p)}</td></tr>`};
 document.getElementById('tMM').innerHTML=`<thead><tr><th>Malzeme</th><th>Seçim</th><th>Miktar</th><th>Br</th><th>B.Fyt</th><th>Toplam</th></tr></thead><tbody>${mm('Alt Kumaş',P.gFB,tots.fab/2,'M²')}${mm('Üst Kumaş',P.gFT,tots.fab/2,'M²')}${mm('Dolgu',P.gFL,tots.fil,'M²')}${mm('Dikiş İpi',P.gST,tots.sew,'MT')}${mm('Boğma İpi',P.gDS,tots.drw,'MT')}${mm('Cırt',P.gVL,tots.vlc,'MT')}${mm('Agraf',P.gSP,tots.ag,'SET')}${mm('Ç.Pul',P.gND,tots.pl,'AD')}<tr><td class="hd2 font-bold" colspan="5">TOPLAM</td><td class="c font-mono font-bold text-[var(--gn)] text-[1rem]">${ftl(tM)}</td></tr></tbody>`;
 
 document.getElementById('tMS').innerHTML=`<thead><tr><th>Döviz</th><th>Kur</th><th>Satış</th><th>Maliyet</th><th>Kâr</th></tr></thead><tbody><tr><td class="lb text-[var(--tx-main)] font-bold">TL</td><td class="c text-[var(--tx-mut)]">1</td><td class="g font-mono">${ftl(tS)}</td><td class="c font-mono text-[var(--tx-main)]">${ftl(tc)}</td><td class="font-mono ${pr>=0?'g':'r'} font-bold">${ftl(pr)}</td></tr><tr><td class="lb text-[var(--tx-main)] font-bold">USD</td><td class="c font-mono text-[var(--tx-mut)]">${fm(P.usd)}</td><td class="g font-mono">${fus(tS/P.usd)}</td><td class="c font-mono text-[var(--tx-main)]">${fus(tc/P.usd)}</td><td class="font-mono ${pr>=0?'g':'r'} font-bold">${fus(pr/P.usd)}</td></tr><tr><td class="lb text-[var(--tx-main)] font-bold">EUR</td><td class="c font-mono text-[var(--tx-mut)]">${fm(P.eur)}</td><td class="g font-mono">${feu(tS/P.eur)}</td><td class="c font-mono text-[var(--tx-main)]">${feu(tc/P.eur)}</td><td class="font-mono ${pr>=0?'g':'r'} font-bold">${feu(pr/P.eur)}</td></tr></tbody>`;
}

// ====== SIDEBAR & NAVIGATION ======
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    const ic = document.getElementById('collapseIcon');
    if(document.getElementById('sidebar').classList.contains('collapsed')) ic.setAttribute('data-lucide', 'chevron-right');
    else ic.setAttribute('data-lucide', 'chevron-left');
    lucide.createIcons();
}
function toggleSettings() { document.getElementById('settingsPanel').classList.toggle('open'); }
function go(id,el){
 document.querySelectorAll('.pane').forEach(p=>p.classList.remove('on'));
 document.querySelectorAll('.slink').forEach(s=>s.classList.remove('on'));
 document.getElementById('p-'+id).classList.add('on');
 el.classList.add('on');
 if(id==='pd') rColSettings();
 if(id==='pl') rPL();
 if(id==='ms') rMas();
 if(id==='ch') chOnOpen();
 lucide.createIcons();
}

function updDN(){const ty=document.getElementById('aType').value; const s=document.getElementById('aDN'); s.innerHTML='<option value="">DN</option>'; if(ty==='manual_pad'){s.innerHTML='<option value="0">Manuel</option>';return} DN_LIST.forEach(dn=>{s.innerHTML+=`<option value="${dn}">DN${dn}</option>`});}

function addItem(){
 const ty=document.getElementById('aType').value, dn=parseInt(document.getElementById('aDN').value), cl=parseInt(document.getElementById('aCls').value), qt=parseInt(document.getElementById('aQty').value);
 if(!ty||(isNaN(dn)&&ty!=='manual_pad')) return optAlert('Lütfen Tip ve DN seçin.');
 let df=P.gDF; if(ty==='elbow'){df=1.5; toast('Dirsek kuralı: Zorluk (df) 1.5 atandı','in')}
 const parts=(TP[ty]||['Tek Parça']).map((nm,i)=>({nm,ov:{},bw:P.lbw,bx:P.lbx,by:i===0?P.lby:P.lbyf,calc:{},matOv:{}}));
 IT.push({ref:RN++, ty, dn:dn||0, cl, qt:qt||1, df, parts, mh:'', calc:{}}); recalcAll(); toast(`${TN[ty]} eklendi`);
}
function optAlert(m){document.getElementById('optConfirmMsg').textContent=m;document.getElementById('optConfirmBg').classList.add('show');document.getElementById('optConfirmYes').onclick=()=>document.getElementById('optConfirmBg').classList.remove('show');}
function optConfirm(m,cb){document.getElementById('optConfirmMsg').textContent=m;document.getElementById('optConfirmBg').classList.add('show');document.getElementById('optConfirmYes').onclick=()=>{cb();document.getElementById('optConfirmBg').classList.remove('show')}}
function toast(m,t='ok'){const bx=document.getElementById('toastBox'), d=document.createElement('div'); d.className=`toast ${t}`; d.innerHTML=`<i data-lucide="${t==='ok'?'check-circle':t==='er'?'alert-octagon':'info'}"></i><span>${m}</span>`; bx.appendChild(d); lucide.createIcons(); setTimeout(()=>{d.style.opacity='0';d.style.transform='translateX(100%)';setTimeout(()=>d.remove(),300)},3000)}

function openQtyModal(ref){qtyRef=ref;const it=IT.find(i=>i.ref===ref);if(!it)return;document.getElementById('qmCur').textContent=it.qt;document.getElementById('qmVal').value=plQty[ref]||1;document.getElementById('qtyModal').classList.add('show')}
function submitQty(){if(qtyRef)plQty[qtyRef]=parseInt(document.getElementById('qmVal').value)||1;document.getElementById('qtyModal').classList.remove('show');rPL()}

function openMatModal(){document.getElementById('modalMat').classList.add('show');document.getElementById('nmName').value='';document.getElementById('nmSub').value='';document.getElementById('nmPrice').value='0';document.getElementById('nmThick').value='';}
function submitMat(){const n={t:document.getElementById('nmType').value,s:document.getElementById('nmSub').value,n:document.getElementById('nmName').value,u:document.getElementById('nmUnit').value,p:parseFloat(document.getElementById('nmPrice').value)||0,c:document.getElementById('nmCur').value,k:parseFloat(document.getElementById('nmThick').value)||null}; if(!n.n)return toast('Malzeme adı girin','er'); M.push(n);if(n.k)TK[n.n]=n.k;rMat();rGlobal();document.getElementById('modalMat').classList.remove('show');toast('Eklendi');}

function openPersModal(){document.getElementById('persModal').classList.add('show');document.getElementById('npAd').value='';lucide.createIcons()}
function submitPers(){
 const g=document.getElementById('npGorev').value; const a=document.getElementById('npAd').value; const net=parseFloat(document.getElementById('npNet').value)||0; const kidem=parseInt(document.getElementById('npKidem').value); const servis=parseFloat(document.getElementById('npServis').value)||0;
 if(!a){toast('Ad girin','er');return}
 PERS.push({g,a,net,kidem,servis}); document.getElementById('persModal').classList.remove('show'); rPers(); recalcAll(); toast(a+' eklendi');
}

// ====== PARAMETRE RENDER ======
function rPar(){
 const pDov = document.getElementById('pDov');
 if(pDov) {
     pDov.innerHTML=pi('USD/TL','usd',P.usd,'',2)+pi('EUR/TL','eur',P.eur,'',2)+'<hr class="border-[var(--brd)] my-2">'+
     `<div class="pr"><span class="l flex items-center gap-2">Saat Ücreti <i data-lucide="lock" class="w-3.5 h-3.5 text-[var(--tx-mut)]" title="Personel sekmesinden hesaplanır"></i></span><input type="number" value="${P.hc}" disabled title="Personel sekmesinden çekilir" class="opacity-50 cursor-not-allowed font-mono"><span class="u">₺</span></div>`+
     pi('Ödeme Vadesi','pd',P.pd,'g',0)+pi('Yıllık Faiz','ir',P.ir*100,'%',1)+pi('Damga V.','sr',P.sr*100,'%',3);
 }
 const pFir = document.getElementById('pFir');
 if(pFir) {
     pFir.innerHTML=pi('Kumaş Fire','fw',P.fw*100,'%',0)+pi('İzolasyon Fire','iw',P.iw*100,'%',0)+pi('Dikiş İpi Fire','sw',P.sw*100,'%',0)+'<hr class="border-[var(--brd)] my-2">'+pi('Bindirme SAĞ','fr',P.fr,'mm',0)+pi('Bindirme SOL','fl',P.fl,'mm',0)+pi('Dikiş Pay','sm',P.sm,'mm',0)+pi('Boğma Fazlalık','re',P.re,'mm',0);
 }
 const pLab = document.getElementById('pLab');
 if(pLab) {
     pLab.innerHTML=pi('Dikiş (sa/mt)','lbw',P.lbw,'',3)+pi('Metraj (sa/m²)','lbx',P.lbx,'',2)+pi('Parça Gövde','lby',P.lby,'',2)+pi('Parça Flanş','lbyf',P.lbyf,'',2);
 }
 rFT(); rLT('gate'); rAT();
}
function pi(lb,k,v,u='',d=2){return`<div class="pr"><span class="l">${lb}</span><input type="number" value="${v}" step="${d>0?Math.pow(10,-d):1}" data-k="${k}" class="font-mono" onchange="up(this)"><span class="u">${u}</span></div>`}
function up(el){const k=el.dataset.k; let v=parseFloat(el.value)||0; if(['oh','fw','iw','sw','ir','sr'].includes(k))v/=100; P[k]=v; recalcAll()}

function rFT(){const t=document.getElementById('tFl'); if(!t) return; let h='<thead><tr><th>DN</th>';CLS.forEach(c=>h+=`<th>${c}</th>`);h+='</tr></thead><tbody>';DN_LIST.forEach(dn=>{h+=`<tr><td class="lb text-[var(--ac)] font-bold">DN${dn}</td>`;CLS.forEach(cl=>{const v=(FD[dn]&&FD[dn][cl])||'';const dv=(typeof v==='number')?Number(v.toFixed(1)):'';h+=`<td><input type="number" value="${dv}" step=".1" onchange="if(!FD[${dn}])FD[${dn}]={};FD[${dn}][${cl}]=parseFloat(this.value)||null;recalcAll()" placeholder="—"></td>`});h+='</tr>'});t.innerHTML=h+'</tbody>'}
function rLT(ty){const t=document.getElementById('tLn'); if(!t) return; const d=BL[ty]||{}; let h='<thead><tr><th>DN</th>';CLS.forEach(c=>h+=`<th colspan="3">${c}</th>`);h+="</tr><tr><th></th>";CLS.forEach(()=>h+="<th class='text-[var(--am)]'>L1</th><th class='text-[var(--cy)]'>L1'</th><th class='text-[var(--gn)]'>L2</th>");h+='</tr></thead><tbody>';DN_LIST.forEach(dn=>{h+=`<tr><td class="lb text-[var(--ac)] font-bold">DN${dn}</td>`;CLS.forEach(cl=>{const e=(d[dn]&&d[dn][cl])||{};['L1','L1p','L2'].forEach(k=>{const val=e[k];const dv=(typeof val==='number')?Number(val.toFixed(1)):'';h+=`<td><input type="number" value="${dv}" step=".1" style="width:58px" onchange="if(!BL['${ty}'])BL['${ty}']={};if(!BL['${ty}'][${dn}])BL['${ty}'][${dn}]={};if(!BL['${ty}'][${dn}][${cl}])BL['${ty}'][${dn}][${cl}]={};BL['${ty}'][${dn}][${cl}]['${k}']=parseFloat(this.value)||null;recalcAll()" placeholder="—"></td>`})});h+='</tr>'});t.innerHTML=h+'</tbody>'}
function slt(ty){['gate','globe','butterfly'].forEach(t=>{const el=document.getElementById('bl-'+t); if(el) el.className=t===ty?'bt bt4 on':'bt bt4'});rLT(ty)}
function rAT(){const t=document.getElementById('tAg'); if(!t) return; const ks=Object.keys(AP).sort((a,b)=>parseFloat(a)-parseFloat(b));let h='<thead><tr><th>Çap"</th><th>Agraf</th><th>Pul</th></tr></thead><tbody>';ks.forEach(k=>{const d=AP[k];h+=`<tr><td class="lb text-[var(--ac)] font-bold">${k}"</td><td><input type="number" value="${Math.round(d.a||0)}" min="0" onchange="AP['${k}'].a=parseInt(this.value)||0;recalcAll()"></td><td><input type="number" value="${Math.round(d.p||0)}" min="0" onchange="AP['${k}'].p=parseInt(this.value)||0;recalcAll()"></td></tr>`});t.innerHTML=h+'</tbody>'}
function rVRef(){const sel=document.getElementById('vRefSel'); if(!sel) return; const vd=VALVE_DATA[sel.value];if(!vd)return;const dims=vd.dims;const dns=Object.keys(dims).map(Number).sort((a,b)=>a-b);let h='<thead><tr><th>DN</th><th>D (Flanş Çap)</th><th>L (Gövde Boy)</th><th>H (Yükseklik)</th><th>Dk (Kapak Çap)</th></tr></thead><tbody>';dns.forEach(dn=>{const d=dims[dn];h+=`<tr><td class="lb text-[var(--ac)] font-bold">DN${dn}</td><td class="c font-mono text-[var(--tx-main)]">${d.D}</td><td class="c font-mono text-[var(--cy)]">${d.L}</td><td class="c font-mono text-[var(--tx-mut)]">${d.H||'—'}</td><td class="c font-mono text-[var(--tx-mut)]">${d.Dk||'—'}</td></tr>`});document.getElementById('tVRef').innerHTML=h+'</tbody>'}

let mfl='all';
function rMat(){const b=document.getElementById('mBody'); if(!b) return; b.innerHTML='';M.forEach((m,i)=>{if(mfl!=='all'&&m.t!==mfl)return;const tr=document.createElement('tr');tr.innerHTML=`<td class="lb text-xs text-center">${i+1}</td><td><select onchange="M[${i}].t=this.value;rGlobal()">${['Kumaş','Dolgu','Yardımcı','Isıtıcı'].map(t=>`<option${m.t===t?' selected':''}>${t}</option>`).join('')}</select></td><td><input value="${m.s}" onchange="M[${i}].s=this.value"></td><td><input value="${m.n}" onchange="M[${i}].n=this.value;rGlobal()" style="font-weight:700" class="text-[var(--tx-main)]"></td><td><input value="${m.u}" onchange="M[${i}].u=this.value" style="width:50px;text-align:center"></td><td><input type="number" value="${m.p}" step=".001" class="font-mono" onchange="M[${i}].p=parseFloat(this.value)||0;rMat();recalcAll()"></td><td><select onchange="M[${i}].c=this.value;rMat();recalcAll()" style="width:60px">${['TL','USD','EUR'].map(c=>`<option${m.c===c?' selected':''}>${c}</option>`).join('')}</select></td><td class="c font-mono font-bold text-[var(--gn)]">${fm(mp(m))}</td><td><input type="number" value="${m.k||''}" onchange="M[${i}].k=parseFloat(this.value)||null;TK[M[${i}].n]=M[${i}].k;recalcAll()" style="width:50px;text-align:center" placeholder="—"></td><td style="text-align:center"><button onclick="M.splice(${i},1);rMat();rGlobal()" class="bt bt2 px-2 py-1"><i data-lucide="trash-2" class="w-3 h-3"></i></button></td>`;b.appendChild(tr)});document.getElementById('mfBtns').innerHTML=['all','Kumaş','Dolgu','Yardımcı','Isıtıcı'].map(t=>`<button class="${mfl===t?'on':''}" onclick="mfl='${t}';rMat()">${t==='all'?'Tümü':t}</button>`).join('');lucide.createIcons();}

// ====== PRINT PREVIEW ======
function previewPDF() {
    let pa = document.getElementById('printArea');
    let pfx = P.prefix ? P.prefix + ' ' : '';
    let html = `<div style="text-align:center; margin-bottom:30px; font-family:'Plus Jakarta Sans',sans-serif;">
     <h1 style="margin:0; color:#0f172a; font-size:24px; font-weight:900;">Optimizi.App</h1>
     <h2 style="margin:5px 0; color:#64748b; font-size:18px; font-weight:700;">Fiyat Teklif Formu</h2>
     <p style="margin:0; font-size:14px; color:#64748b; font-weight:600;">Tarih: ${new Date().toLocaleDateString()}</p>
     </div>`;
    html += `<table style="width:100%; border-collapse:collapse; text-align:left; font-family:'Plus Jakarta Sans',sans-serif; font-size:12px;">`;
    html += `<thead><tr><th style="border:1px solid #ddd; padding:10px; background:#f8fafc; text-align:center;">REF</th><th style="border:1px solid #ddd; padding:10px; background:#f8fafc;">Açıklama</th><th style="border:1px solid #ddd; padding:10px; background:#f8fafc; text-align:center;">Birim</th><th style="border:1px solid #ddd; padding:10px; background:#f8fafc; text-align:center;">Adet</th><th style="border:1px solid #ddd; padding:10px; background:#f8fafc; text-align:right;">Birim Fiyat</th><th style="border:1px solid #ddd; padding:10px; background:#f8fafc; text-align:right;">Toplam</th></tr></thead><tbody>`;
    
    let tot = 0;
    IT.forEach(it => {
        let q = plQty[it.ref]||1; let aq = it.qt*q; let uf = it.calc.us||0; let tf = uf*aq; tot+=tf;
        html += `<tr><td style="border:1px solid #ddd; padding:10px; text-align:center; font-weight:800; color:#4f46e5;">${it.ref}</td><td style="border:1px solid #ddd; padding:10px; font-weight:600;">${pfx}${TN[it.ty]||it.ty} DN${it.dn} Cl${it.cl} ${it.mh?'<br><span style="color:#64748b; font-size:11px;">('+it.mh+')</span>':''}</td><td style="border:1px solid #ddd; padding:10px; text-align:center; color:#64748b; font-weight:600;">AD</td><td style="border:1px solid #ddd; padding:10px; text-align:center; font-weight:800;">${aq}</td><td style="border:1px solid #ddd; padding:10px; text-align:right; font-weight:700;">${ftl(uf)}</td><td style="border:1px solid #ddd; padding:10px; text-align:right; font-weight:800; color:#059669;">${ftl(tf)}</td></tr>`;
    });
    html += `<tr><td colspan="5" style="border:1px solid #ddd; padding:12px; text-align:right; font-weight:800; font-size:14px; background:#f8fafc;">GENEL TOPLAM</td><td style="border:1px solid #ddd; padding:12px; font-weight:900; font-size:16px; text-align:right; color:#059669; background:#f8fafc;">${ftl(tot)}</td></tr>`;
    html += `</tbody></table>`;
    
    pa.innerHTML = html;
    document.getElementById('printModal').classList.add('show');
}

function saveData(){localStorage.setItem('optimizi_insjack_v6',JSON.stringify({P,M,IT,FD,BL,AP,TK,SVC,plQty,curShow,PERS,PP,RN,colVis}));toast('Sistem veritabanı yedeği alındı');}

// ====== INIT ======
window.onload=()=>{
 document.getElementById('themeBtn').innerHTML = `<i data-lucide="${currentTheme === 'dark' ? 'sun' : 'moon'}" class="w-4 h-4"></i>`;
 
 const D=EXCEL_DATA; P.usd=D.fx.USD; P.eur=D.fx.EUR;
 M=D.mat.map(m=>({...m})); M.forEach(m=>{if(m.k)TK[m.n]=m.k});
 FD={};for(const[dn,cls] of Object.entries(D.fd)){FD[parseInt(dn)]={};for(const[c,v] of Object.entries(cls))FD[parseInt(dn)][parseInt(c)]=v}
 
 // THE FATAL BUG FIX (#VALUE! CLEANSING)
 BL={};
 for(const[ty,tbl] of Object.entries(D.bl)){
   BL[ty]={};
   for(const[dn,cls] of Object.entries(tbl)){
     BL[ty][parseInt(dn)]={};
     for(const[c,v] of Object.entries(cls)){
       let obj = {};
       if(v && typeof v === 'object') {
           for(const [dim, val] of Object.entries(v)) {
               obj[dim] = (val === "#VALUE!" || isNaN(val)) ? null : parseFloat(val);
           }
       }
       BL[ty][parseInt(dn)][parseInt(c)] = obj;
     }
   }
 }
 AP=D.ap;
 
 try{const sv=JSON.parse(localStorage.getItem('optimizi_insjack_v6'));if(sv&&sv.IT){Object.assign(P,sv.P||{});M=sv.M||M;IT=sv.IT||[];FD=sv.FD||FD;BL=sv.BL||BL;AP=sv.AP||AP;TK=sv.TK||TK;SVC=sv.SVC||SVC;plQty=sv.plQty||{};curShow=sv.curShow||curShow;if(sv.PERS)PERS=sv.PERS;if(sv.PP)PP=sv.PP;RN=sv.RN||(Math.max(...IT.map(i=>i.ref),0)+1);if(sv.colVis)colVis=sv.colVis;}}catch(e){}
 
 try { initExtrapolation(); } catch(e) { console.error('Extrapolate Error', e) }
 try { rPers(); } catch(e) { console.error('Pers Error', e) }
 
 document.getElementById('setPrefix').value = P.prefix;
 const pi = document.getElementById('prefInput'); if(pi) pi.value = P.prefix;
 
 try { 
   rPar(); rMat(); rGlobal(); updDN(); recalcAll(); rVRef(); applyColVis(); rColSettings(); 
 } catch(e) { 
   console.error("Render Error:", e);
 }
 
 fetchKur(); 
 lucide.createIcons();
}
</script>
</body>
</html>
