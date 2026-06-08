#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "NAMA_WIFI";
const char* password = "PASSWORD_WIFI";
const char* serverUrl = "http://ALAMAT_IP_LAPTOP:5000/api/moisture";

const char* deviceId = "ESP32-CABAI-01";
const int soilPin = 34;

// Sesuaikan nilai ini dari hasil kalibrasi sensor masing-masing.
int dryValue = 4095;
int wetValue = 1200;

unsigned long previousMillis = 0;
const long interval = 60000;

void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  Serial.println("Menghubungkan ke WiFi...");

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi terhubung");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    int sensorValue = analogRead(soilPin);
    int moisturePercent = map(sensorValue, dryValue, wetValue, 0, 100);
    moisturePercent = constrain(moisturePercent, 0, 100);

    Serial.print("Nilai Sensor: ");
    Serial.println(sensorValue);
    Serial.print("Kelembapan: ");
    Serial.print(moisturePercent);
    Serial.println("%");

    sendDataToServer(sensorValue, moisturePercent);
  }
}

void sendDataToServer(int adcValue, int moisture) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi tidak terhubung");
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String jsonData = "{\"device_id\":\"";
  jsonData += deviceId;
  jsonData += "\",\"adc_value\":";
  jsonData += adcValue;
  jsonData += ",\"moisture\":";
  jsonData += moisture;
  jsonData += "}";

  int httpResponseCode = http.POST(jsonData);

  Serial.print("HTTP Response code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println(response);
  }

  http.end();
}
