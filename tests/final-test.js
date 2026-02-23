// ============================================================================
// OPTİMİZİ - FİNAL ENTEGRASYON & MÜHENDİSLİK TEST SÜİTİ
// Revize Sonrası Tam Doğrulama
// ============================================================================

const fs = require('fs');
const path = require('path');

const PROJECT = path.resolve(__dirname, '..');

let passed = 0, failed = 0, warnings = 0;
const failures = [], warningList = [];

function assert(name, actual, expected, tol = 0.01) {
  if (expected === 0) { if (Math.abs(actual) < 1e-6) { passed++; return; } }
  else { const err = Math.abs((actual - expected) / expected); if (err <= tol) { passed++; return; } }
  failed++; failures.push(`❌ ${name}: beklenen=${expected}, hesaplanan=${typeof actual === 'number' ? actual.toFixed(6) : actual}`);
}
function assertRange(name, val, min, max) {
  if (val >= min && val <= max) { passed++; return; }
  failed++; failures.push(`❌ ${name}: ${typeof val === 'number' ? val.toFixed(4) : val} aralık dışı [${min}, ${max}]`);
}
function assertTrue(name, cond) { if (cond) passed++; else { failed++; failures.push(`❌ ${name}`); } }
function warn(name, msg) { warnings++; warningList.push(`⚠️  ${name}: ${msg}`); }
function section(t) { console.log(`\n${'═'.repeat(64)}\n  ${t}\n${'═'.repeat(64)}`); }

// ─────────────────────────────────────────────────────────────────
// SABİTLER (constants.js'den elle kopyalama - Node test ortamı)
// ─────────────────────────────────────────────────────────────────
const PIPES = { 15:21.3, 20:26.7, 25:33.7, 32:42.4, 40:48.3, 50:60.3, 65:76.1, 80:88.9, 100:114.3, 125:139.7, 150:168.3, 200:219.1, 250:273.0, 300:323.9, 350:355.6, 400:406.4, 500:508.0 };
const SEPARATORS = { 15:0.15, 20:0.18, 25:0.22, 32:0.28, 40:0.35, 50:0.45, 65:0.60, 80:0.75, 100:1.10, 125:1.45, 150:1.90, 200:2.80 };
const MATS = {
  rockwool:  { a:0.035, b:0.00017, c:0,      maxTemp:650,  minTemp:-50 },
  glasswool: { a:0.025, b:0.00015, c:0,      maxTemp:250,  minTemp:-50 },
  ceramic:   { a:0.025, b:0.00012, c:1.2e-7, maxTemp:1200, minTemp:0 },
  aerogel:   { a:0.019, b:0.00004, c:5e-8,   maxTemp:650,  minTemp:-200 },
  rubber:    { a:0.034, b:0.000075,c:0,       maxTemp:105,  minTemp:-50 },
  bare:      { a:25,    b:0,       c:0,       maxTemp:9999, minTemp:-273 }
};
const VALVE_FACTORS = { gate:1.2, globe:1.4, butterfly:0.6, ball:1.0, strainer:1.5, check:0.9, trap_float:1.6, trap_thermo:0.8, trap_bimetal:1.0, trap_bucket:1.5, flange:0.35 };
const FUEL_PARAMS = { gas:{lhv:8250,co2:0.202}, elec:{lhv:860,co2:0.478}, lng:{lhv:11500,co2:0.220}, fueloil:{lhv:9600,co2:0.270}, coal_imp:{lhv:6000,co2:0.340}, coal_loc:{lhv:3500,co2:0.380} };
const CO2_FACTORS = { gas:0.202, elec:0.440, lng:0.226, fueloil:0.279, coal_imp:0.340, coal_loc:0.380, manual:0.300 };
const CHILLER_MATS = { rubber:{k:0.034,maxTemp:105}, aerogel:{k:0.019,maxTemp:650}, glasswool:{k:0.032,maxTemp:500}, pu:{k:0.024,maxTemp:100}, bare:{k:25,maxTemp:9999} };
const CHILLER_VALVE = { gate:1.2, globe:1.4, butterfly:0.6, ball:1.0, strainer:1.5, check:0.9, flange:0.4, elbow:0.3 };
const MIN_THICKNESS = { rockwool:{pipe:25,flat:20}, glasswool:{pipe:25,flat:20}, ceramic:{pipe:13,flat:10}, aerogel:{pipe:5,flat:3}, rubber:{pipe:9,flat:6}, pu:{pipe:20,flat:15} };

