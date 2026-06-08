# Catatan Detail Frontend

## SoilCare Cabai — Website Dashboard Monitoring

## 1. Tujuan Frontend

Frontend bertugas membuat website dashboard untuk menampilkan data monitoring kelembapan tanah tanaman cabai. Website ini digunakan oleh pengguna untuk melihat nilai kelembapan tanah, status tanah, rekomendasi penyiraman manual, grafik kelembapan, dan riwayat data.

Frontend dibuat sebagai **website responsive**, bukan aplikasi Android. Website dapat dibuka melalui laptop dan browser handphone seperti Chrome.

---

## 2. Teknologi Frontend

| Bagian           | Teknologi                                        |
| ---------------- | ------------------------------------------------ |
| Struktur halaman | HTML                                             |
| Styling/tampilan | CSS                                              |
| Interaksi data   | JavaScript                                       |
| Grafik           | Chart.js                                         |
| Sumber data      | Firebase Realtime Database atau endpoint backend |
| Akses            | Browser laptop dan Chrome di handphone           |

---

## 3. File Frontend yang Perlu Dibuat

Struktur file sederhana:

```text
frontend/
│
├── index.html
├── style.css
├── script.js
└── assets/
    ├── logo.png
    ├── cabai.png
    ├── icon-water.png
    ├── icon-dry-soil.png
    ├── icon-watering-can.png
    └── icon-leaf.png
```

Jika belum punya gambar aset, ikon bisa diganti dengan emoji atau icon dari Font Awesome.

---

## 4. Struktur Halaman Berdasarkan Mockup

Halaman utama adalah:

```text
Dashboard Monitoring
```

Komponen yang harus dibuat:

1. Browser-style header atau area website.
2. Navbar website.
3. Judul halaman.
4. Status sistem online.
5. Card kelembapan tanah.
6. Card status tanah.
7. Card rekomendasi.
8. Card tanaman cabai.
9. Grafik kelembapan.
10. Tabel riwayat data.
11. Kategori kelembapan.
12. Footer.

---

# BAGIAN A — HEADER DAN NAVBAR

## 5. Navbar Website

### Yang harus dibuat

Navbar berada di bagian atas halaman.

Isi navbar:

| Elemen        | Isi                            |
| ------------- | ------------------------------ |
| Logo          | Ikon cabai/daun                |
| Nama aplikasi | SoilCare Cabai                 |
| Menu 1        | Dashboard                      |
| Menu 2        | Monitoring                     |
| Menu 3        | Grafik                         |
| Menu 4        | Riwayat                        |
| Menu 5        | Pengaturan                     |
| Profil        | Nama pengguna atau ikon profil |

### Tampilan pada mockup

Menu aktif adalah:

```text
Dashboard
```

Dashboard diberi warna hijau dan garis bawah.

### Perintah kerja frontend

* Buat navbar dengan layout horizontal.
* Letakkan logo dan nama aplikasi di kiri.
* Letakkan menu navigasi di tengah.
* Letakkan profil pengguna di kanan.
* Beri warna hijau pada menu aktif.
* Buat navbar tetap rapi pada layar laptop.
* Pada tampilan handphone, menu boleh berubah menjadi tombol hamburger.

### Catatan penting

Karena sistem hanya 1 role, bagian profil tidak perlu login sungguhan. Cukup tampilkan contoh:

```text
Pengguna
Pemilik Tanaman
```

Hindari tulisan **Administrator** jika sistem tidak menggunakan role admin.

---

# BAGIAN B — JUDUL DAN STATUS SISTEM

## 6. Judul Halaman

### Isi teks

```text
Dashboard Monitoring
Sistem monitoring kelembapan tanah tanaman cabai berbasis IoT
```

### Perintah kerja frontend

* Buat judul besar “Dashboard Monitoring”.
* Tambahkan subtitle kecil di bawahnya.
* Letakkan pada bagian kiri atas konten.
* Gunakan font tebal untuk judul.
* Gunakan warna abu-abu untuk subtitle.

---

## 7. Status Sistem Online

