export default function handler(req, res) {
  if (req.method === 'POST') {
    const gelenVeri = req.body;
    // Şimdilik matematiği koymuyoruz, sadece iletişimi test ediyoruz.
    res.status(200).json({ 
        mesaj: "Mutfak başarıyla kuruldu ve siparişi aldı!", 
        hesaplananDeger: "1234.56" 
    });
  } else {
    res.status(200).json({ mesaj: "Burası Optimizi API Mutfağı. Sistem aktif!" });
  }
}