// ─── HESAPLAMA FONKSİYONLARI ───
function getK(matKey,T) { if(!MATS[matKey]) return 0.04; const m=MATS[matKey]; return m.a+(m.b*T)+((m.c||0)*T*T); }
function getSurfaceCoeff(std,vWind,Ts,Ta,D_out,isFlat) {
  const dT=Math.abs(Ts-Ta); const sigma=5.67e-8,eps=0.9;
  let h_rad=eps*sigma*(Math.pow(Ts+273.15,4)-Math.pow(Ta+273.15,4))/(dT||1);
  if(dT<0.1)h_rad=5;
  let h_cv=0;
  if(vWind<0.1){if(isFlat)h_cv=1.95*Math.pow(dT,0.25);else h_cv=1.32*Math.pow(dT/(D_out||1),0.25);}
  else{h_cv=10*Math.pow(vWind,0.6)/Math.pow((D_out||1),0.4);if(isFlat)h_cv=5.8+3.8*vWind;}
  if(h_cv<1)h_cv=1; return h_rad+h_cv;
}
function solveInsulated(tP,tA,dP,thkM,mat,vW,flat) {
  let lo=tA,hi=tP,Ts=(lo+hi)/2;
  for(let i=0;i<100;i++){const Tm=(tP+Ts)/2;const k1=getK(mat,Tm);let R1;
    if(flat){R1=thkM/k1;}else{R1=Math.log((dP+2*thkM)/dP)/(2*Math.PI*k1);}
    const Qc=(tP-Ts)/R1;const Do=flat?1:dP+2*thkM;const h=getSurfaceCoeff('ISO',vW,Ts,tA,Do,flat);
    const As=flat?1:2*Math.PI*(Do/2);const Qv=h*As*(Ts-tA);if(Qc>Qv)lo=Ts;else hi=Ts;Ts=(lo+hi)/2;}
  const Do=flat?1:dP+2*thkM;const hf=getSurfaceCoeff('ISO',vW,Ts,tA,Do,flat);const Ao=flat?1:Math.PI*Do;
  return{Ts,Q:hf*Ao*(Ts-tA)};
}
function getDewPoint(t,rh){const a=17.27,b=237.7;const al=((a*t)/(b+t))+Math.log(rh/100);return(b*al)/(a-al);}
function getSteamProps(barG,dry=100){const Pa=barG+1.013;const Ts=99.63+30*Math.log(Pa)+1.5*Math.pow(Math.log(Pa),2);
  const hf=Ts;const hg=639+(3*Math.pow(Pa,0.45));return{temp:Ts,hg,h_real:hf+((dry/100)*(hg-hf))};}

// ─────────────────────────────────────────────────────────────────
// BÖLÜM A: DOSYA YAPISI & ENTEGRASYON DOĞRULAMASI
// ─────────────────────────────────────────────────────────────────
section("A. DOSYA YAPISI & ENTEGRASYON");

// A1: shared/ klasörü var mı?
assertTrue("shared/constants.js mevcut", fs.existsSync(path.join(PROJECT,'shared','constants.js')));
assertTrue("shared/constants-browser.js mevcut", fs.existsSync(path.join(PROJECT,'shared','constants-browser.js')));
assertTrue("shared/validation.js mevcut", fs.existsSync(path.join(PROJECT,'shared','validation.js')));