### Isi teks

```text
● Sistem Online
```

### Perintah kerja frontend

* Buat badge status di kanan atas area konten.
* Gunakan titik hijau kecil.
* Gunakan background hijau muda.
* Tampilkan teks “Sistem Online”.
* Status ini bisa dibuat statis untuk prototype.

### Fungsi

Menunjukkan bahwa dashboard sedang aktif dan menerima data.

---

# BAGIAN C — CARD RINGKASAN UTAMA

## 8. Card Kelembapan Tanah

### Data yang ditampilkan

| Data             | Contoh                     |
| ---------------- | -------------------------- |
| Judul            | Kelembapan Tanah           |
| Nilai kelembapan | 28%                        |
| Waktu update     | Update terakhir: 11.00 WIB |
| Ikon             | Tetes air                  |

### Contoh tampilan

```text
Kelembapan Tanah
28%
Update terakhir: 11.00 WIB
```

### Sumber data

| Field      | Sumber                     |
| ---------- | -------------------------- |
| kelembapan | Firebase/latest/kelembapan |
| waktu      | Firebase/latest/waktu      |

### Perintah kerja frontend

* Buat card putih dengan border radius.
* Letakkan ikon tetes air di sebelah kiri.
* Tampilkan nilai kelembapan dengan ukuran besar.
* Tambahkan teks update terakhir.
* Nilai kelembapan harus berubah sesuai data terbaru.
* Jika belum terhubung Firebase, gunakan data dummy dulu.

### Catatan teknis

Nilai persen bukan output langsung sensor. Nilai persen berasal dari hasil konversi ADC oleh ESP32.

---

## 9. Card Status Tanah

### Data yang ditampilkan

| Data       | Contoh           |
| ---------- | ---------------- |
| Judul      | Status Tanah     |
| Status     | Kering           |
| Keterangan | Kondisi saat ini |
| Ikon       | Tanah kering     |

### Contoh tampilan

```text
Status Tanah
Kering
Kondisi saat ini
```

### Sumber data

| Field  | Sumber                 |
| ------ | ---------------------- |
| status | Firebase/latest/status |

### Perintah kerja frontend

* Buat card status tanah.
* Tampilkan status dengan ukuran besar.
* Warna status mengikuti kondisi.
* Gunakan ikon tanah kering untuk status kering.
* Gunakan ikon daun/tanaman untuk status normal.
* Gunakan ikon air untuk status terlalu basah.

### Aturan warna

| Status        | Warna teks   | Background ikon |
| ------------- | ------------ | --------------- |
| Kering        | Oranye/Merah | Oranye muda     |
| Normal        | Hijau        | Hijau muda      |
| Terlalu basah | Biru         | Biru muda       |

---

## 10. Card Rekomendasi

### Data yang ditampilkan

| Data        | Contoh                      |
| ----------- | --------------------------- |
| Judul       | Rekomendasi                 |
| Rekomendasi | Siram tanaman secara manual |
| Keterangan  | Berdasarkan data saat ini   |
| Ikon        | Penyiram tanaman            |

### Contoh tampilan

```text
Rekomendasi
Siram tanaman secara manual
Berdasarkan data saat ini
```

### Sumber data

| Field       | Sumber                      |
| ----------- | --------------------------- |
| rekomendasi | Firebase/latest/rekomendasi |

### Perintah kerja frontend

* Buat card rekomendasi.
* Tampilkan rekomendasi dengan jelas.
* Gunakan warna sesuai status.
* Jangan tampilkan kalimat yang mengarah ke otomatisasi.
* Gunakan teks “manual” agar scope project jelas.

### Isi rekomendasi yang boleh muncul

| Status        | Rekomendasi                   |
| ------------- | ----------------------------- |
| Kering        | Siram tanaman secara manual   |
| Normal        | Tidak perlu menyiram          |
| Terlalu basah | Hentikan penyiraman sementara |

---

## 11. Card Tanaman Cabai

### Data yang ditampilkan

