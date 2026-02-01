function getK(k,T){ if(!MATS[k])return 0.04; const m=MATS[k]; return m.a+(m.b*T)+((m.c||0)*T*T); }

function getSurfaceCoeff(std,v,Ts,Ta,D,isFlat){
    const dT=Math.abs(Ts-Ta), sig=5.67e-8, eps=0.9;
    let h_rad=eps*sig*(Math.pow(Ts+273.15,4)-Math.pow(Ta+273.15,4))/(dT||1); if(dT<0.1)h_rad=5;
    let h_cv=0;
    if(v<0.1) h_cv = isFlat ? 1.95*Math.pow(dT,0.25) : 1.32*Math.pow(dT/(D||1),0.25);
    else h_cv = isFlat ? 5.8+3.8*v : 10.0*Math.pow(v,0.6)/Math.pow((D||1),0.4);
    return Math.max(h_rad+h_cv, 1);
}