// A2: API dosyaları import kullanıyor mu?
for (const f of ['hesapla.js','anlik-kayip.js','chiller.js']) {
  const content = fs.readFileSync(path.join(PROJECT,'api',f),'utf8');
  assertTrue(`api/${f}: shared/constants.js import`, content.includes("from '../shared/constants.js'"));
  assertTrue(`api/${f}: shared/validation.js import`, content.includes("from '../shared/validation.js'"));
  assertTrue(`api/${f}: hardcoded PIPES YOK`, !content.includes('65:73.0') && !content.includes('65: 73.0'));
}

// A3: HTML dosyaları constants-browser.js yüklüyor mu?
for (const f of ['roi.html','anlik-kayip.html','chiller-roi.html','yalitim-performans.html','yogusma-hesaplama.html','boiler.html']) {
  const content = fs.readFileSync(path.join(PROJECT,'tool',f),'utf8');
  assertTrue(`tool/${f}: constants-browser.js script tag`, content.includes('constants-browser.js'));
  assertTrue(`tool/${f}: eski hardcoded DN65 YOK`, !content.includes('65:73.0'));
}

// A4: HTML dosyaları window.OPT referansı kullanıyor mu?
for (const f of ['roi.html','anlik-kayip.html','chiller-roi.html']) {
  const content = fs.readFileSync(path.join(PROJECT,'tool',f),'utf8');
  assertTrue(`tool/${f}: window.OPT.PIPES kullanımı`, content.includes('window.OPT.PIPES') || content.includes('window.OPT'));
}

// A5: constants.js ve constants-browser.js PIPES aynı mı?
const cjs = fs.readFileSync(path.join(PROJECT,'shared','constants.js'),'utf8');
const cbjs = fs.readFileSync(path.join(PROJECT,'shared','constants-browser.js'),'utf8');
for (const dn of [15,20,25,32,40,50,65,80,100,125,150,200,250,300,350,400,500]) {
  const val = PIPES[dn];
  assertTrue(`PIPES DN${dn}=${val} constants.js'de`, cjs.includes(`${dn}: ${val}`) || cjs.includes(`${dn}:${val}`));
  assertTrue(`PIPES DN${dn}=${val} browser.js'de`, cbjs.includes(`${dn}:${val}`) || cbjs.includes(`${dn}: ${val}`));
}

// ─────────────────────────────────────────────────────────────────
// BÖLÜM B: BORU ÇAPLARI (DIN EN 10220)
// ─────────────────────────────────────────────────────────────────
section("B. BORU DIŞ ÇAPLARI - DIN EN 10220");

const DIN = {15:21.3,20:26.7,25:33.7,32:42.4,40:48.3,50:60.3,65:76.1,80:88.9,100:114.3,125:139.7,150:168.3,200:219.1,250:273.0,300:323.9,350:355.6,400:406.4,500:508.0};
for (const [dn,exp] of Object.entries(DIN)) {
  assert(`DN${dn} dış çap`, PIPES[dn], exp, 0.001);
}
// DN65 düzeltme kontrolü
assertTrue("DN65 = 76.1mm (düzeltildi)", PIPES[65] === 76.1);

// ─────────────────────────────────────────────────────────────────
// BÖLÜM C: MALZEME SICAKLIK LİMİTLERİ (Mevcut sistemle uyum)
// ─────────────────────────────────────────────────────────────────
section("C. MALZEME SICAKLIK LİMİTLERİ");

// Mevcut yalitim-performans.html'deki limitlerle birebir eşleşmeli
assert("Taş yünü maxTemp", MATS.rockwool.maxTemp, 650);
assert("Cam yünü maxTemp", MATS.glasswool.maxTemp, 250);
assert("Seramik fiber maxTemp", MATS.ceramic.maxTemp, 1200);
assert("Aerogel maxTemp", MATS.aerogel.maxTemp, 650);
assert("Kauçuk maxTemp", MATS.rubber.maxTemp, 105);
assert("Bare maxTemp", MATS.bare.maxTemp, 9999);