```text
Tanaman Cabai
Kondisi tanaman berdasarkan data kelembapan tanah
```

### Perintah kerja frontend

* Buat card gambar tanaman cabai di sisi kanan.
* Tampilkan gambar tanaman cabai.
* Tambahkan judul “Tanaman Cabai”.
* Tambahkan deskripsi singkat.
* Card ini bersifat informasi visual, bukan data utama.

---

# BAGIAN D — GRAFIK KELEMBAPAN

## 12. Grafik Kelembapan

### Data yang ditampilkan

Grafik menampilkan perubahan kelembapan tanah berdasarkan waktu.

Contoh:

| Waktu | Kelembapan |
| ----- | ---------: |
| 04.00 |        65% |
| 05.00 |        58% |
| 06.00 |        52% |
| 07.00 |        48% |
| 08.00 |        45% |
| 09.00 |        38% |
| 10.00 |        28% |
| 11.00 |        75% |

### Jenis grafik

```text
Line chart
```

### Teknologi

```text
Chart.js
```

### Perintah kerja frontend

* Buat area grafik dengan judul “Grafik Kelembapan”.
* Tambahkan dropdown periode “24 Jam Terakhir”.
* Gunakan line chart.
* Sumbu X berisi waktu.
* Sumbu Y berisi kelembapan dalam persen.
* Rentang Y dari 0 sampai 100.
* Gunakan titik pada setiap data.
* Gunakan warna hijau untuk garis grafik.
* Data grafik diambil dari history Firebase.
* Jika data Firebase belum tersedia, gunakan data dummy.

### Data yang digunakan

| Field      | Fungsi        |
| ---------- | ------------- |
| waktu      | Label sumbu X |
| kelembapan | Nilai sumbu Y |

### Catatan

Grafik menggunakan nilai `kelembapan`, bukan `adc_value`.

---

# BAGIAN E — RIWAYAT DATA

## 13. Tabel Riwayat Data

### Kolom tabel

| Kolom       | Isi                           |
| ----------- | ----------------------------- |
| Waktu       | Waktu pembacaan               |
| Kelembapan  | Nilai persen                  |
| Status      | Kering, Normal, Terlalu basah |
| Rekomendasi | Arahan penyiraman manual      |

### Contoh isi tabel

| Waktu | Kelembapan | Status        | Rekomendasi                   |
| ----- | ---------: | ------------- | ----------------------------- |
| 08.00 |        45% | Normal        | Tidak perlu menyiram          |
| 09.00 |        38% | Normal        | Tidak perlu menyiram          |
| 10.00 |        28% | Kering        | Siram tanaman secara manual   |
| 11.00 |        75% | Terlalu basah | Hentikan penyiraman sementara |

### Perintah kerja frontend

* Buat tabel riwayat data.
* Ambil data dari Firebase/history.
* Urutkan data terbaru ke terlama atau terlama ke terbaru.
* Tampilkan status dalam bentuk badge kecil.
* Gunakan warna badge sesuai status.
* Batasi tampilan misalnya 5 sampai 10 data terakhir.
* Pada tampilan HP, tabel dibuat scroll horizontal atau diubah menjadi list card.

### Badge status

| Status        | Warna badge |
| ------------- | ----------- |
| Kering        | Oranye muda |
| Normal        | Hijau muda  |
| Terlalu basah | Biru muda   |

---

# BAGIAN F — KATEGORI KELEMBAPAN

## 14. Card Kategori Kelembapan

### Isi kategori

| Rentang | Status        |
| ------- | ------------- |
| 0–30%   | Kering        |
| 31–70%  | Normal        |
| 71–100% | Terlalu basah |

### Perintah kerja frontend

* Buat card di sisi kanan bawah.
* Tampilkan tiga kategori kelembapan.
* Gunakan warna berbeda untuk tiap kategori.
* Kategori ini bersifat panduan untuk pengguna.

### Tampilan warna

| Kategori              | Warna        |
| --------------------- | ------------ |
| 0–30% Kering          | Merah/Oranye |
| 31–70% Normal         | Hijau        |
| 71–100% Terlalu basah | Biru         |

