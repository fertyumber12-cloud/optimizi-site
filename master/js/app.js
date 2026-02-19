// ================================================================
// CEKET FIYATLANDIRMA - APP.JS
// Optimizi.App | v3.1 Kesin Matematik Motoru
// ================================================================

// ============ GLOBAL DATA (JSON'dan yüklenir) ============
let VALVE_DATA = {};
let BRAND_INDEX = {};
let BRANDS = {};
let STANDARDS = {};
let MATERIALS_DB = [];

// ============ DATA LOADER ============
async function loadAllData() {
    const base = getBasePath();
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
        
        // Marka dosyalarını paralel yükle
        const brandPromises = Object.entries(BRAND_INDEX.brands || {}).map(async ([key, brand]) => {
            const res = await fetch(base + 'data/brands/' + brand.file);
            if (res.ok) BRANDS[key] = await res.json();
        });
        await Promise.all(brandPromises);
        
        applyDataCompat();
        console.log('✅ Veri yüklendi:', Object.keys(BRANDS).length, 'marka,', MATERIALS_DB.length, 'malzeme');
        return true;
    } catch(e) {
        console.error('❌ Veri yükleme hatası:', e);
        toast('Veri dosyaları yüklenemedi! Sayfa düzgün çalışmayabilir.', 'er');
        return false;
    }
}

// 🔥 404 HATASINI KÖKTEN ÇÖZEN GPS AYARI 🔥
function getBasePath() {
    return '/master/';
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
    BL = {};
    for (const [ty, tbl] of Object.entries(STANDARDS.body_lengths || {})) {
        BL[ty] = {};
        for (const [dn, cls] of Object.entries(tbl)) {
            BL[ty][parseInt(dn)] = {};
            for (const [c, v] of Object.entries(cls)) BL[ty][parseInt(dn)][parseInt(c)] = v;
        }
    }
    AP = STANDARDS.agraf_pul || {};
    if (STANDARDS.fx) {
        P.usd = STANDARDS.fx.USD || P.usd;
        P.eur = STANDARDS.fx.EUR || P.eur;
    }
    if (STANDARDS.hourly_cost) P.hc = STANDARDS.hourly_cost;
    
    VALVE_DATA = {};
    for (const [brandKey, brandData] of Object.entries(BRANDS)) {
        for (const [vKey, vData] of Object.entries(brandData.valves || {})) {
            const intDims = {};
            for (const [dk, dv] of Object.entries(vData.dims || {})) {
                intDims[dk] = dv;
            }
            VALVE_DATA[vKey] = { ...vData, dims: intDims, _brand: brandKey, _brandName: brandData.brand };
        }
    }
    
    DN_LIST.forEach(dn => {
        if (dn > 300) {
            const ratio = dn / 300;
            if (!FD[dn]) FD[dn] = {};
            CLS.forEach(cl => {
                if (!FD[dn][cl] && FD[300] && FD[300][cl]) FD[dn][cl] = Math.round(FD[300][cl] * ratio);
            });
            Object.keys(BL).forEach(ty => {
                if (!BL[ty][dn]) BL[ty][dn] = {};
                CLS.forEach(cl => {
                    if (!BL[ty][dn][cl] && BL[ty][300] && BL[ty][300][cl]) {
                        let obj = {};
                        ['L1', 'L1p', 'L2'].forEach(k => {
                            if (BL[ty][300][cl] && BL[ty][300][cl][k]) obj[k] = Math.round(BL[ty][300][cl][k] * ratio);
                        });
                        BL[ty][dn][cl] = obj;
                    }
                });
            });
        }
    });
}

// ============ THEME MANAGER ============
let currentTheme = localStorage.getItem('insjack_theme') || 'dark';
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    if (currentTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('insjack_theme', currentTheme);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerHTML = `<i data-lucide="${currentTheme === 'dark' ? 'sun' : 'moon'}" class="w-4 h-4"></i>`;
    lucide.createIcons();
}

// ============ CONSTANTS ============
const DN_LIST = [15,20,25,32,40,50,65,80,100,125,150,200,250,300,350,400,450,500,600,700,800,900,1000];
const DN_INCH  = {15:.5,20:.75,25:1,32:1.25,40:1.5,50:2,65:2.5,80:3,100:4,125:5,150:6,200:8,250:10,300:12,350:14,400:16,450:18,500:20,600:24,700:28,800:32,900:36,1000:40};
const CLS = [150,300,400];
const TN = {'PV-16':'Pistonlu Vana','GV-16K':'Glob Vana PN16','GV-25Z':'Glob Vana PN25','GV-40K':'Glob Vana PN40','MK-16':'Körüklü Vana PN16','MK-25':'Körüklü Vana PN25','MK-40':'Körüklü Vana PN40','GTK-18':'Sürgülü Vana','ARI-3YOL':'Üç Yollu Vana','PTY-30':'Pislik Tutucu','CLV-50':'Çekvalf','KV-2P':'İki Prç Küresel','KV-3P':'Üç Prç Küresel','KLB':'Kelebek Vana','BT-16':'Kondenstop','FLANS':'Flanş','pad':'Düz Yastık'};
const TT  = {piston:'globe', globe:'globe', bellow:'globe', gate:'gate', '3way':'globe', yfilter:'globe', check_clv:'globe', ball_2:'gate', ball_3:'gate', butterfly:'gate', trap:'globe', flange:'gate', elbow:'gate'};

// ============ GLOBAL STATE ============
let P = {usd:32.1, eur:35.2, hc:250, oh:.15, mul:2.5, pd:60, ir:.03, sr:.00948, fw:.10, iw:.10, sw:.30, fr:50, fl:50, sm:15, re:150, lbw:0.2, lbx:0.4, lby:0.5, lbyf:0.3, gFB:'1 Sİ - 0.5 mm - Gri', gFT:'1 Sİ - 0.5 mm - Gri', gFL:'TY-50mm', gST:'SS - 3', gDS:'CamElyf-4mm', gVL:'40 mm - Gri', gSP:'SS Z+A+P', gND:'SS Ç.Pul Set', gBK:'D-Toka', gLB:'30*60', gDF:1.2, prefix:'INSJACK'};
let M = [], FD = {}, BL = {}, AP = {}, TK = {}, IT = [], RN = 1, plQty = {}, curShow = {TL:true,USD:false,EUR:true};
let colVis = {kumas:true, dolgu:true, dikis:true, bogma:true, cirt:true, agraf:true, pul:true, S:true, T:true, I:true, N:true, mc:true, lc:true, lh:false};
let SVC = {cad:0, montajGun:0, montajGunMly:0, nakliye:0};
let PP  = {gun:22, servis:2750, yemek:220, kkd:31200, saat:9, fcRate:0.05, ekKat:0};
let PERS = []; let qtyRef = null;

// ============ HELPERS ============
const fm  = (v, d=2) => Number(v).toLocaleString('tr-TR', {minimumFractionDigits:d, maximumFractionDigits:d});
const ftl = v => '₺' + fm(v); const feu = v => '€' + fm(v); const fus = v => '$' + fm(v);
function mn2(n)    { return M.find(m => m.n === n); }
function mp(m)     { if (!m) return 0; return m.c === 'USD' ? m.p * P.usd : m.c === 'EUR' ? m.p * P.eur : m.p; }
function tk2(n)    { return TK[n] || 20; }
function gfd(dn,cl){ return (FD[dn] && FD[dn][cl]) || 0; }
function gap(inch) { return AP[String(inch)] || {a:0, p:0}; }
function curConv(tl, cur) { return cur === 'USD' ? tl / P.usd : cur === 'EUR' ? tl / P.eur : tl; }
function gbl(ty, dn, cl) {
    const t = TT[ty];
    if (!t || !BL[t] || !BL[t][dn]) return {L1:0, L1p:0, L2:0};
    if (BL[t][dn][cl]) return BL[t][dn][cl];
    const a = Object.keys(BL[t][dn]).map(Number).sort((x,y) => x-y);
    const c = a.reduce((p, c2) => Math.abs(c2-cl) < Math.abs(p-cl) ? c2 : p, a[0]);
    return BL[t][dn][c] || {L1:0, L1p:0, L2:0};
}