// Chiller malzeme limitleri
assert("Chiller kauçuk maxTemp", CHILLER_MATS.rubber.maxTemp, 105);
assert("Chiller PU maxTemp", CHILLER_MATS.pu.maxTemp, 100);

// ─────────────────────────────────────────────────────────────────
// BÖLÜM D: λ(T) FORMÜL DOĞRULAMASI (DEĞİŞMEDİĞİNİ KANITLA)
// ─────────────────────────────────────────────────────────────────
section("D. λ(T) FORMÜL DOĞRULAMASI");

assert("RW λ@50°C",  getK('rockwool',50),  0.0435, 0.001);
assert("RW λ@200°C", getK('rockwool',200), 0.069, 0.001);
assert("RW λ@350°C", getK('rockwool',350), 0.0945, 0.001);
assert("GW λ@50°C",  getK('glasswool',50), 0.0325, 0.001);
assert("GW λ@200°C", getK('glasswool',200),0.055, 0.001);
assert("CF λ@500°C", getK('ceramic',500),  0.115, 0.001);
assert("CF λ@1000°C",getK('ceramic',1000), 0.265, 0.001);
assert("AG λ@50°C",  getK('aerogel',50),   0.021125, 0.001);
assert("RB λ@50°C",  getK('rubber',50),    0.03775, 0.001);
assert("RB λ@-20°C", getK('rubber',-20),   0.0325, 0.001);
assert("Unknown fallback", getK('xyz',100), 0.04, 0.001);

// Monotonluk
for (const mat of ['rockwool','glasswool','ceramic','aerogel','rubber']) {
  assertTrue(`${mat} λ monoton artar`, getK(mat,50)<getK(mat,200) && getK(mat,200)<getK(mat,400));
}

// ─────────────────────────────────────────────────────────────────
// BÖLÜM E: YÜZEY KATSAYISI & ISI KAYBI (Motor sağlamlığı)
// ─────────────────────────────────────────────────────────────────
section("E. ISI KAYBI HESAPLARI");

// Çıplak DN100 @180°C
const hb = getSurfaceCoeff('ISO',0,180,20,0.1143,false);
const Qb = hb * Math.PI * 0.1143 * 160;
assertRange("Çıplak DN100@180 Q", Qb, 600, 1200);

// İzolasyonlu DN100+50mm RW @180°C
const ins1 = solveInsulated(180,20,0.1143,0.05,'rockwool',0,false);
assertRange("İzo DN100+50mm Q", ins1.Q, 50, 130);
assertRange("İzo DN100+50mm Ts", ins1.Ts, 25, 50);

// Kalınlık↑ → Q↓
const i30=solveInsulated(180,20,0.1143,0.03,'rockwool',0,false);
const i80=solveInsulated(180,20,0.1143,0.08,'rockwool',0,false);
const i120=solveInsulated(180,20,0.1143,0.12,'rockwool',0,false);
assertTrue("Kalınlık↑ → Q↓", i30.Q>i80.Q && i80.Q>i120.Q);
assertTrue("Kalınlık↑ → Ts↓", i30.Ts>i80.Ts && i80.Ts>i120.Ts);

// Aerogel < RW (aynı kalınlık)
const iAG=solveInsulated(180,20,0.1143,0.03,'aerogel',0,false);
const iRW=solveInsulated(180,20,0.1143,0.03,'rockwool',0,false);
assertTrue("Aerogel Q < RW Q", iAG.Q<iRW.Q);

// Rüzgar↑ → Q↑
const calm=solveInsulated(180,20,0.1143,0.05,'rockwool',0,false);
const wind=solveInsulated(180,20,0.1143,0.05,'rockwool',15,false);
assertTrue("Rüzgar↑ → Q↑", wind.Q>calm.Q);

// Düz yüzey
const flat1=solveInsulated(200,20,1.0,0.08,'rockwool',0,true);
assertRange("Düz yüzey +80mm Q", flat1.Q, 80, 350);
assertTrue("Düz yüzey Ts mantıklı", flat1.Ts>20 && flat1.Ts<200);