---

# BAGIAN G — FOOTER

## 15. Footer

### Isi footer

```text
SoilCare Cabai
Sistem Monitoring Kelembapan Tanah dan Rekomendasi Penyiraman Manual pada Tanaman Cabai Berbasis IoT

Prototype dashboard monitoring kelembapan tanah
```

### Perintah kerja frontend

* Buat footer di bagian bawah halaman.
* Jangan gunakan nama universitas jika tidak diperlukan.
* Gunakan teks prototype.
* Footer tidak perlu terlalu besar.

---

# BAGIAN H — DATA DAN INTEGRASI

## 16. Data dari Firebase

Frontend harus membaca struktur data berikut.

### Data latest

```json
{
  "device_id": "ESP32-CABAI-01",
  "adc_value": 2000,
  "kelembapan": 60,
  "status": "Normal",
  "rekomendasi": "Tidak perlu menyiram",
  "waktu": "2026-06-03 11:00:00"
}
```

### Data history

```json
{
  "data_001": {
    "device_id": "ESP32-CABAI-01",
    "adc_value": 2500,
    "kelembapan": 35,
    "status": "Normal",
    "rekomendasi": "Tidak perlu menyiram",
    "waktu": "2026-06-03 08:00:00"
  },
  "data_002": {
    "device_id": "ESP32-CABAI-01",
    "adc_value": 3300,
    "kelembapan": 10,
    "status": "Kering",
    "rekomendasi": "Siram tanaman secara manual",
    "waktu": "2026-06-03 11:00:00"
  }
}
```

---

## 17. Field yang Dipakai Frontend

| Field         | Dipakai untuk                   |
| ------------- | ------------------------------- |
| `kelembapan`  | Card kelembapan dan grafik      |
| `status`      | Card status dan badge tabel     |
| `rekomendasi` | Card rekomendasi dan tabel      |
| `waktu`       | Update terakhir dan tabel       |
| `adc_value`   | Opsional untuk informasi teknis |

---

## 18. Data Dummy untuk Awal Pengerjaan

Sebelum Firebase terhubung, frontend boleh memakai data dummy.

```javascript
const latestData = {
  device_id: "ESP32-CABAI-01",
  adc_value: 3300,
  kelembapan: 28,
  status: "Kering",
  rekomendasi: "Siram tanaman secara manual",
  waktu: "11.00 WIB"
};

const historyData = [
  {
    waktu: "08.00",
    adc_value: 2500,
    kelembapan: 45,
    status: "Normal",
    rekomendasi: "Tidak perlu menyiram"
  },
  {
    waktu: "09.00",
    adc_value: 2700,
    kelembapan: 38,
    status: "Normal",
    rekomendasi: "Tidak perlu menyiram"
  },
  {
    waktu: "10.00",
    adc_value: 3300,
    kelembapan: 28,
    status: "Kering",
    rekomendasi: "Siram tanaman secara manual"
  },
  {
    waktu: "11.00",
    adc_value: 1100,
    kelembapan: 75,
    status: "Terlalu basah",
    rekomendasi: "Hentikan penyiraman sementara"
  }
];
```

---

# BAGIAN I — RESPONSIVE DESIGN

## 19. Tampilan Desktop

Frontend pada laptop mengikuti mockup:

* navbar horizontal di atas;
* tiga card utama sejajar;
* card tanaman di kanan;
* grafik di kiri;
* kategori kelembapan di kanan;
* tabel riwayat di bawah grafik;
* footer di bawah.

### Layout desktop

```text
Navbar

Judul + Status Online

Card Kelembapan | Card Status | Card Rekomendasi | Card Tanaman

Grafik Kelembapan                     Kategori Kelembapan

Riwayat Data

Footer
```

---

## 20. Tampilan Handphone

Frontend pada HP harus berubah menjadi satu kolom.

### Layout handphone

```text
Navbar
Judul Dashboard
Status Online

Card Kelembapan
Card Status
Card Rekomendasi
Card Tanaman
Grafik Kelembapan
Kategori Kelembapan
Riwayat Data
Footer
```

