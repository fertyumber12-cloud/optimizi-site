// Boru Çapları (DN -> mm)
const PIPES = {
    15:21.3, 20:26.7, 25:33.4, 32:42.2, 40:48.3, 50:60.3, 65:73.0, 80:88.9, 
    100:114.3, 125:141.3, 150:168.3, 200:219.1, 250:273.0, 300:323.9, 350:355.6, 
    400:406.4, 500:508.0
};

// Seperatör Katsayıları
const SEPARATORS = {
    15:0.15, 20:0.18, 25:0.22, 32:0.28, 40:0.35, 50:0.45, 65:0.60, 80:0.75, 
    100:1.10, 125:1.45, 150:1.90, 200:2.80
};

// Malzeme Katsayıları (Isı İletim)
const MATS = {
    rockwool: {a:0.035, b:0.00017, c:0},
    glasswool: {a:0.025, b:0.00015, c:0},
    ceramic: {a:0.025, b:0.00012, c:1.2e-7},
    aerogel: {a:0.019, b:0.00004, c:5e-8},
    rubber: {a:0.034, b:0.000075, c:0},
    bare: {a:25, b:0, c:0}
};

// Vana Eşdeğer Faktörleri
const VALVE_FACTORS = {
    gate:1.2, globe:1.4, butterfly:0.6, ball:1.0, strainer:1.5, check:0.9,
    trap_float: 1.6, trap_thermo: 0.8, trap_bimetal: 1.0, trap_bucket: 1.5,
    flange: 0.35
};

// Yakıt Parametreleri (LHV ve CO2)
const FUEL_PARAMS = {
    gas: { lhv: 8250, co2: 0.202 }, 
    elec: { lhv: 860, co2: 0.478 }, 
    lng: { lhv: 11500, co2: 0.22 }, 
    fueloil: { lhv: 9600, co2: 0.27 }, 
    coal_imp: { lhv: 6000, co2: 0.34 }, 
    coal_loc: { lhv: 3500, co2: 0.38 }
};