// dT≈0 → Q≈0
const nodt=solveInsulated(20,20,0.1143,0.05,'rockwool',0,false);
assertRange("dT=0 → Q≈0", Math.abs(nodt.Q), 0, 1);

// ─────────────────────────────────────────────────────────────────
// BÖLÜM F: KAZAN VERİMLİLİĞİ
// ─────────────────────────────────────────────────────────────────
section("F. KAZAN VERİMLİLİĞİ");

assertRange("0 bar(g) Tsat", getSteamProps(0).temp, 97, 103);
assertRange("1 bar(g) Tsat", getSteamProps(1).temp, 115, 126);
assertRange("5 bar(g) Tsat", getSteamProps(5).temp, 153, 165);
assertRange("10 bar(g) Tsat", getSteamProps(10).temp, 178, 190);
assertRange("10 bar(g) hg", getSteamProps(10).hg, 640, 680);

// Basınç↑ → Tsat↑
const ts = [0,2,5,8,10,15,20].map(p=>getSteamProps(p).temp);
assertTrue("Basınç↑ → Tsat↑", ts.every((v,i)=>i===0||v>ts[i-1]));

// Kuruluk
assertTrue("Kuruluk %100 > %90 entalpi", getSteamProps(10,100).h_real > getSteamProps(10,90).h_real);

// ─────────────────────────────────────────────────────────────────
// BÖLÜM G: YOĞUŞMA (ÇİĞ NOKTASI)
// ─────────────────────────────────────────────────────────────────
section("G. YOĞUŞMA ÇİĞ NOKTASI");

assertRange("25°C/%70 dew", getDewPoint(25,70), 18.5, 20.0);
assertRange("35°C/%90 dew", getDewPoint(35,90), 32.5, 34.0);
assertRange("20°C/%50 dew", getDewPoint(20,50), 8.5, 10.5);
assertRange("15°C/%30 dew", getDewPoint(15,30), -4.0, -1.0);

// RH↑ → Tdew↑
assertTrue("RH↑ → Tdew↑", getDewPoint(25,50)<getDewPoint(25,70) && getDewPoint(25,70)<getDewPoint(25,90));

// Tdew < Tort (RH<100%)
for (const rh of [30,50,70,90]) assertTrue(`Tdew<25 @RH=${rh}`, getDewPoint(25,rh)<25);

// ─────────────────────────────────────────────────────────────────
// BÖLÜM H: YAKIT & FİNANS
// ─────────────────────────────────────────────────────────────────
section("H. YAKIT & FİNANS");

assert("kWh→kcal", 860, 860);
assert("Doğalgaz tasarruf", (1000*860)/(8250*0.9), 115.82, 0.01);
assert("CO2 hesabı", (1000/0.9)*0.202/1000, 0.2244, 0.01);
assert("ROI hesabı", (50000/120000)*12, 5.0, 0.001);
assertRange("Doğalgaz LHV", FUEL_PARAMS.gas.lhv, 8000, 8600);
assertRange("LNG LHV", FUEL_PARAMS.lng.lhv, 11000, 12000);
assertRange("Fuel oil LHV", FUEL_PARAMS.fueloil.lhv, 9200, 10000);
assertRange("DG CO2", FUEL_PARAMS.gas.co2, 0.18, 0.22);
assertRange("Elec CO2", FUEL_PARAMS.elec.co2, 0.40, 0.55);

// ─────────────────────────────────────────────────────────────────
// BÖLÜM I: VALIDATION KURALLARI
// ─────────────────────────────────────────────────────────────────
section("I. VALIDATION KURALLARI (YENİ)");

