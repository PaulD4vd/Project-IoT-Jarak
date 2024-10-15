#include <WiFi.h>
#include <HTTPClient.h>
#include <Arduino.h>

#define TRIG_PIN 22  // Pin trigger
#define ECHO_PIN 21  // Pin echo

// WiFi credentials
const char* ssid = "Alona2";         // Ganti dengan SSID Wi-Fi Anda
const char* password ="manggolo";   // Ganti dengan password Wi-Fi Anda

// InfluxDB credentials
const char* influxdb_server = "http://103.210.35.189:8086"; // Alamat InfluxDB Anda
const char* influxdb_bucket = "sensorcoba";                 // Nama bucket InfluxDB Anda
const char* influxdb_org = "e1751da18330c349";                      // Ganti dengan organisasi Anda di InfluxDB
const char* influxdb_token = "EWrX0FCW3vOH3ZK1fB3m_zfBA4dgXJ8NYYlqsv3ySJEhyrzun2BM4tRnd-A_SiH6cDQb33IywcCjSvCFU1Nd0A==";                  // Ganti dengan API token dari InfluxDB

WiFiClient client;

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print("mencoba terhubung \n");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void sendToInfluxDB(float distance) {
  if(WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    // InfluxDB write endpoint
    String url = String(influxdb_server) + "/api/v2/write?org=" + influxdb_org + "&bucket=" + influxdb_bucket + "&precision=s";

    // Membentuk line protocol (data format untuk InfluxDB)
    String postData = "ultrasonic,distance_unit=cm value=" + String(distance);

    // Buat request HTTP POST
    http.begin(client, url);
    http.addHeader("Content-Type", "text/plain");
    http.addHeader("Authorization", String("Token ") + influxdb_token);

    // Kirim data ke InfluxDB
    int httpResponseCode = http.POST(postData);

    if (httpResponseCode > 0) {
      Serial.print("Data sent to InfluxDB. HTTP Response code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error sending data. HTTP Response code: ");
      Serial.println(httpResponseCode);
    }

    // Tutup koneksi
    http.end();
  } else {
    Serial.println("WiFi not connected.");
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  setup_wifi();
}

void loop() {
  // Mengukur jarak dengan sensor ultrasonik
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH);
  float distance = duration * 0.034 / 2; // Menghitung jarak

  // Print jarak ke Serial
  Serial.print("Distance = ");
  Serial.print(distance);
  Serial.println(" cm");

  // Kirim data jarak ke InfluxDB
  sendToInfluxDB(distance);

  delay(1000); // Delay 1 detik untuk mengirim data berikutnya
}
