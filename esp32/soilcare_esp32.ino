#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

/********************************************************
 * WIFI
 ********************************************************/
#define WIFI_SSID "USERNAME_WIFI_KAMU"
#define WIFI_PASSWORD "PASSWORD_WIFI_KAMU"

/********************************************************
 * FIREBASE REALTIME DATABASE
 ********************************************************/
#define FIREBASE_HOST "https://soilcare-cabai-db941-default-rtdb.asia-southeast1.firebasedatabase.app"

/********************************************************
 * TELEGRAM BOT
 * Ganti dengan token bot dan chat ID kamu.
 ********************************************************/
#define BOT_TOKEN "8861240357:AAFIjr_HE7Fh6wwoj5bnDgsblSe5NE53KI0"
#define CHAT_ID "6373703469"

/********************************************************
 * SENSOR SOIL MOISTURE
 * AO sensor masuk ke GPIO 34 / D34 ESP32
 ********************************************************/
const int soilPin = 34;

/*
  Nilai kalibrasi awal.
  Wajib diuji ulang sesuai sensor masing-masing.

  dryValue = nilai ADC saat sensor di tanah kering
  wetValue = nilai ADC saat sensor di tanah basah
*/
int dryValue = 1746;   // tanah kering
int wetValue = 0;      // tanah sangat basah

/********************************************************
 * INTERVAL PENGIRIMAN DATA
 ********************************************************/
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 30000; // 1 menit

String lastStatus = "";

/********************************************************
 * WIFI CONNECT
 ********************************************************/
void connectWiFi() {
  Serial.println("Menghubungkan ke WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retry = 0;

  while (WiFi.status() != WL_CONNECTED && retry < 30) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi berhasil terhubung.");
    Serial.print("IP ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi gagal terhubung. ESP32 akan restart.");
    ESP.restart();
  }
}

/********************************************************
 * SETUP WAKTU NTP
 ********************************************************/
void setupTime() {
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");

  Serial.print("Sinkronisasi waktu");

  struct tm timeinfo;
  int retry = 0;

  while (!getLocalTime(&timeinfo) && retry < 15) {
    Serial.print(".");
    delay(1000);
    retry++;
  }

  Serial.println();

  if (getLocalTime(&timeinfo)) {
    Serial.println("Waktu berhasil disinkronkan.");
  } else {
    Serial.println("Waktu gagal disinkronkan.");
  }
}

String getTimestamp() {
  struct tm timeinfo;

  if (!getLocalTime(&timeinfo)) {
    return "Waktu tidak tersedia";
  }

  char timeString[25];
  strftime(timeString, sizeof(timeString), "%Y-%m-%d %H:%M:%S", &timeinfo);

  return String(timeString);
}

/********************************************************
 * PEMBACAAN SENSOR
 ********************************************************/
int readSoilAverage() {
  long total = 0;
  const int sampleCount = 20;

  for (int i = 0; i < sampleCount; i++) {
    total += analogRead(soilPin);
    delay(10);
  }

  return total / sampleCount;
}

int convertToMoisturePercent(int adcValue) {

  int moisturePercent = map(
    adcValue,
    dryValue,
    wetValue,
    0,
    100
  );

  moisturePercent = constrain(
    moisturePercent,
    0,
    100
  );

  return moisturePercent;
}

/********************************************************
 * LOGIKA STATUS DAN REKOMENDASI
 ********************************************************/
String getStatus(int moisture) {
  if (moisture < 40) {
    return "Kering";
  }
  else if (moisture < 75) {
    return "Normal";
  }
  else {
    return "Terlalu basah";
  }
}

String getRecommendation(int moisture) {
  if (moisture < 40) {
    return "Siram tanaman";
  }
  else if (moisture < 75) {
    return "Kelembapan ideal";
  }
  else {
    return "Hentikan penyiraman sementara";
  }
}

/********************************************************
 * FORMAT JSON UNTUK FIREBASE
 ********************************************************/
String createJson(int moisture, int adcValue, String status, String recommendation, String timestamp) {
  String json = "{";
  json += "\"moisture\":" + String(moisture) + ",";
  json += "\"adc\":" + String(adcValue) + ",";
  json += "\"status\":\"" + status + "\",";
  json += "\"recommendation\":\"" + recommendation + "\",";
  json += "\"timestamp\":\"" + timestamp + "\"";
  json += "}";

  return json;
}

/********************************************************
 * KIRIM DATA TERBARU KE FIREBASE
 * Path: /latest
 ********************************************************/
bool sendFirebaseLatest(String jsonData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[FIREBASE] WiFi tidak terhubung.");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;

  String url = String(FIREBASE_HOST) + "/latest.json";

  if (!https.begin(client, url)) {
    Serial.println("[FIREBASE] Gagal membuka koneksi latest.");
    return false;
  }

  https.addHeader("Content-Type", "application/json");

  int httpCode = https.PUT(jsonData);
  String response = https.getString();

  Serial.print("[FIREBASE latest] HTTP Code: ");
  Serial.println(httpCode);
  Serial.print("[FIREBASE latest] Response: ");
  Serial.println(response);

  https.end();

  return httpCode >= 200 && httpCode < 300;
}

/********************************************************
 * KIRIM RIWAYAT KE FIREBASE
 * Path: /readings
 ********************************************************/