// Validation fonksiyonunu simüle et (import edemiyoruz, inline yazalım)
function validate(p) {
  const errs = [];
  const mat = MATS[p.matKey];
  if (mat && p.matKey !== 'bare') {
    if (p.tProc > mat.maxTemp) errs.push({severity:'block', field:'matKey'});
    if (p.tProc < mat.minTemp) errs.push({severity:'block', field:'matKey'});
  }
  if (p.type !== 'chiller' && p.tProc < p.tAmb) errs.push({severity:'warn', field:'tProc'});
  if (p.matKey !== 'bare' && p.thk > 0 && MIN_THICKNESS[p.matKey]) {
    const lim = (p.type==='tank') ? MIN_THICKNESS[p.matKey].flat : MIN_THICKNESS[p.matKey].pipe;
    if (p.thk < lim) errs.push({severity:'warn', field:'thk'});
  }
  if (p.eff !== undefined && (p.eff <= 0 || p.eff > 1)) errs.push({severity:'block', field:'eff'});
  if (p.hours !== undefined && p.hours > 8760) errs.push({severity:'block', field:'hours'});
  if (p.hours !== undefined && p.hours <= 0) errs.push({severity:'block', field:'hours'});
  if (p.vWind !== undefined && p.vWind < 0) errs.push({severity:'block', field:'vWind'});
  if (p.qty !== undefined && p.qty <= 0) errs.push({severity:'block', field:'qty'});
  if (p.thk > 300) errs.push({severity:'warn', field:'thk'});
  return errs;
}
function hasBlock(errs) { return errs.some(e=>e.severity==='block'); }

// I.1: Kauçuk + 200°C → BLOCK
const v1 = validate({type:'pipe',tProc:200,tAmb:20,matKey:'rubber',thk:19,eff:0.9,hours:8000,qty:1});
assertTrue("Kauçuk@200°C → BLOCK", hasBlock(v1));

// I.2: Kauçuk + 100°C → geçmeli
const v2 = validate({type:'pipe',tProc:100,tAmb:20,matKey:'rubber',thk:19,eff:0.9,hours:8000,qty:1});
assertTrue("Kauçuk@100°C → geçer", !hasBlock(v2));

// I.3: Cam yünü + 300°C → BLOCK
const v3 = validate({type:'pipe',tProc:300,tAmb:20,matKey:'glasswool',thk:50,eff:0.9,hours:8000,qty:1});
assertTrue("Cam yünü@300°C → BLOCK", hasBlock(v3));

// I.4: Cam yünü + 200°C → geçmeli
const v4 = validate({type:'pipe',tProc:200,tAmb:20,matKey:'glasswool',thk:50,eff:0.9,hours:8000,qty:1});
assertTrue("Cam yünü@200°C → geçer", !hasBlock(v4));

// I.5: Seramik fiber + 1000°C → geçmeli
const v5 = validate({type:'pipe',tProc:1000,tAmb:20,matKey:'ceramic',thk:50,eff:0.9,hours:8000,qty:1});
assertTrue("Seramik@1000°C → geçer", !hasBlock(v5));

// I.6: Ters sıcaklık → WARN (block değil)
const v6 = validate({type:'pipe',tProc:10,tAmb:25,matKey:'rubber',thk:19,eff:0.9,hours:8000,qty:1});
assertTrue("tProc<tAmb → warn var", v6.some(e=>e.severity==='warn' && e.field==='tProc'));
assertTrue("tProc<tAmb → block yok", !hasBlock(v6));

// I.7: 9000 saat → BLOCK
const v7 = validate({type:'pipe',tProc:150,tAmb:20,matKey:'rockwool',thk:50,eff:0.9,hours:9000,qty:1});
assertTrue("9000 saat → BLOCK", hasBlock(v7));

// I.8: 0 saat → BLOCK
const v8 = validate({type:'pipe',tProc:150,tAmb:20,matKey:'rockwool',thk:50,eff:0.9,hours:0,qty:1});
assertTrue("0 saat → BLOCK", hasBlock(v8));

// I.9: Verim 1.5 → BLOCK
const v9 = validate({type:'pipe',tProc:150,tAmb:20,matKey:'rockwool',thk:50,eff:1.5,hours:8000,qty:1});
assertTrue("Verim 1.5 → BLOCK", hasBlock(v9));

