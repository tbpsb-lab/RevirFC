# RevirFC Proje Kuralları

1. **Her Güncelleme Sonrası Zorunlu Build ve Canlıya Alma:**
   - Bu projede (`D:\antigravity projeler\RevirFC`) yapılan her kod/tasarım/konfigürasyon güncellemesinden sonra işi tamamlamadan önce mutlaka:
     1. `npm run build` (`tsc -b && vite build`) çalıştırılarak hatasız derlendiği doğrulanmalıdır.
     2. `npx firebase deploy --only hosting` komutu çalıştırılarak değişiklikler `https://revirfc.web.app` adresine canlıya alınmalıdır.
   - Güvenlik kuralları (`firestore.rules` / `storage.rules`) değiştirildiyse deploy kapsamına ilgili kurallar da (`--only hosting,firestore:rules`) eklenmelidir.