bool sendFirebaseReading(String jsonData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[FIREBASE] WiFi tidak terhubung.");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;

  String url = String(FIREBASE_HOST) + "/readings.json";

  if (!https.begin(client, url)) {
    Serial.println("[FIREBASE] Gagal membuka koneksi readings.");
    return false;
  }

  https.addHeader("Content-Type", "application/json");

  int httpCode = https.POST(jsonData);
  String response = https.getString();

  Serial.print("[FIREBASE readings] HTTP Code: ");
  Serial.println(httpCode);
  Serial.print("[FIREBASE readings] Response: ");
  Serial.println(response);

  https.end();

  return httpCode >= 200 && httpCode < 300;
}

/********************************************************
 * KIRIM TELEGRAM
 ********************************************************/
bool sendTelegram(String message) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[TELEGRAM] WiFi tidak terhubung.");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;

  String url = "https://api.telegram.org/bot" + String(BOT_TOKEN) + "/sendMessage";
  String payload = "chat_id=" + String(CHAT_ID) + "&text=" + urlEncode(message);

  if (!https.begin(client, url)) {
    Serial.println("[TELEGRAM] Gagal membuka koneksi.");
    return false;
  }

  https.addHeader("Content-Type", "application/x-www-form-urlencoded");

  int httpCode = https.POST(payload);
  String response = https.getString();

  Serial.print("[TELEGRAM] HTTP Code: ");
  Serial.println(httpCode);
  Serial.print("[TELEGRAM] Response: ");
  Serial.println(response);

  https.end();

  return httpCode == 200;
}

/********************************************************
 * URL ENCODE UNTUK TELEGRAM
 ********************************************************/
String urlEncode(String str) {
  String encoded = "";

  for (int i = 0; i < str.length(); i++) {
    char c = str.charAt(i);

    if (isalnum(c)) {
      encoded += c;
    } else if (c == ' ') {
      encoded += "%20";
    } else if (c == '\n') {
      encoded += "%0A";
    } else if (c == ':') {
      encoded += "%3A";
    } else if (c == '%') {
      encoded += "%25";
    } else if (c == '/') {
      encoded += "%2F";
    } else {
      char hex[4];
      sprintf(hex, "%%%02X", c);
      encoded += hex;
    }
  }

  return encoded;
}

/********************************************************
 * PROSES KIRIM DATA
 ********************************************************/
void sendSoilData() {
  int adcValue = readSoilAverage();
  int moisture = convertToMoisturePercent(adcValue);

  String status = getStatus(moisture);
  String recommendation = getRecommendation(moisture);
  String timestamp = getTimestamp();

  String jsonData = createJson(moisture, adcValue, status, recommendation, timestamp);

  Serial.println("====================================");
  Serial.println("DATA SOILCARE CABAI");
  Serial.print("ADC Raw      : ");
  Serial.println(adcValue);
  Serial.print("Kelembapan   : ");
  Serial.print(moisture);
  Serial.println("%");
  Serial.print("Status       : ");
  Serial.println(status);
  Serial.print("Rekomendasi  : ");
  Serial.println(recommendation);
  Serial.print("Timestamp    : ");
  Serial.println(timestamp);
  Serial.println("JSON         : " + jsonData);

  bool latestOk = sendFirebaseLatest(jsonData);
  bool readingOk = sendFirebaseReading(jsonData);

  if (latestOk && readingOk) {
    Serial.println("[FIREBASE] Data berhasil dikirim.");

    if (status != lastStatus) {
      String pesan = "Update SoilCare Cabai\n";
      pesan += "Kelembapan: " + String(moisture) + "%\n";
      pesan += "Status: " + status + "\n";
      pesan += "Rekomendasi: " + recommendation + "\n";
      pesan += "Waktu: " + timestamp + "\n";
      pesan += "Firebase: data berhasil tersimpan";

      sendTelegram(pesan);
      lastStatus = status;
    }
  } else {
    Serial.println("[FIREBASE] Data gagal dikirim.");

    String pesanError = "Peringatan SoilCare Cabai\n";
    pesanError += "Data gagal dikirim ke Firebase.\n";
    pesanError += "Kelembapan: " + String(moisture) + "%\n";
    pesanError += "Status: " + status;

    sendTelegram(pesanError);
  }

  Serial.println("====================================");
  Serial.println();
}

/********************************************************
 * SETUP
 ********************************************************/
void setup() {
  Serial.begin(9600);
  delay(5000);

  pinMode(soilPin, INPUT);

  analogReadResolution(12);
  analogSetPinAttenuation(soilPin, ADC_11db);

  Serial.println();
  Serial.println("====================================");
  Serial.println("SOILCARE CABAI");
  Serial.println("ESP32 + Soil Moisture + Firebase + Telegram");
  Serial.println("====================================");

  connectWiFi();
  setupTime();

  sendTelegram("SoilCare Cabai ONLINE\nESP32 berhasil terhubung ke WiFi.");

  // Kirim data pertama langsung saat ESP32 menyala
  sendSoilData();

  lastSendTime = millis();
}

/********************************************************
 * LOOP
 ********************************************************/
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  unsigned long currentMillis = millis();

  if (currentMillis - lastSendTime >= sendInterval) {
    lastSendTime = currentMillis;
    sendSoilData();
  }
}