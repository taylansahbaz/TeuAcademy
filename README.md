# TeuAcademy

TeuAcademy, eğitim atölyeleri, kullanıcı profil yönetimi ve bildirim sistemlerini içeren modern bir akademi yönetim ve etkinlik takip uygulamasıdır. Kullanıcı dostu arayüzü ve performanslı altyapısı ile akademi süreçlerini dijitalleştirmeyi hedefler.

## 🚀 Özellikler

- **Gelişmiş Profil Yönetimi:** Kullanıcıların profillerini detaylı şekilde tamamlaması ve düzenlemesi.
- **Atölye (Workshop) Yönetimi:** Etkinliklerin ve atölyelerin takvimlendirilmesi, detaylarının görüntülenmesi ve düzenlenmesi.
- **Gerçek Zamanlı Bildirimler:** Kullanıcıları ilgilendiren güncellemelerin anında iletilmesi.
- **Güvenli Kimlik Doğrulama:** Firebase altyapısı ile güvenli ve hızlı kullanıcı girişi/kaydı.
- **Modern Arayüz:** Tailwind CSS ile hazırlanmış, tamamen responsive (mobil uyumlu) ve şık tasarım.

## 🛠️ Teknoloji Yığını (Tech Stack)

- **Frontend:** React.js, Vite
- **Stil & UI:** Tailwind CSS, Lucide React (İkonlar)
- **Backend & Veritabanı:** Firebase (Auth, Firestore, Storage)
- **Routing:** React Router v7
- **Tarih & Zaman Yönetimi:** date-fns
- **Veri Görselleştirme (Grafikler):** Recharts

## 💻 Kurulum (Local Development)

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

### Ön Gereksinimler
- Node.js (v18 ve üzeri önerilir)
- NPM veya Yarn

### Kurulum Adımları

1. Projeyi klonlayın:
```bash
git clone https://github.com/SENIN_KULLANICI_ADIN/TeuAcademy.git
```

2. Proje dizinine gidin:
```bash
cd TeuAcademy
```

3. Bağımlılıkları yükleyin:
```bash
npm install
```

4. Ortam değişkenlerini ayarlayın:
Ana dizinde bir `.env` dosyası oluşturun ve gerekli Firebase yapılandırmalarını ekleyin. *(Not: Gerekli değişkenlerin listesini DEVIR_TESLIM.md dosyasında bulabilirsiniz.)*

5. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5173` adresinde ayağa kalkacaktır.

## 📚 Dokümantasyon ve Devir Teslim

Eğer projeyi yeni devraldıysanız; projenin farklı bir GitHub hesabına taşınması, kendi Firebase ve Vercel altyapınızın bağlanması hakkında detaylı yönergeler için lütfen [DEVIR_TESLIM.md](./DEVIR_TESLIM.md) dosyasını dikkatlice inceleyin.