### Perintah kerja responsive

* Gunakan CSS media query.
* Untuk layar kecil, ubah grid menjadi satu kolom.
* Tabel riwayat diberi scroll horizontal.
* Ukuran teks dikurangi sedikit.
* Navbar bisa menjadi hamburger.
* Jangan gunakan bottom navigation karena ini website, bukan aplikasi Android.

---

# BAGIAN J — ATURAN TAMPILAN BERDASARKAN STATUS

## 21. Jika Status Kering

Jika `status = "Kering"`:

| Komponen           | Tampilan                    |
| ------------------ | --------------------------- |
| Card kelembapan    | Nilai rendah, misalnya 28%  |
| Card status        | Kering                      |
| Card rekomendasi   | Siram tanaman secara manual |
| Warna utama status | Oranye/Merah                |
| Badge tabel        | Kering                      |

---

## 22. Jika Status Normal

Jika `status = "Normal"`:

| Komponen           | Tampilan                   |
| ------------------ | -------------------------- |
| Card kelembapan    | Nilai sedang, misalnya 60% |
| Card status        | Normal                     |
| Card rekomendasi   | Tidak perlu menyiram       |
| Warna utama status | Hijau                      |
| Badge tabel        | Normal                     |

---

## 23. Jika Status Terlalu Basah

Jika `status = "Terlalu basah"`:

| Komponen           | Tampilan                      |
| ------------------ | ----------------------------- |
| Card kelembapan    | Nilai tinggi, misalnya 85%    |
| Card status        | Terlalu basah                 |
| Card rekomendasi   | Hentikan penyiraman sementara |
| Warna utama status | Biru                          |
| Badge tabel        | Terlalu basah                 |

---

# BAGIAN K — OUTPUT AKHIR FRONTEND

## 24. Output yang Harus Jadi

Frontend dianggap selesai jika sudah memiliki:

* halaman dashboard;
* navbar SoilCare Cabai;
* card kelembapan tanah;
* card status tanah;
* card rekomendasi;
* grafik kelembapan;
* tabel riwayat data;
* kategori kelembapan;
* footer;
* data dummy atau data Firebase;
* tampilan responsive desktop dan HP.

---

## 25. Checklist Frontend

Gunakan checklist ini untuk memastikan tugas selesai.

| No | Checklist                    | Status      |
| -- | ---------------------------- | ----------- |
| 1  | File `index.html` dibuat     | Belum/Sudah |
| 2  | File `style.css` dibuat      | Belum/Sudah |
| 3  | File `script.js` dibuat      | Belum/Sudah |
| 4  | Navbar dibuat                | Belum/Sudah |
| 5  | Card kelembapan dibuat       | Belum/Sudah |
| 6  | Card status dibuat           | Belum/Sudah |
| 7  | Card rekomendasi dibuat      | Belum/Sudah |
| 8  | Grafik Chart.js dibuat       | Belum/Sudah |
| 9  | Tabel riwayat dibuat         | Belum/Sudah |
| 10 | Kategori kelembapan dibuat   | Belum/Sudah |
| 11 | Footer dibuat                | Belum/Sudah |
| 12 | Data dummy ditampilkan       | Belum/Sudah |
| 13 | Integrasi Firebase disiapkan | Belum/Sudah |
| 14 | Responsive desktop dibuat    | Belum/Sudah |
| 15 | Responsive HP dibuat         | Belum/Sudah |

---

## 26. Catatan Konsistensi

Gunakan istilah:

* SoilCare Cabai;
* Dashboard Monitoring;
* Kelembapan Tanah;
* Status Tanah;
* Rekomendasi;
* Siram tanaman secara manual;
* Tidak perlu menyiram;
* Hentikan penyiraman sementara;
* Website dashboard responsive.

Hindari istilah:

* aplikasi Android;
* penyiraman otomatis;
* pompa menyala;
* relay aktif;
* aktuator;
* admin jika tidak ada role admin.