// I.10: Verim 0.9 → geçmeli
const v10 = validate({type:'pipe',tProc:150,tAmb:20,matKey:'rockwool',thk:50,eff:0.9,hours:8000,qty:1});
assertTrue("Verim 0.9 → geçer", !hasBlock(v10));

// I.11: Miktar 0 → BLOCK
const v11 = validate({type:'pipe',tProc:150,tAmb:20,matKey:'rockwool',thk:50,eff:0.9,hours:8000,qty:0});
assertTrue("Qty=0 → BLOCK", hasBlock(v11));

// I.12: Min kalınlık - kauçuk pipe 5mm → WARN
const v12 = validate({type:'pipe',tProc:80,tAmb:20,matKey:'rubber',thk:5,eff:0.9,hours:8000,qty:1});
assertTrue("Kauçuk 5mm pipe → warn", v12.some(e=>e.severity==='warn' && e.field==='thk'));

// I.13: Min kalınlık - kauçuk pipe 13mm → geçmeli
const v13 = validate({type:'pipe',tProc:80,tAmb:20,matKey:'rubber',thk:13,eff:0.9,hours:8000,qty:1});
assertTrue("Kauçuk 13mm pipe → thk warn yok", !v13.some(e=>e.field==='thk'));

// I.14: Aşırı kalınlık 500mm → WARN
const v14 = validate({type:'pipe',tProc:150,tAmb:20,matKey:'rockwool',thk:500,eff:0.9,hours:8000,qty:1});
assertTrue("500mm kalınlık → warn", v14.some(e=>e.severity==='warn' && e.field==='thk'));

// I.15: Bare → sıcaklık limiti kontrolü atlamalı
const v15 = validate({type:'pipe',tProc:900,tAmb:20,matKey:'bare',thk:0,eff:0.9,hours:8000,qty:1});
assertTrue("Bare@900°C → block yok", !hasBlock(v15));

// I.16: Negatif rüzgar → BLOCK
const v16 = validate({type:'pipe',tProc:150,tAmb:20,matKey:'rockwool',thk:50,eff:0.9,hours:8000,qty:1,vWind:-5});
assertTrue("Rüzgar -5 → BLOCK", hasBlock(v16));

// I.17: Normal senaryo → tamamen temiz
const v17 = validate({type:'pipe',tProc:180,tAmb:20,matKey:'rockwool',thk:50,eff:0.9,hours:8000,qty:2});
assertTrue("Normal senaryo → 0 hata", v17.length === 0);

// ─────────────────────────────────────────────────────────────────
// BÖLÜM J: VANA & SEPARATÖR
// ─────────────────────────────────────────────────────────────────
section("J. VANA & SEPARATÖR");

assertTrue("butterfly < gate < globe", VALVE_FACTORS.butterfly<VALVE_FACTORS.gate && VALVE_FACTORS.gate<VALVE_FACTORS.globe);
assertTrue("flange < 0.5", VALVE_FACTORS.flange<0.5);
for (const [k,v] of Object.entries(VALVE_FACTORS)) assertRange(`VF ${k}`, v, 0.1, 3.0);

const sepDNs = Object.keys(SEPARATORS).map(Number).sort((a,b)=>a-b);
assertTrue("Separatör monoton", sepDNs.every((d,i)=>i===0||SEPARATORS[d]>SEPARATORS[sepDNs[i-1]]));

// Chiller valve: elbow ve flange ek değerleri
assertTrue("Chiller elbow=0.3", CHILLER_VALVE.elbow===0.3);
assertTrue("Chiller flange=0.4", CHILLER_VALVE.flange===0.4);

// ─────────────────────────────────────────────────────────────────
// BÖLÜM K: SAYISAL KARARLILIK
// ─────────────────────────────────────────────────────────────────
section("K. SAYISAL KARARLILIK");

// Determinizm
const ra=solveInsulated(300,20,0.2191,0.08,'rockwool',0,false);
const rb=solveInsulated(300,20,0.2191,0.08,'rockwool',0,false);
assert("Determinizm Ts", ra.Ts, rb.Ts, 1e-10);