async function fetchRates() {
    try {
        const res = await fetch('https://api.genelpara.com/embed/doviz.json');
        const data = await res.json();
        if (data && data.EUR && data.USD) {
            P.eur = parseFloat(data.EUR.satis) || P.eur;
            P.usd = parseFloat(data.USD.satis) || P.usd;
            const badge = document.getElementById('apiStatusBadge');
            if (badge) badge.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> Güncel: ${P.usd}₺ / ${P.eur}₺`;
            lucide.createIcons(); recalcAll();
        }
    } catch(err) {
        const badge = document.getElementById('apiStatusBadge');
        if (badge) badge.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i> API Hatası (Varsayılan Kur)`;
    }
}

// ============ HESAPLAMA (EXCEL MANTIĞININ BİREBİR AYNISI) ============
function calcItem(it) {
    const _vd = VALVE_DATA[it.vref || it.ty];
    const _dd = _vd && _vd.dims && _vd.dims[it.dn] ? _vd.dims[it.dn] : null;
    const gFM = mn2(P.gFL);
    const I   = gFM ? tk2(gFM.n) : 20; // İzolasyon Kalınlığı (mm)
    const N   = _dd ? _dd.D : gfd(it.dn, it.cl); // Flanş Dış Çapı (mm)
    const lens = gbl(it.ty, it.dn, it.cl);
    const inch = DN_INCH[it.dn] || 0;
    const apv  = gap(inch);
    let tMC=0, tLC=0, tLH=0;

    it.parts.forEach((pt, pi) => {
        const mFB = mn2(pt.matOv.fb || P.gFB);
        const mFT = mn2(pt.matOv.ft || P.gFT);
        const mFL = mn2(pt.matOv.fl || P.gFL);
        const localI = mFL ? tk2(mFL.n) : I;
        const fbP = mp(mFB), ftP = mp(mFT), flP = mp(mFL);
        const stP = mp(mn2(P.gST)), dsP = mp(mn2(P.gDS)), vlP = mp(mn2(P.gVL));
        const spP = mp(mn2(P.gSP)), ndP = mp(mn2(P.gND));
        let S, T;

        const L = lens.L1 || 0;

        // 1. BOY VE ÇEVRE (Excel S ve T formülleri)
        if (pt.nm === 'Gövde' || pt.nm === 'Tek Parça') {
            const K = L + P.fr + P.fl; // Gerçek Boy (Vana Boyu + Sağ + Sol Flanş Payı)
            S = it.qt === 0 ? 0 : (((N + 2 * localI) * Math.PI) + P.sm); // Çevre = (Dış Çap + 2*İzolasyon) * PI + Dikiş Payı
            T = it.qt === 0 ? 0 : (K + localI + P.sm); // Boy
        } else if (pt.nm === 'Flanş') {
            const fL = lens.L1p || lens.L2 || L;
            const K = fL - N/2;
            S = it.qt === 0 ? 0 : (((N + 2 * localI) * Math.PI) + P.sm);
            T = it.qt === 0 ? 0 : (K + localI + P.sm);
        } else if (pt.nm === 'Kapak') {
            S = it.qt === 0 ? 0 : ((N + 2 * localI) + P.sm);
            T = S;
        } else if (pt.nm === 'Yastık') {
            S = it.padW || 0;
            T = it.padH || 0;
        } else {
            S = pt.ov.S || 0; 
            T = pt.ov.T || 0;
        }

        if (pt.ov.S != null) S = pt.ov.S;
        if (pt.ov.T != null) T = pt.ov.T;

        if (it.qt === 0 || !S || !T) {
            pt.calc = {S:0,T:0,I:localI,N,fab:0,fil:0,sew:0,drw:0,vlc:0,ag:0,pl:0,mc:0,lc:0,lh:0};
            return;
        }

        // 2. METRAJ VE FİRE HESAPLAMALARI (Excel Milyona Bölme Hilesi)
        let fab = pt.ov.fab != null ? pt.ov.fab : ((S * T * 2 * (1 + P.fw)) / 1000000); // Kumaş (m2) - 2 Kat
        let fil = pt.ov.fil != null ? pt.ov.fil : ((S * T * (1 + P.iw)) / 1000000);     // Dolgu (m2)
        let sew = pt.ov.sew != null ? pt.ov.sew : ((((T * 2) + S) * (1 + P.sw)) / 1000); // Dikiş İpi (m)
        let drw = pt.ov.drw != null ? pt.ov.drw : (((S + P.re) * 2) / 1000);            // Boğma İpi (m)
        let vlc = pt.ov.vlc != null ? pt.ov.vlc : (T / 1000);                           // Cırt Bant (m)
        let ag  = pt.ov.ag  != null ? pt.ov.ag  : apv.a;                                // Agraf Adet
        let pl  = pt.ov.pl  != null ? pt.ov.pl  : apv.p;                                // Pul Adet

        // 3. BİRİM MALZEME MALİYETİ
        let mc  = pt.ov.mc  != null ? pt.ov.mc  : ((fab/2*fbP) + (fab/2*ftP) + (fil*flP) + (sew*stP) + (drw*dsP) + (vlc*vlP) + (ag*spP) + (pl*ndP));
        
        // 4. İŞÇİLİK MALİYETİ
        const baseLabor = (pt.nm === 'Flanş' ? P.lbyf : P.lby);
        const lh = ((fab/2 * P.lbx) + baseLabor) * it.df;
        let lc = pt.ov.lc != null ? pt.ov.lc : (lh * P.hc);

        pt.calc = {S,T,I:localI,N,fab,fil,sew,drw,vlc,ag,pl,mc,lc,lh};
        tMC += mc; tLC += lc; tLH += lh;
    });

    it.calc = {
        tMC, tLC, tLH,
        uc: tMC + tLC,
        us: (tMC + tLC) * P.mul,
        tMA: tMC * it.qt,
        tLA: tLC * it.qt,
        tS:  (tMC + tLC) * P.mul * it.qt
    };
}

function recalcAll() {
    IT.forEach(calcItem); rProd();
    const ap2 = document.querySelector('.pane.on');
    if (ap2) { if (ap2.id === 'p-pl') rPL(); if (ap2.id === 'p-ms') rMas(); if (ap2.id === 'p-pr') rPar(); }
    const tI = IT.length; const tJ = IT.reduce((s,i) => s + i.qt, 0); const tH = IT.reduce((s,i) => s + ((i.calc.tLH||0) * i.qt), 0);
    document.getElementById('sI').textContent = tI; document.getElementById('sJ').textContent = tJ; document.getElementById('sH').textContent = fm(tH, 1);
}

// ============ UI FONKSİYONLARI ============
function applyColVis() {
    const map = {kumas:'col-kumas', dolgu:'col-dolgu', dikis:'col-dikis', bogma:'col-bogma', cirt:'col-cirt', agraf:'col-agraf', pul:'col-pul', S:'col-S', T:'col-T', I:'col-I', N:'col-N', mc:'col-mc', lc:'col-lc', lh:'col-lh'};
    for (const [k, cls] of Object.entries(map)) {
        document.querySelectorAll('.' + cls).forEach(el => { el.style.display = colVis[k] ? '' : 'none'; });
    }
}
function toggleCols() { applyColVis(); }

function rProd() {
    const b = document.getElementById('pdBody'); b.innerHTML = '';
    const cur = document.getElementById('pdCur').value;
    const fab = M.filter(m => m.t === 'Kumaş');
    const fil = M.filter(m => m.t === 'Dolgu');

    IT.forEach((it, ii) => {
        const ic = it.calc;
        it.parts.forEach((pt, pi) => {
            const pc = pt.calc || {}, f0 = pi===0, np = it.parts.length;
            const oc = k => pt.ov[k] != null ? ' o' : '';
            const matSel = (k, list) =>
                `<select style="font-size:.68rem;max-width:100px" onchange="IT[${ii}].parts[${pi}].matOv.${k}=this.value||null;recalcAll()">
                    <option value="">Global</option>
                    ${list.map(m=>`<option value="${m.n}"${(pt.matOv[k]||'')==m.n?' selected':''}>${m.n}</option>`).join('')}
                </select>`;
            const tr = document.createElement('tr');
            let h = '';
            if (f0) {
                h += `<td class="lb text-indigo-400 font-bold" rowspan="${np}">${P.prefix?P.prefix+'-':''}${it.ref}</td>`;
                h += `<td class="lb" rowspan="${np}">${TN[it.ty]||it.ty}</td>`;
            }
            h += `<td class="text-xs font-semibold px-2">${pt.nm}</td>`;
            if (f0) {
                h += `<td style="text-align:center;font-weight:700" rowspan="${np}">${it.ty==='pad'?'—':'DN'+it.dn}</td>`;
                h += `<td style="text-align:center" rowspan="${np}">${it.cl}</td>`;
                h += `<td rowspan="${np}"><input type="number" value="${it.qt}" min="0" style="width:48px;text-align:center;font-weight:700" onchange="IT[${ii}].qt=parseInt(this.value)||0;recalcAll()"></td>`;
                h += `<td rowspan="${np}"><input type="number" value="${it.df}" min=".5" max="5" step=".1" style="width:48px;text-align:center" class="text-indigo-400 font-bold bg-indigo-500/10 rounded" onchange="IT[${ii}].df=parseFloat(this.value)||1;recalcAll()"></td>`;
            }
            h += `<td>${matSel('fb',fab)}</td><td>${matSel('ft',fab)}</td><td>${matSel('fl',fil)}</td>`;
            h += `<td class="col-I c text-amber-400" style="text-align:center">${pc.I||'—'}</td>`;
            h += `<td class="col-N c">${pc.N?fm(pc.N,0):'—'}</td>`;
            h += `<td class="col-S c text-cyan-400${oc('S')}" ondblclick="ovr(${ii},${pi},'S',this)">${pc.S?fm(pc.S,1):'—'}</td>`;
            h += `<td class="col-T c text-cyan-400${oc('T')}" ondblclick="ovr(${ii},${pi},'T',this)">${pc.T?fm(pc.T,1):'—'}</td>`;
            h += `<td class="col-kumas c${oc('fab')}" ondblclick="ovr(${ii},${pi},'fab',this)">${pc.fab?fm(pc.fab,2):'—'}</td>`;
            h += `<td class="col-dolgu c${oc('fil')}" ondblclick="ovr(${ii},${pi},'fil',this)">${pc.fil?fm(pc.fil,2):'—'}</td>`;
            h += `<td class="col-dikis c${oc('sew')}" ondblclick="ovr(${ii},${pi},'sew',this)">${pc.sew?fm(pc.sew,1):'—'}</td>`;
            h += `<td class="col-bogma c${oc('drw')}" ondblclick="ovr(${ii},${pi},'drw',this)">${pc.drw?fm(pc.drw,1):'—'}</td>`;
            h += `<td class="col-cirt c${oc('vlc')}" ondblclick="ovr(${ii},${pi},'vlc',this)">${pc.vlc?fm(pc.vlc,1):'—'}</td>`;
            h += `<td class="col-agraf c${oc('ag')}" ondblclick="ovr(${ii},${pi},'ag',this)">${pc.ag||0}</td>`;
            h += `<td class="col-pul c${oc('pl')}" ondblclick="ovr(${ii},${pi},'pl',this)">${pc.pl||0}</td>`;
            h += `<td class="col-mc c font-mono${oc('mc')}" ondblclick="ovr(${ii},${pi},'mc',this)">${fm(curConv(pc.mc||0,cur))}</td>`;
            h += `<td class="col-lc c font-mono${oc('lc')}" ondblclick="ovr(${ii},${pi},'lc',this)">${fm(curConv(pc.lc||0,cur))}</td>`;
            h += `<td class="col-lh c font-mono${oc('lh')}">${fm(pc.lh||0,2)}</td>`;
            if (f0) {
                h += `<td class="c font-mono font-black" rowspan="${np}">${fm(curConv(ic.uc||0,cur))}</td>`;
                h += `<td class="c font-mono text-indigo-400" rowspan="${np}">${fm(curConv(ic.us||0,cur))}</td>`;
                h += `<td class="c font-mono text-emerald-400 font-black text-[1rem]" rowspan="${np}">${fm(curConv(ic.tS||0,cur))}</td>`;
                h += `<td style="text-align:center" rowspan="${np}"><button onclick="optConfirm('Sil?',()=>{IT.splice(${ii},1);recalcAll()})" class="bt bt2 px-2 py-1"><i data-lucide="x" class="w-3 h-3"></i></button></td>`;
            }
            tr.innerHTML = h; b.appendChild(tr);
        });
    });

    const tS = IT.reduce((s,i) => s+(i.calc.tS||0), 0);
    document.getElementById('pdFoot').innerHTML = IT.length
        ? `<tr><td colspan="22" class="lb" style="text-align:right;font-weight:900">TOPLAM SATIŞ BEDELİ: </td><td class="c font-mono text-emerald-400 font-black text-[1.1rem]" colspan="3">${cur} ${fm(curConv(tS,cur))}</td></tr>`
        : '';
    applyColVis(); lucide.createIcons();
}

function ovr(ii, pi, k, td) {
    const pt = IT[ii].parts[pi], cv = pt.calc[k] || 0;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.value = cv; inp.step = 'any';
    inp.style.cssText = 'width:100%;height:100%;background:rgba(245,158,11,.2);color:#f59e0b;font-weight:800;border:2px solid #f59e0b;font-size:.76rem;padding:2px 4px;text-align:right;font-family:inherit;border-radius:4px;outline:none;';
    td.textContent = ''; td.appendChild(inp); inp.focus(); inp.select();
    function ok() {
        const nv = parseFloat(inp.value);
        if (!isNaN(nv) && nv !== cv) { pt.ov[k] = nv; toast(k + ' güncellendi', 'in'); }
        recalcAll();
    }
    inp.onblur = ok;
    inp.onkeydown = e => { if (e.key==='Enter') ok(); if (e.key==='Escape') { delete pt.ov[k]; recalcAll(); } };
}

function rGlobal() {
    const fab = M.filter(m => m.t === 'Kumaş');
    const fil = M.filter(m => m.t === 'Dolgu');
    const hlp = M.filter(m => m.t === 'Yardımcı');
    const gs = (lb, k, list, cur) =>
        `<div class="mb-3"><label class="text-[10px] font-bold text-slate-500 uppercase">${lb}</label>
        <select class="ps mt-1" data-k="${k}" onchange="P[this.dataset.k]=this.value;recalcAll()">
            ${list.map(m=>`<option value="${m.n}"${m.n===cur?' selected':''}>${m.n}</option>`).join('')}
        </select></div>`;
    const el = document.getElementById('plGlobal');
    if (!el) return;
    el.innerHTML =
        `<div class="grid grid-cols-2 md:grid-cols-4 gap-4">` +
        gs('Alt Kumaş','gFB',fab,P.gFB) + gs('Üst Kumaş','gFT',fab,P.gFT) +
        gs('Dolgu Malzemesi','gFL',fil,P.gFL) +
        gs('Dikiş İpi','gST',hlp.filter(m=>m.s==='Dikiş İpi'),P.gST) +
        `</div><div class="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">` +
        gs('Boğma İpi','gDS',hlp.filter(m=>m.s==='Boğma İpi'),P.gDS) +
        gs('Cırt Bant','gVL',hlp.filter(m=>m.s==='Cırtbant'),P.gVL) +
        gs('Agraf','gSP',hlp.filter(m=>m.s==='Zımba Set'),P.gSP) +
        gs('Ç.Pul','gND',hlp.filter(m=>m.s==='Ç.Pul Set'),P.gND) +
        gs('Etiket','gLB',hlp.filter(m=>m.s==='Etiket'),P.gLB) +
        `</div>`;
}

function rMas() {
    const tM   = IT.reduce((s,i) => s+(i.calc.tMA||0), 0);
    const tL   = IT.reduce((s,i) => s+(i.calc.tLA||0), 0);
    const tLH  = IT.reduce((s,i) => s+((i.calc.tLH||0)*i.qt), 0);
    const tS0  = IT.reduce((s,i) => s+(i.calc.tS||0), 0);
    const tJ   = IT.reduce((s,i) => s+i.qt, 0);
    const svcMontaj = SVC.montajGun * SVC.montajGunMly;
    const svcTotal  = SVC.cad + svcMontaj + SVC.nakliye + (SVC.erisim||0);
    const tS  = tS0 + svcTotal;
    const dir = tM + tL, ind = dir*P.oh, raw = dir+ind;
    const stmp = raw*P.sr, fin = raw*(P.pd/365)*P.ir;
    const tc  = raw + stmp + fin + svcTotal;
    const pr  = tS - tc, mg = tS > 0 ? (pr/tS*100) : 0;

    document.getElementById('kC').textContent = ftl(tc);
    document.getElementById('kS').textContent = ftl(tS);
    document.getElementById('kP').textContent = ftl(pr);
    document.getElementById('kP').style.color = pr >= 0 ? '#10b981' : '#f43f5e';
    document.getElementById('kM').textContent = '%' + fm(mg,1);
    document.getElementById('msMul').value = P.mul;
    document.getElementById('msOh').value  = P.oh * 100;

    document.getElementById('msServices').innerHTML =
        `<div class="pr"><span class="l">CAD/CAM Hizmet</span><input type="number" value="${SVC.cad}" step="100" onchange="SVC.cad=parseFloat(this.value)||0;rMas()"><span class="u">₺</span></div>` +
        `<div class="pr"><span class="l">Montaj (adam gün)</span><input type="number" value="${SVC.montajGun}" step="1" onchange="SVC.montajGun=parseFloat(this.value)||0;rMas()"><span class="u">g</span></div>` +
        `<div class="pr"><span class="l">Gün maliyeti</span><input type="number" value="${SVC.montajGunMly}" step="100" onchange="SVC.montajGunMly=parseFloat(this.value)||0;rMas()"><span class="u">₺</span></div>` +
        `<div class="pr"><span class="l">Nakliye</span><input type="number" value="${SVC.nakliye}" step="100" onchange="SVC.nakliye=parseFloat(this.value)||0;rMas()"><span class="u">₺</span></div>`;
    document.getElementById('msSvcTotal').textContent = ftl(svcTotal);

    const mr = (l,d,v) => `<tr><td class="lb text-left">${l}</td><td style="text-align:center;font-size:.68rem;opacity:.7">${d}</td><td class="c font-mono">${v}</td></tr>`;
    document.getElementById('tMC').innerHTML =
        `<tr><td colspan="3" class="lb font-bold text-xs uppercase opacity-60">DOĞRUDAN</td></tr>` +
        mr('Malzeme','',ftl(tM)) + mr('İşçilik (Oto)',fm(P.hc)+' ₺/sa',ftl(tL)) +
        `<tr><td colspan="2" class="lb font-bold">DİREKT (NET)</td><td class="c font-bold font-mono text-cyan-400">${ftl(dir)}</td></tr>` +
        `<tr><td colspan="3" class="lb font-bold text-xs uppercase opacity-60">DOLAYLI</td></tr>` +
        mr('Overhead',fm(P.oh*100,0)+'%',ftl(ind)) +
        `<tr><td colspan="2" class="lb font-bold">HAM MALİYET</td><td class="c font-bold font-mono text-amber-400">${ftl(raw)}</td></tr>` +
        mr('Damga V.',fm(P.sr*100,3)+'%',ftl(stmp)) + mr('Finansal',P.pd+'g',ftl(fin)) +
        mr('Hizmet Bedeli','',ftl(svcTotal)) +
        `<tr><td colspan="2" class="lb font-bold">TOPLAM MALİYET</td><td class="c font-bold font-mono text-emerald-400 text-[1rem]">${ftl(tc)}</td></tr>`;

    let tots = {fab:0,fil:0,sew:0,drw:0,vlc:0,ag:0,pl:0};
    IT.forEach(it => it.parts.forEach(pt => {
        const pc = pt.calc || {};
        tots.fab += (pc.fab||0)*it.qt; tots.fil += (pc.fil||0)*it.qt;
        tots.sew += (pc.sew||0)*it.qt; tots.drw += (pc.drw||0)*it.qt;
        tots.vlc += (pc.vlc||0)*it.qt; tots.ag  += (pc.ag||0)*it.qt; tots.pl += (pc.pl||0)*it.qt;
    }));
    const mm = (l,q,u) => `<tr><td class="lb">${l}</td><td class="c font-mono text-cyan-400">${fm(q,2)} ${u}</td></tr>`;
    document.getElementById('tMM').innerHTML =
        `<thead><tr><th>Kategori</th><th class="text-right">Toplam İhtiyaç</th></tr></thead><tbody>` +
        mm('Kumaş Toplam',tots.fab/2,'M²') + mm('Dolgu Toplam',tots.fil,'M²') +
        mm('Dikiş İpi',tots.sew,'MT') + mm('Boğma İpi',tots.drw,'MT') +
        mm('Cırt Bant',tots.vlc,'MT') + mm('Agraf Seti',tots.ag,'SET') +
        mm('Çelik Pul',tots.pl,'AD') +
        `<tr><td class="lb font-bold">Toplam Net:</td><td class="c font-mono font-bold text-emerald-400">${ftl(tM)}</td></tr></tbody>`;

    document.getElementById('tMS').innerHTML =
        `<thead><tr><th>Döviz</th><th>Kur</th><th>Satış</th><th>Maliyet</th><th>Kâr</th></tr></thead><tbody>` +
        `<tr><td class="lb">TL</td><td class="c">1</td><td class="c font-mono text-emerald-400">${ftl(tS)}</td><td class="c font-mono">${ftl(tc)}</td><td class="c font-mono ${pr>=0?'text-emerald-400':'text-red-400'}">${ftl(pr)}</td></tr>` +
        `<tr><td class="lb">USD</td><td class="c font-mono">${fm(P.usd)}</td><td class="c font-mono text-emerald-400">${fus(tS/P.usd)}</td><td class="c font-mono">${fus(tc/P.usd)}</td><td class="c font-mono ${pr>=0?'text-emerald-400':'text-red-400'}">${fus(pr/P.usd)}</td></tr>` +
        `<tr><td class="lb">EUR</td><td class="c font-mono">${fm(P.eur)}</td><td class="c font-mono text-emerald-400">${feu(tS/P.eur)}</td><td class="c font-mono">${feu(tc/P.eur)}</td><td class="c font-mono ${pr>=0?'text-emerald-400':'text-red-400'}">${feu(pr/P.eur)}</td></tr>` +
        `</tbody>`;

    document.getElementById('msAH').textContent = fm(tLH,1);
    document.getElementById('msAD').textContent = fm(tLH/9,1);
    document.getElementById('msJC').textContent = tJ;
}

function rPar() {
    document.getElementById('pDov').innerHTML =
        pi('USD/TL','usd',P.usd,'',2) + pi('EUR/TL','eur',P.eur,'',2) + '<hr class="my-2 opacity-20">' +
        `<div class="pr"><span class="l flex items-center gap-2">Saat Ücreti</span><input type="number" value="${fm(P.hc,0)}" disabled class="opacity-50 font-mono"><span class="u">₺</span></div>` +
        pi('Ödeme Vadesi','pd',P.pd,'g',0) + pi('Yıllık Faiz','ir',P.ir*100,'%',1) + pi('Damga V.','sr',P.sr*100,'%',3);
    document.getElementById('pFir').innerHTML =
        pi('Kumaş Fire','fw',P.fw*100,'%',0) + pi('İzolasyon Fire','iw',P.iw*100,'%',0) + pi('Dikiş İpi Fire','sw',P.sw*100,'%',0) + '<hr class="my-2 opacity-20">' +
        pi('Bindirme SAĞ','fr',P.fr,'mm',0) + pi('Bindirme SOL','fl',P.fl,'mm',0) + pi('Dikiş Payı','sm',P.sm,'mm',0) + pi('Boğma Fazlalık','re',P.re,'mm',0);
    document.getElementById('pLab').innerHTML =
        pi('Dikiş (sa/mt)','lbw',P.lbw,'',3) + pi('Metraj (sa/m²)','lbx',P.lbx,'',2) + pi('Parça Gövde','lby',P.lby,'',2) + pi('Parça Flanş','lbyf',P.lbyf,'',2);
    rFT(); rLT('gate'); rAT();
}

function pi(lb, k, v, u='', d=2) { return `<div class="pr"><span class="l">${lb}</span><input type="number" value="${v}" step="${d>0?Math.pow(10,-d):1}" data-k="${k}" class="font-mono" onchange="up(this)"><span class="u">${u}</span></div>`; }
function up(el) { const k = el.dataset.k; let v = parseFloat(el.value) || 0; if (['oh','fw','iw','sw','ir','sr'].includes(k)) v /= 100; P[k] = v; recalcAll(); }

function rFT() {
    const t = document.getElementById('tFl'); if (!t) return;
    let h = '<thead><tr><th>DN</th>'; CLS.forEach(c => h += `<th>${c}</th>`); h += '</tr></thead><tbody>';
    DN_LIST.forEach(dn => {
        h += `<tr><td class="lb text-indigo-400 font-bold">DN${dn}</td>`;
        CLS.forEach(cl => { const v = (FD[dn]&&FD[dn][cl])||''; h += `<td class="c font-mono text-cyan-400">${v||'—'}</td>`; });
        h += '</tr>';
    });
    t.innerHTML = h + '</tbody>';
}

function rLT(ty) {
    const t = document.getElementById('tLn'), d = BL[ty]||{};
    let h = '<thead><tr><th>DN</th>'; CLS.forEach(c => h += `<th colspan="3">${c}</th>`);
    h += "</tr><tr><th></th>"; CLS.forEach(() => h += "<th class='text-amber-400'>L1</th><th class='text-cyan-400'>L1'</th><th class='text-emerald-400'>L2</th>");
    h += '</tr></thead><tbody>';
    DN_LIST.forEach(dn => {
        h += `<tr><td class="lb text-indigo-400 font-bold">DN${dn}</td>`;
        CLS.forEach(cl => { const e = (d[dn]&&d[dn][cl])||{}; ['L1','L1p','L2'].forEach(k => { h += `<td class="c font-mono">${e[k]||'—'}</td>`; }); });
        h += '</tr>';
    });
    t.innerHTML = h + '</tbody>';
}

function slt(ty) { ['gate','globe'].forEach(t => { const b = document.getElementById('bl-'+t); if (b) b.className = t===ty ? 'bt bt4 on' : 'bt bt4'; }); rLT(ty); }

function rAT() {
    const t = document.getElementById('tAg'); if (!t) return;
    const ks = Object.keys(AP).sort((a,b) => parseFloat(a)-parseFloat(b));
    let h = '<thead><tr><th>Çap"</th><th>Agraf</th><th>Pul</th></tr></thead><tbody>';
    ks.forEach(k => { const d = AP[k]; h += `<tr><td class="lb text-indigo-400 font-bold">${k}"</td><td class="c">${d.a}</td><td class="c">${d.p}</td></tr>`; });
    t.innerHTML = h + '</tbody>';
}

function rVRef() {
    const sel = document.getElementById('vRefSel'); if (!sel) return;
    const vd = VALVE_DATA[sel.value]; if (!vd) return;
    const dims = vd.dims; const dns = Object.keys(dims).map(Number).sort((a,b)=>a-b);
    let h = '<thead><tr><th>DN</th><th>D (Flanş Çap)</th><th>L (Gövde Boy)</th><th>H (Yükseklik)</th><th>Dk (Kapak Çap)</th></tr></thead><tbody>';
    dns.forEach(dn => {
        const d = dims[dn];
        h += `<tr><td class="lb text-indigo-400 font-bold">DN${dn}</td><td class="c font-mono">${d.D}</td><td class="c font-mono text-cyan-400">${d.L}</td><td class="c font-mono opacity-70">${d.H||'—'}</td><td class="c font-mono opacity-70">${d.Dk||'—'}</td></tr>`;
    });
    document.getElementById('tVRef').innerHTML = h + '</tbody>';
}

let mfl = 'all';
function rMat() {
    const b = document.getElementById('mBody'); b.innerHTML = '';
    M.forEach((m, i) => {
        if (mfl !== 'all' && m.t !== mfl) return;
        const tr = document.createElement('tr');
        tr.innerHTML =
            `<td class="lb text-xs text-center">${i+1}</td>` +
            `<td><select onchange="M[${i}].t=this.value;rGlobal()">${['Kumaş','Dolgu','Yardımcı','Isıtıcı'].map(t=>`<option${m.t===t?' selected':''}>${t}</option>`).join('')}</select></td>` +
            `<td><input value="${m.s||''}" onchange="M[${i}].s=this.value"></td>` +
            `<td><input value="${m.n||''}" onchange="M[${i}].n=this.value;rGlobal()" style="font-weight:700"></td>` +
            `<td><input value="${m.u||''}" onchange="M[${i}].u=this.value" style="width:50px;text-align:center"></td>` +
            `<td><input type="number" value="${m.p||0}" step=".001" class="font-mono" onchange="M[${i}].p=parseFloat(this.value)||0;rMat();recalcAll()"></td>` +
            `<td><select onchange="M[${i}].c=this.value;rMat();recalcAll()" style="width:60px">${['TL','USD','EUR'].map(c=>`<option${m.c===c?' selected':''}>${c}</option>`).join('')}</select></td>` +
            `<td class="c font-mono font-bold text-emerald-400">${fm(mp(m))}</td>` +
            `<td><input type="number" value="${m.k||''}" onchange="M[${i}].k=parseFloat(this.value)||null;TK[M[${i}].n]=M[${i}].k;recalcAll()" style="width:70px;text-align:center" placeholder="—"></td>` +
            `<td style="text-align:center"><button onclick="M.splice(${i},1);rMat();rGlobal()" class="bt bt2 px-2 py-1"><i data-lucide="trash-2" class="w-3 h-3"></i></button></td>`;
        b.appendChild(tr);
    });
    const mfBtns = document.getElementById('mfBtns');
    if (mfBtns) mfBtns.innerHTML = ['all','Kumaş','Dolgu','Yardımcı','Isıtıcı'].map(t => `<button class="${mfl===t?'on':''}" onclick="mfl='${t}';rMat()">${t==='all'?'Tümü':t}</button>`).join('');
    lucide.createIcons();
}

function openMatModal()  { document.getElementById('modalMat').classList.add('show'); }
function submitMat() {
    const t = document.getElementById('nmType').value, s = document.getElementById('nmSub').value;
    const n = document.getElementById('nmName').value, u = document.getElementById('nmUnit').value;
    const p = parseFloat(document.getElementById('nmPrice').value)||0, c = document.getElementById('nmCur').value;
    const k = parseFloat(document.getElementById('nmThick').value) || null;
    if (!n) { toast('Lütfen malzeme cinsi girin.', 'er'); return; }
    M.push({t,s,n,u,p,c,k}); if (k) TK[n] = k;
    rMat(); rGlobal(); recalcAll(); document.getElementById('modalMat').classList.remove('show'); toast('Yeni malzeme eklendi', 'in');
}

function rPL() {
    const ct = document.getElementById('curToggle');
    if (ct) ct.innerHTML = ['TL','USD','EUR'].map(c => `<button class="${curShow[c]?'on':''}" onclick="curShow['${c}']=!curShow['${c}'];rPL()">${c}</button>`).join('');
    const hd = document.getElementById('plHead');
    let hh = '<tr><th class="resizable-th">REF KODU</th><th class="resizable-th">DN</th><th class="resizable-th" style="min-width:150px">Mahal/Not</th><th class="resizable-th" style="min-width:250px">Ekipman Tanımı</th><th class="resizable-th">Adet</th>';
    if (curShow.TL)  hh += '<th class="resizable-th" style="background:rgba(99,102,241,.1)">Birim TL</th><th class="resizable-th" style="background:rgba(99,102,241,.13)">Toplam TL</th>';
    if (curShow.USD) hh += '<th class="resizable-th" style="background:rgba(16,185,129,.1)">Birim USD</th><th class="resizable-th" style="background:rgba(16,185,129,.15)">Toplam USD</th>';
    if (curShow.EUR) hh += '<th class="resizable-th" style="background:rgba(6,182,212,.1)">Birim EUR</th><th class="resizable-th" style="background:rgba(6,182,212,.15)">Toplam EUR</th>';
    hh += '</tr>'; hd.innerHTML = hh;

    const b = document.getElementById('plBody'); b.innerHTML = ''; let totTL = 0;
    IT.forEach(it => {
        const ic = it.calc, q = plQty[it.ref]||1, aq = it.qt*q; const uTL = ic.us||0, tTL = uTL*aq; totTL += tTL;
        const pref = P.prefix ? `${P.prefix}-` : ''; const tr = document.createElement('tr');
        let h = `<td class="lb font-bold text-indigo-400 text-center">${pref}${it.ref}</td><td class="text-center font-bold">${it.ty==='pad'?'—':'DN'+it.dn}</td>`;
        h += `<td><input value="${it.mh||''}" onchange="IT.find(x=>x.ref===${it.ref}).mh=this.value" placeholder="Mahal..."></td>`;
        h += `<td class="lb text-left">${it.label||(it.ty==='pad'?'Düz Yastık':(TN[it.ty]||it.ty)+' Ceketi - DN'+it.dn+' PN'+it.cl)}</td>`;
        h += `<td class="o text-center font-bold" ondblclick="openQtyModal(${it.ref})" title="Değiştirmek için çift tıkla">${aq}</td>`;
        if (curShow.TL)  h += `<td class="c font-mono">${fm(uTL)}</td><td class="c font-mono font-bold text-indigo-400">${fm(tTL)}</td>`;
        if (curShow.USD) h += `<td class="c font-mono">${fm(uTL/P.usd)}</td><td class="c font-mono font-bold text-emerald-400">${fm(tTL/P.usd)}</td>`;
        if (curShow.EUR) h += `<td class="c font-mono">${fm(uTL/P.eur)}</td><td class="c font-mono font-bold text-cyan-400">${fm(tTL/P.eur)}</td>`;
        tr.innerHTML = h; b.appendChild(tr);
    });

    const ft = document.getElementById('plFoot');
    let fh = '<td colspan="5" class="lb text-right font-extrabold text-[1rem]">GENEL TOPLAM</td>';
    if (curShow.TL)  fh += `<td class="c"></td><td class="c font-mono font-black text-[1.1rem] text-indigo-400">${ftl(totTL)}</td>`;
    if (curShow.USD) fh += `<td class="c"></td><td class="c font-mono font-black text-[1.1rem] text-emerald-400">${fus(totTL/P.usd)}</td>`;
    if (curShow.EUR) fh += `<td class="c"></td><td class="c font-mono font-black text-[1.1rem] text-cyan-400">${feu(totTL/P.eur)}</td>`;
    ft.innerHTML = fh;
}

function go(id, el) {
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
    document.querySelectorAll('.sidebar-link').forEach(s => { s.classList.remove('text-indigo-600','bg-indigo-50','dark:bg-indigo-500/10','dark:text-indigo-400'); s.classList.add('text-slate-600','dark:text-slate-400'); });
    const pane = document.getElementById('p-'+id); if (pane) pane.classList.add('on');
    if (el) { el.classList.remove('text-slate-600','dark:text-slate-400'); el.classList.add('text-indigo-600','bg-indigo-50','dark:bg-indigo-500/10','dark:text-indigo-400'); }
    if (id==='pl') rPL(); if (id==='pd') { rGlobal(); rProd(); } if (id==='ms') rMas();
    if (id==='pm') rPers(); if (id==='mf') rMat(); if (id==='pr') { rPar(); rVRef(); }
    lucide.createIcons();
}

function toggleSidebar() {
    const n = document.getElementById('mainSidebar'); const closed = n.style.width === '72px';
    if (closed) { n.style.width = '256px'; n.style.minWidth = '256px'; n.querySelectorAll('.sidebar-text,.sidebar-title').forEach(e => e.style.display = ''); const lt = n.querySelector('.logo-text'); if (lt) lt.style.display = ''; } 
    else { n.style.width = '72px'; n.style.minWidth = '72px'; n.querySelectorAll('.sidebar-text,.sidebar-title').forEach(e => e.style.display = 'none'); const lt = n.querySelector('.logo-text'); if (lt) lt.style.display = 'none'; }
}
function openRight() { document.getElementById('rightSidebar').style.transform = 'translateX(0)'; const o = document.getElementById('rsOverlay'); o.classList.remove('hidden'); o.style.opacity = '0'; setTimeout(() => { o.style.opacity = '1'; }, 10); lucide.createIcons(); }
function closeRight() { document.getElementById('rightSidebar').style.transform = 'translateX(100%)'; const o = document.getElementById('rsOverlay'); o.style.opacity = '0'; setTimeout(() => o.classList.add('hidden'), 300); }
function openPopup(id)  { document.getElementById(id).classList.add('show'); lucide.createIcons(); }
function closePopup(id) { document.getElementById(id).classList.remove('show'); }

function openColVisModal() { Object.keys(colVis).forEach(k => { const c = document.getElementById('chk_'+k); if (c) c.checked = colVis[k]; }); openPopup('colVisModal'); }
function saveCols() { Object.keys(colVis).forEach(k => { const c = document.getElementById('chk_'+k); if (c) colVis[k] = c.checked; }); applyColVis(); closePopup('colVisModal'); toast('Sütun ayarları kaydedildi'); }

function openQtyModal(ref) { qtyRef = ref; const it = IT.find(i => i.ref === ref); if (!it) return; document.getElementById('qmCur').textContent = it.qt; document.getElementById('qmVal').value = plQty[ref] || 1; document.getElementById('qtyModal').classList.add('show'); }
function submitQty() { if (qtyRef) plQty[qtyRef] = parseInt(document.getElementById('qmVal').value) || 1; document.getElementById('qtyModal').classList.remove('show'); rPL(); }

function openPdfModal() {
    document.getElementById('pdfPrefixTitle').textContent = `Proje: ${P.prefix||'Genel'} İzolasyon Ceketleri`;
    const tbody = document.getElementById('pdfTableBody'); const tfoot = document.getElementById('pdfTableFoot');
    tbody.innerHTML = ''; let total = 0;
    if (IT.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Listede ürün bulunmamaktadır.</td></tr>'; } 
    else {
        IT.forEach(it => {
            const aq = it.qt * (plQty[it.ref]||1); const uPrice = it.calc.us||0, tPrice = uPrice*aq; total += tPrice;
            const pref = P.prefix ? `${P.prefix}-` : '';
            tbody.innerHTML += `<tr class="border-b border-gray-300"><td class="p-2 font-bold">${pref}${it.ref}</td><td class="p-2">${TN[it.ty]||it.ty} Ceketi</td><td class="p-2 text-center">${it.ty==='pad'?'—':'DN'+it.dn}</td><td class="p-2 text-center font-bold">${aq}</td><td class="p-2 text-right">₺ ${fm(uPrice)}</td><td class="p-2 text-right font-bold text-indigo-700">₺ ${fm(tPrice)}</td></tr>`;
        });
    }
    tfoot.innerHTML = `<tr class="bg-gray-100 border-t-2 border-gray-800 font-bold text-lg"><td colspan="5" class="p-4 text-right">TOPLAM TUTAR (TL):</td><td class="p-4 text-right text-indigo-800">₺ ${fm(total)}</td></tr>`;
    document.getElementById('pdfModal').classList.add('show');
}
function downloadPDF() {
    const element = document.getElementById('pdfContentToPrint');
    const opt = { margin: 10, filename: `Fiyat_Teklifi_${P.prefix||'Liste'}.pdf`, image: { type:'jpeg', quality:.98 }, html2canvas: { scale:2 }, jsPDF: { unit:'mm', format:'a4', orientation:'portrait' } };
    toast('PDF Hazırlanıyor...', 'in'); html2pdf().set(opt).from(element).save().then(() => { document.getElementById('pdfModal').classList.remove('show'); toast('PDF Başarıyla İndirildi'); });
}

function toast(m, t='ok') {
    const bx = document.getElementById('toastBox'); const d = document.createElement('div'); d.className = `toast ${t}`;
    d.innerHTML = `<i data-lucide="${t==='ok'?'check-circle':t==='er'?'alert-octagon':'info'}"></i><span>${m}</span>`;
    bx.appendChild(d); lucide.createIcons(); setTimeout(() => { d.style.opacity='0'; d.style.transform='translateX(100%)'; setTimeout(()=>d.remove(),300); }, 3000);
}
function optConfirm(m, cb) { document.getElementById('optConfirmMsg').textContent = m; document.getElementById('optConfirmBg').classList.add('show'); document.getElementById('optConfirmYes').onclick = () => { cb(); document.getElementById('optConfirmBg').classList.remove('show'); }; }

function saveData() { localStorage.setItem('insjack_pro_v3', JSON.stringify({P,M,IT,FD,BL,AP,TK,SVC,plQty,curShow,PERS,PP,RN,colVis})); toast('Sistem kaydedildi'); }
function updatePrefix(val) { P.prefix = val; rPL(); rProd(); toast('Ön ek güncellendi'); }

// ============ SİHİRBAZ ============
let wizStep=1, wizCat=null, wizBrand=null, wizModel=null;
function openWizard() { wizStep=1; wizCat=null; wizBrand=null; wizModel=null; renderWizStep(); openPopup('wizardModal'); }

function renderWizStep() {
    const body = document.getElementById('wizBody'), sub = document.getElementById('wizSubtitle'), back = document.getElementById('wizBtnBack'), add = document.getElementById('wizBtnAdd');
    back.style.display = wizStep > 1 ? 'flex' : 'none'; add.style.display = 'none';

    if (wizStep === 1) {
        sub.textContent = '1. Adım: Ceketlenecek ekipmanın türünü seçin.';
        let h = '<div class="wiz-grid" style="grid-template-columns:repeat(4,1fr)">';
        for (const [key, eq] of Object.entries(BRAND_INDEX.equipment_types || {})) {
            h += `<div class="wiz-card" onclick="wizPickCat('${key}')"><i data-lucide="${eq.icon||'box'}" class="w-6 h-6 mx-auto mb-2"></i><div class="text-xs font-bold">${eq.name}</div></div>`;
        }
        body.innerHTML = h + '</div>';
    } else if (wizStep === 2) {
        if (wizCat === 'flat_pad' || wizCat === 'elbow') { wizStep=3; renderWizStep(); return; }
        const eqName = (BRAND_INDEX.equipment_types||{})[wizCat]?.name || wizCat;
        sub.textContent = '2. Adım: ' + eqName + ' için marka seçin.';
        const availBrands = [];
        for (const [bKey, bData] of Object.entries(BRANDS)) {
            const models = Object.values(bData.valves||{}).filter(v => v.equipment_type === wizCat);
            if (models.length) availBrands.push({ key:bKey, name:bData.brand, count:models.length });
        }
        if (!availBrands.length) {
            body.innerHTML = `<div class="text-center py-12"><i data-lucide="alert-triangle" class="w-12 h-12 mx-auto mb-4 text-amber-500"></i><p class="font-bold text-amber-500 text-lg">Bu ekipman türü için henüz marka tanımlı değil.</p></div>`;
            lucide.createIcons(); return;
        }
        let h = '<div class="wiz-grid">';
        for (const b of availBrands) h += `<div class="wiz-card" onclick="wizPickBrand('${b.key}')"><i data-lucide="factory" class="w-6 h-6 mx-auto mb-2 text-indigo-500"></i><div class="text-sm font-bold">${b.name}</div><div class="text-[10px] text-slate-500 mt-1">${b.count} model</div></div>`;
        body.innerHTML = h + '</div>';
    } else if (wizStep === 3) {
        add.style.display = 'flex';
        const isPad = wizCat === 'flat_pad';
        if (isPad) {
            sub.textContent = '3. Adım: Yastık ölçüleri ve malzeme seçimi';
            body.innerHTML = `<div class="grid grid-cols-2 gap-4 mb-4"><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">En (mm)</label><input type="number" id="wPadW" class="ps font-mono" value="500"></div><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Boy (mm)</label><input type="number" id="wPadH" class="ps font-mono" value="300"></div><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Adet</label><input type="number" id="wPadQty" class="ps font-mono" value="1" min="1"></div><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Parça Sayısı</label><input type="number" id="wPadDiv" class="ps font-mono" value="1" min="1" oninput="wizCalcPadPreview()"></div></div><div id="wizPadPreview" class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs border border-slate-200 dark:border-slate-700 mb-4"></div><div class="border-t border-slate-200 dark:border-slate-700 pt-4">${wizMaterialHTML()}</div>`;
            setTimeout(() => wizCalcPadPreview(), 50);
        } else {
            const models = [];
            if (wizBrand && BRANDS[wizBrand]) {
                for (const [vk, vd] of Object.entries(BRANDS[wizBrand].valves||{})) { if (vd.equipment_type === wizCat) models.push({ key:vk, desc:vd.desc }); }
            }
            if (!models.length) { body.innerHTML = `<div class="text-center py-8"><i data-lucide="alert-triangle" class="w-8 h-8 mx-auto mb-2 text-amber-500"></i><p class="font-bold text-amber-500">Veri bulunamadı!</p></div>`; add.style.display = 'none'; lucide.createIcons(); return; }
            const brandName = BRANDS[wizBrand]?.brand || '';
            sub.textContent = '3. Adım: ' + brandName + ' — Ölçü ve malzeme seçimi';
            const modelOpts = models.map(m => `<option value="${m.key}">${m.desc}</option>`).join('');
            body.innerHTML = `<div class="grid grid-cols-3 gap-4 mb-4"><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Model</label><select id="wModel" class="ps font-bold text-indigo-600 dark:text-indigo-400" onchange="wizUpdDN()">${modelOpts}</select></div><div><label class="text-xs font-bold text-cyan-600 uppercase block mb-1">DN Ebatı</label><select id="wDN" class="ps font-mono font-bold text-cyan-600 dark:text-cyan-400" onchange="wizFillDims()"><option value="">Seçiniz</option></select></div><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Basınç Sınıfı</label><select id="wCls" class="ps"><option value="150">PN16 / Cl150</option><option value="300">PN25 / Cl300</option><option value="400">PN40 / Cl400</option></select></div></div><div class="grid grid-cols-4 gap-4 mb-4"><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Adet</label><input type="number" id="wQty" class="ps font-mono font-bold text-lg" value="1" min="1"></div><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Zorluk</label><input type="number" id="wDF" class="ps font-mono" value="${P.gDF}" step="0.1"></div><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Sol Bindirme</label><input type="number" id="wBX" class="ps font-mono" value="${P.lbx}" step="0.1"></div><div><label class="text-xs font-bold text-slate-500 uppercase block mb-1">Sağ Bindirme</label><input type="number" id="wBY" class="ps font-mono" value="${P.lby}" step="0.1"></div></div><div class="p-4 bg-cyan-50 dark:bg-cyan-500/10 rounded-xl mb-4 border border-cyan-200 dark:border-cyan-500/20"><div class="text-xs font-bold text-cyan-600 dark:text-cyan-400 mb-3 flex items-center gap-2"><i data-lucide="ruler" class="w-4 h-4"></i> Veritabanından Çekilen Ölçüler</div><div class="grid grid-cols-4 gap-3"><div><label class="text-[10px] text-slate-500 block mb-1">Flanş Çapı D (mm)</label><input type="number" id="wDimD" class="ps font-mono" oninput="wizRecalcCirc()"></div><div><label class="text-[10px] text-slate-500 block mb-1">2 Flanş Arası L (mm)</label><input type="number" id="wDimL" class="ps font-mono"></div><div><label class="text-[10px] text-slate-500 block mb-1">Vana Yüksekliği H (mm)</label><input type="number" id="wDimH" class="ps font-mono"></div><div><label class="text-[10px] text-slate-500 block mb-1">Çevre π×D (mm)</label><input type="number" id="wDimC" class="ps font-mono" readonly></div></div></div><div class="border-t border-slate-200 dark:border-slate-700 pt-4">${wizMaterialHTML()}</div>`;
            setTimeout(() => { wizUpdDN(); lucide.createIcons(); }, 50);
        }
    }
    lucide.createIcons();
}

function wizMaterialHTML() {
    const fabrics = M.filter(m => m.t === 'Kumaş'), fills = M.filter(m => m.t === 'Dolgu');
    const fabOpts = fabrics.map((m,i) => `<option value="${i}">${m.s} - ${m.n}</option>`).join('') || '<option>Tanımlı değil</option>';
    const filOpts = fills.map((m,i) => `<option value="${i}">${m.s} - ${m.n}</option>`).join('') || '<option>Tanımlı değil</option>';
    return `<div class="text-xs font-bold text-slate-500 uppercase mb-3">Malzeme Seçimi</div><div class="grid grid-cols-3 gap-4"><div><label class="text-[10px] text-slate-500 block mb-1">Alt Kumaş</label><select id="wMatBot" class="ps">${fabOpts}</select></div><div><label class="text-[10px] text-slate-500 block mb-1">Üst Kumaş</label><select id="wMatTop" class="ps">${fabOpts}</select></div><div><label class="text-[10px] text-slate-500 block mb-1">Dolgu</label><select id="wMatFill" class="ps">${filOpts}</select></div></div>`;
}

function wizPickCat(cat)   { wizCat=cat; wizStep=2; renderWizStep(); }
function wizPickBrand(brand) { wizBrand=brand; wizStep=3; renderWizStep(); }
function wizBack() { if (wizStep>1) { wizStep--; if (wizStep===2 && (wizCat==='flat_pad'||wizCat==='elbow')) wizStep=1; renderWizStep(); } }
function wizUpdDN() {
    const sel = document.getElementById('wModel'); if (!sel) return;
    const ty  = sel.value, vd = VALVE_DATA[ty], s = document.getElementById('wDN');
    s.innerHTML = '<option value="">Seçiniz</option>';
    if (vd && vd.dims) { Object.keys(vd.dims).map(Number).sort((a,b)=>a-b).forEach(dn => { s.innerHTML += `<option value="${dn}">DN${dn}</option>`; }); } 
    else { DN_LIST.forEach(dn => { s.innerHTML += `<option value="${dn}">DN${dn}</option>`; }); }
    const dfEl = document.getElementById('wDF'); if (dfEl && vd && vd.difficulty) dfEl.value = vd.difficulty;
    wizFillDims();
}
function wizFillDims() {
    const ty = document.getElementById('wModel')?.value, dn = document.getElementById('wDN')?.value;
    if (!ty||!dn) { ['wDimD','wDimL','wDimH','wDimC'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; }); return; }
    const vd = VALVE_DATA[ty], dims = vd && vd.dims && vd.dims[dn] ? vd.dims[dn] : {};
    if (document.getElementById('wDimD')) document.getElementById('wDimD').value = dims.D||'';
    if (document.getElementById('wDimL')) document.getElementById('wDimL').value = dims.L||'';
    if (document.getElementById('wDimH')) document.getElementById('wDimH').value = dims.H||'';
    if (document.getElementById('wDimC') && dims.D) document.getElementById('wDimC').value = Math.round(Math.PI*dims.D);
}
function wizRecalcCirc() { const d = parseFloat(document.getElementById('wDimD')?.value)||0; if (document.getElementById('wDimC')) document.getElementById('wDimC').value = d ? Math.round(Math.PI*d) : ''; }
function wizCalcPadPreview() {
    const w = parseFloat(document.getElementById('wPadW')?.value)||500, h = parseFloat(document.getElementById('wPadH')?.value)||300, div = parseInt(document.getElementById('wPadDiv')?.value)||1;
    const pieceW = Math.round(w/div), area = (w*h)/1e6, sewExtra = (div-1)*((w+h)*2/1000)*0.15, labMul = 1+(div-1)*0.3;
    const el = document.getElementById('wizPadPreview');
    if (el) el.innerHTML = `<div class="grid grid-cols-5 gap-3 text-center"><div><div class="font-mono font-bold text-indigo-500 text-lg">${div}</div><div class="text-[10px] text-slate-500">Parça Sayısı</div></div><div><div class="font-mono font-bold">${pieceW}×${h}</div><div class="text-[10px] text-slate-500">Parça Ölçüsü (mm)</div></div><div><div class="font-mono font-bold text-cyan-500">${area.toFixed(3)}</div><div class="text-[10px] text-slate-500">Toplam Alan (m²)</div></div><div><div class="font-mono font-bold text-amber-500">+${sewExtra.toFixed(2)}m</div><div class="text-[10px] text-slate-500">Ekstra Dikiş</div></div><div><div class="font-mono font-bold text-emerald-500">×${labMul.toFixed(1)}</div><div class="text-[10px] text-slate-500">İşçilik Çarpanı</div></div></div>`;
}

function wizAdd() {
    if (wizCat === 'flat_pad') {
        const qt = parseInt(document.getElementById('wPadQty')?.value)||1, w = parseFloat(document.getElementById('wPadW')?.value)||500, h = parseFloat(document.getElementById('wPadH')?.value)||300, div = parseInt(document.getElementById('wPadDiv')?.value)||1;
        const labMul = 1+(div-1)*0.3;
        IT.push({ ref:RN++, ty:'pad', vref:'pad', dn:0, cl:0, qt, df: P.gDF*labMul, parts:[{nm:'Yastık',ov:{},bw:P.lbw,bx:P.lbx,by:P.lby,calc:{},matOv:{}}], mh:'', label:`Düz Yastık (${w}×${h}mm, ${div} prç)`, calc:{}, padW:w, padH:h, padDiv:div });
        recalcAll(); toast('Düz yastık eklendi'); closePopup('wizardModal'); return;
    }
    const ty = document.getElementById('wModel')?.value, dn = parseInt(document.getElementById('wDN')?.value), cl = parseInt(document.getElementById('wCls')?.value)||150, qt = parseInt(document.getElementById('wQty')?.value)||1, df = parseFloat(document.getElementById('wDF')?.value)||P.gDF, bx = parseFloat(document.getElementById('wBX')?.value)||P.lbx, by = parseFloat(document.getElementById('wBY')?.value)||P.lby;
    if (!dn) { toast('DN ölçüsü seçmelisiniz!','er'); return; }
    const vd = VALVE_DATA[ty]; if (!vd) { toast('Model verisi bulunamadı!','er'); return; }
    const pn = vd.parts || ['Tek Parça'];
    const parts = pn.map((nm, i) => ({ nm, ov:{}, bw:P.lbw, bx, by:i===0?by:P.lbyf, calc:{}, matOv:{} }));
    const ovD = parseFloat(document.getElementById('wDimD')?.value)||undefined, ovL = parseFloat(document.getElementById('wDimL')?.value)||undefined, ovH = parseFloat(document.getElementById('wDimH')?.value)||undefined;
    const brandName = BRANDS[wizBrand]?.brand||'';
    IT.push({ ref:RN++, ty, vref:ty, dn, cl, qt, df, parts, mh:'', calc:{}, ovD, ovL, ovH, _brand:wizBrand, _brandName:brandName });
    recalcAll(); toast((vd.desc||ty) + ' DN'+dn+' eklendi (' + brandName + ')'); closePopup('wizardModal');
}

// ============ BAŞLATMA ============
window.addEventListener('load', async () => {
    await loadAllData();
    try {
        const sv = JSON.parse(localStorage.getItem('insjack_pro_v3'));
        if (sv && sv.IT) {
            Object.assign(P, sv.P||{});
            if (sv.M && sv.M.length) M = sv.M;
            IT = sv.IT || [];
            if (sv.FD && Object.keys(sv.FD).length) FD = sv.FD;
            if (sv.BL && Object.keys(sv.BL).length) BL = sv.BL;
            if (sv.AP && Object.keys(sv.AP).length) AP = sv.AP;
            if (sv.TK) TK = sv.TK; if (sv.SVC) SVC = sv.SVC;
            plQty = sv.plQty || {}; curShow = sv.curShow || curShow;
            if (sv.PERS) PERS = sv.PERS; if (sv.PP) PP = sv.PP;
            RN = sv.RN || (Math.max(...IT.map(i=>i.ref), 0)+1);
            if (sv.colVis) colVis = sv.colVis;
        }
    } catch(e) { console.warn('Hafıza okunurken hata:', e); }

    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerHTML = `<i data-lucide="${currentTheme==='dark'?'sun':'moon'}" class="w-4 h-4"></i>`;

    Object.keys(colVis).forEach(k => { const c = document.getElementById('chk_'+k); if (c) c.checked = colVis[k]; });
    const pi2 = document.getElementById('prefInput'); if (pi2) pi2.value = P.prefix || '';

    fetchRates(); rPers(); rPar(); rMat(); rGlobal(); recalcAll(); rVRef();
    lucide.createIcons();
    console.log('✅ Uygulama başlatıldı, formüller Excel ile senkronize edildi.');
});
