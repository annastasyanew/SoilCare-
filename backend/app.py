from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

from firebase_config import (
    firebase_is_ready,
    get_latest_data,
    get_readings_data,
    save_to_firebase,
)

app = Flask(__name__)
CORS(app)


def get_status_and_recommendation(moisture):
    if moisture <= 30:
        return "Kering", "Siram tanaman secara manual"

    if moisture <= 70:
        return "Normal", "Tidak perlu menyiram"

    return "Terlalu basah", "Hentikan penyiraman sementara"


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "SoilCare Cabai API aktif",
        "firebase_ready": firebase_is_ready(),
        "endpoints": [
            "POST /api/moisture",
            "GET /api/latest",
            "GET /api/readings"
        ]
    })


@app.route("/api/moisture", methods=["POST"])
def receive_moisture():
    try:
        data = request.get_json(silent=True)

        if not data or "moisture" not in data:
            return jsonify({
                "success": False,
                "message": "Field moisture wajib dikirim"
            }), 400

        moisture = float(data["moisture"])

        if moisture < 0 or moisture > 100:
            return jsonify({
                "success": False,
                "message": "Nilai moisture harus berada pada rentang 0 sampai 100"
            }), 400

        status, recommendation = get_status_and_recommendation(moisture)
        adc_value = (
            data.get("adc_value")
            or data.get("adc")
            or data.get("adcValue")
            or data.get("sensorValue")
        )
        saved_data = {
            "device_id": data.get("device_id", "ESP32-CABAI-01"),
            "adc_value": adc_value,
            "moisture": moisture,
            "status": status,
            "recommendation": recommendation,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        save_to_firebase(saved_data)

        return jsonify({
            "success": True,
            "message": "Data berhasil disimpan",
            "firebase_ready": firebase_is_ready(),
            "data": saved_data
        })
    except Exception as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


@app.route("/api/latest", methods=["GET"])
def latest():
    data = get_latest_data()
    return jsonify(data or {})


@app.route("/api/readings", methods=["GET"])
def readings():
    data = get_readings_data()
    return jsonify(data or {})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
