# TeuAcademy Projesi - Devir Teslim ve Kurulum Rehberi

TeuAcademy projesine hoş geldin! Bu doküman, projeyi devralacak yeni geliştirici için özel olarak hazırlanmıştır. Proje daha önce eski geliştiricinin kişisel hesaplarına (GitHub, Vercel, Firebase) bağlıydı. Aşağıdaki adımları takip ederek projeyi tamamen kendi üzerine alabilir ve geliştirmeye başlayabilirsin.

## 🚀 Projeyi Üzerine Alma Adımları (Handover)

Projeyi kendi ortamına taşımak için aşağıdaki 3 ana adımı sırasıyla yapmalısın:

### 1. GitHub Reposunu Devralma

Projenin kodları şu an eski geliştiricinin hesabında. Projeyi kendi GitHub hesabına alman gerekir.

*   **Seçenek A (Transfer):** Eski geliştirici Github üzerinden "Settings > General > Transfer ownership" adımlarını izleyerek repoyu doğrudan sana devredebilir (En temizi ve önerilen yöntem budur).
*   **Seçenek B (Fork):** Eski repo üzerinden "Fork" butonuna basarak kendi hesabına bir kopyasını alabilirsin.

Repo senin hesabına geçtikten sonra kendi bilgisayarına klonla:
```bash
git clone https://github.com/SENIN_KULLANICI_ADIN/TeuAcademy.git
cd TeuAcademy
```

### 2. Firebase Kurulumu (Backend ve Veritabanı)

Proje Firebase Authentication (Kullanıcı Girişi), Firestore (Veritabanı) ve Storage (Dosya Yükleme) kullanıyor. Eski veritabanına erişimin olmayacağı için kendi Firebase projeni oluşturmalısın:

1.  [Firebase Console](https://console.firebase.google.com/)'a git ve yeni bir proje oluştur.
2.  Sol menüden **Build > Authentication** kısmına gir ve "Get Started" diyerek **Email/Password** girişini aktifleştir.
3.  Sol menüden **Build > Firestore Database** kısmına gir ve yeni bir veritabanı oluştur. 
4.  Sol menüden **Build > Storage** kısmına gir ve aktifleştir.
5.  Proje ayarlarına (Project Settings) girip yeni bir **Web App** (</>) oluştur.
6.  Kurulum sonunda sana verilen `firebaseConfig` objesindeki değerleri kopyala.

Proje ana dizininde `.env` adında yeni bir dosya oluştur ve kopyaladığın değerleri aşağıdaki gibi yapıştır:

```env
VITE_FIREBASE_API_KEY="senin_api_key_değerin"
VITE_FIREBASE_AUTH_DOMAIN="senin_auth_domain_değerin"
VITE_FIREBASE_PROJECT_ID="senin_project_id_değerin"
VITE_FIREBASE_STORAGE_BUCKET="senin_storage_bucket_değerin"
VITE_FIREBASE_MESSAGING_SENDER_ID="senin_messaging_sender_id_değerin"
VITE_FIREBASE_APP_ID="senin_app_id_değerin"
VITE_FIREBASE_MEASUREMENT_ID="senin_measurement_id_değerin"
```
*(Not: Bu değişkenleri `src/firebase/config.js` dosyasının okuyabilmesi için `VITE_` ön ekiyle başlatmanız şarttır.)*

### 3. Vercel Kurulumu (Canlıya Alma)

Projeyi internette yayınlamak (deploy) için Vercel'i kendi hesabına bağlamalısın:

1.  [Vercel](https://vercel.com/)'e kendi GitHub hesabınla giriş yap.
2.  "Add New > Project" butonuna tıkla.
3.  Kendi hesabına aldığın `TeuAcademy` reposunu seç (Import).
4.  **Framework Preset:** Vite olarak otomatik seçilecektir (Değiştirme).
5.  **Environment Variables:** Bölümünü aç. `.env` dosyanda oluşturduğun `VITE_FIREBASE_...` değişkenlerinin tamamını ve değerlerini tek tek Vercel'e ekle.
6.  "Deploy" butonuna bas.

Tebrikler! Artık projenin hem kodları, hem veritabanı hem de canlı sunucusu tamamen senin kontrolünde. 🎉
