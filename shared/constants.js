// ============================================================
// OPTİMİZİ — TEK KAYNAK SABİTLER (Browser)
// <script src="../shared/constants.js"></script> ile yüklenir.
// Erişim: OPTIMIZI.PIPES, OPTIMIZI.getK() vb.
// Sabitleri DEĞİŞTİRİRSEN → api/_shared.js'i de güncelle!
// ============================================================

(function(root) {
root.OPTIMIZI = (function() {

    var PIPES = {
        15:21.3, 20:26.7, 25:33.7, 32:42.4, 40:48.3, 50:60.3,
        65:76.1, 80:88.9, 100:114.3, 125:139.7, 150:168.3,
        200:219.1, 250:273.0, 300:323.9, 350:355.6, 400:406.4, 500:508.0, 600:610.0
    };

    var SEPARATORS = {
        15:0.15, 20:0.18, 25:0.22, 32:0.28, 40:0.35, 50:0.45,
        65:0.60, 80:0.75, 100:1.10, 125:1.45, 150:1.90, 200:2.80
    };

    var MATS = {
        rockwool:   { a: 0.031, b: 0.00013, c: 3.14e-7, maxTemp: 650,  name: "Taş Yünü" },
        glasswool:  { a: 0.032, b: 0.00018, c: 0,       maxTemp: 250,  name: "Cam Yünü" },
        needlemat:  { a: 0.033, b: 0.00015, c: 0,       maxTemp: 650,  name: "İğnelenmiş Cam Elyaf" },
        ceramic:    { a: 0.025, b: 0.00012, c: 1.2e-7,  maxTemp: 1200, name: "Seramik Elyaf" },
        aerogel:    { a: 0.019, b: 0.00004, c: 5e-8,    maxTemp: 650,  name: "Aerogel" },
        rubber:     { a: 0.034, b: 0.000075, c: 0,      maxTemp: 105,  name: "Elastomerik Kauçuk" },
        pu:         { a: 0.024, b: 0.000075, c: 0,      maxTemp: 100,  name: "Poliüretan" },
        bare:       { a: 25,    b: 0,        c: 0,      maxTemp: 9999, name: "Yalıtımsız" }
    };

    var VALVE_FACTORS = {
        gate: 1.2, globe: 1.4, butterfly: 0.6, ball: 1.0, strainer: 1.5, check: 0.9,
        trap_float: 1.6, trap_thermo: 0.8, trap_bimetal: 1.0, trap_bucket: 1.5, flange: 0.35
    };

    var FUEL_PARAMS = {
        gas:       { lhv: 8250,  co2: 0.202, unit: "m³",  name: "Doğalgaz" },
        elec:      { lhv: 860,   co2: 0.440, unit: "kWh", name: "Elektrik" },
        lng:       { lhv: 11500, co2: 0.226, unit: "kg",  name: "LNG" },
        fueloil:   { lhv: 9600,  co2: 0.279, unit: "kg",  name: "Fuel Oil" },
        coal_imp:  { lhv: 6000,  co2: 0.340, unit: "kg",  name: "İthal Kömür" },
        coal_loc:  { lhv: 3500,  co2: 0.380, unit: "kg",  name: "Yerli Linyit" }
    };

    var PHYSICS = {
        STEFAN_BOLTZMANN: 5.67e-8,
        EMISSIVITY: 0.9,
        KWH_TO_KCAL: 860
    };

    function getK(matKey, T) {
        var m = MATS[matKey];
        if (!m) return 0.04;
        return m.a + (m.b * T) + ((m.c || 0) * T * T);
    }

    function getOD(dn) { return PIPES[dn] || null; }
    function getDN(od_mm) { return Object.keys(PIPES).find(function(k) { return PIPES[k] == od_mm; }) || null; }

    function getSurfaceCoeff(std, vWind, Ts, Ta, D_out, isFlat) {
        var dT = Math.abs(Ts - Ta);
        var sigma = PHYSICS.STEFAN_BOLTZMANN;
        var eps = PHYSICS.EMISSIVITY;

        var h_rad;
        if (dT < 0.1) {
            h_rad = 5;
        } else {
            h_rad = eps * sigma * (Math.pow(Ts + 273.15, 4) - Math.pow(Ta + 273.15, 4)) / (Ts - Ta);
            h_rad = Math.abs(h_rad);
        }

        var h_cv = 0;
        if (std === 'astm') {
            if (vWind < 0.1) {
                h_cv = isFlat ? 1.95 * Math.pow(dT, 0.25)
                              : 1.32 * Math.pow(dT / (D_out || 1), 0.25);
            } else {
                h_cv = isFlat ? 5.8 + 3.8 * vWind
                              : 10.0 * Math.pow(vWind, 0.6) / Math.pow((D_out || 1), 0.4);
            }
        } else if (std === 'vdi') {
            if (vWind < 0.1) {
                h_cv = 3.5 + 0.05 * dT;
            } else {
                h_cv = 3.9 * Math.pow(vWind, 0.7) / Math.pow((D_out || 1), 0.3);
            }
        } else {
            if (vWind < 0.1) {
                h_cv = isFlat ? 2.2 * Math.pow(dT, 0.25)
                              : 1.4 * Math.pow(dT / (D_out || 1), 0.25);
            } else {
                h_cv = isFlat ? 5.8 + 3.8 * vWind
                              : 4 + 4 * vWind;
            }
        }

        if (h_cv < 1) h_cv = 1;
        return h_rad + h_cv;
    }

    return {
        PIPES: PIPES, SEPARATORS: SEPARATORS, MATS: MATS,
        VALVE_FACTORS: VALVE_FACTORS, FUEL_PARAMS: FUEL_PARAMS, PHYSICS: PHYSICS,
        getK: getK, getOD: getOD, getDN: getDN, getSurfaceCoeff: getSurfaceCoeff
    };

})();
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