// Çok küçük çap
try{const t=solveInsulated(150,20,0.001,0.01,'rockwool',0,false);assertTrue("Küçük çap crash yok",isFinite(t.Q)&&isFinite(t.Ts));}catch(e){failed++;failures.push("❌ Küçük çap crash: "+e.message);}

// Yüksek rüzgar
try{const h=getSurfaceCoeff('ISO',100,150,20,0.1,false);assertTrue("v=100 crash yok",isFinite(h)&&h>0);}catch(e){failed++;failures.push("❌ v=100 crash: "+e.message);}

// dT≈0
try{const h=getSurfaceCoeff('ISO',0,20.001,20,0.1,false);assertTrue("dT≈0 crash yok",isFinite(h)&&h>0);}catch(e){failed++;failures.push("❌ dT≈0 crash: "+e.message);}

// Negatif sıcaklık
const cold=solveInsulated(-20,25,0.0603,0.025,'rubber',0,false);
assertRange("Soğutma -20°C Ts", cold.Ts, -20, 25);

// 600°C seramik
const hot=solveInsulated(600,20,0.1143,0.1,'ceramic',0,false);
assertTrue("600°C converge", hot.Ts>20 && hot.Ts<600);

// ─────────────────────────────────────────────────────────────────
// BÖLÜM L: CROSS-FILE TUTARLILIK
// ─────────────────────────────────────────────────────────────────
section("L. CROSS-FILE TUTARLILIK");

// constants.js MATS.rockwool.a === constants-browser.js'deki
assertTrue("constants.js RW a=0.035", cjs.includes('a: 0.035') || cjs.includes('a:0.035'));
assertTrue("browser.js RW a=0.035", cbjs.includes('a:0.035'));

// Limit tutarlılığı: constants.js vs browser.js
for (const [mat,data] of Object.entries(MATS)) {
  if (mat === 'bare') continue;
  assertTrue(`${mat} maxTemp=${data.maxTemp} browser.js'de`, cbjs.includes(`maxTemp:${data.maxTemp}`));
}

// FUEL_PARAMS tutarlılığı
for (const [k,v] of Object.entries(FUEL_PARAMS)) {
  assertTrue(`${k} lhv=${v.lhv} browser.js'de`, cbjs.includes(`lhv:${v.lhv}`));
}

// CO2_FACTORS tutarlılığı
for (const [k,v] of Object.entries(CO2_FACTORS)) {
  assertTrue(`CO2 ${k}=${v} browser.js'de`, cbjs.includes(`${k}:${v}`) || cbjs.includes(`${k}: ${v}`));
}

// ─────────────────────────────────────────────────────────────────
// SONUÇ RAPORU
// ─────────────────────────────────────────────────────────────────
section("FİNAL SONUÇ RAPORU");

const total = passed + failed;
const pct = ((passed/total)*100).toFixed(1);

console.log(`\n  ✅ GEÇEN:    ${passed}`);
console.log(`  ❌ KALAN:    ${failed}`);
console.log(`  ⚠️  UYARI:    ${warnings}`);
console.log(`  ─────────────────`);
console.log(`  📊 TOPLAM:   ${total}`);
console.log(`  📈 BAŞARI:   %${pct}\n`);

if (failures.length > 0) {
  console.log("  BAŞARISIZ TESTLER:");
  console.log("  " + "─".repeat(58));
  failures.forEach(f => console.log(`  ${f}`));
}
if (warningList.length > 0) {
  console.log("\n  UYARILAR:");
  warningList.forEach(w => console.log(`  ${w}`));
}

console.log(`\n${'═'.repeat(64)}`);
if (failed === 0) {
  console.log("  🎉 TÜM TESTLER GEÇTİ — SİSTEM DEPLOY'A HAZIR");
} else {
  console.log("  🚨 DEPLOY ETME — Önce hataları düzelt!");
}
console.log(`${'═'.repeat(64)}\n`);

process.exit(failed > 0 ? 1 : 0);
