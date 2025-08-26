from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from wav_to_vibration import convert_wav_to_adaptive_vibration as convert

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return '🟢 Serveur Flask actif ! Essayez POST /api/convert'

@app.route('/api/convert', methods=['POST'])
def convert_api():
    print("📥 Requête reçue depuis :", request.remote_addr)
    print("🔍 Fichiers présents :", request.files)

    file = request.files.get('file')
    if not file:
        print("⚠️ Aucun fichier reçu")
        return jsonify({"error": "Pas de fichier reçu"}), 400

    filepath = "temp.wav"
    file.save(filepath)

    try:
        # On lance la conversion, Android + .ahap
        result = convert(filepath, segment_ms=20, ahap_mode=True)
    except Exception as e:
        # Si la conversion Android plante vraiment (rare !)
        print("Erreur lors de la conversion Android :", e)
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            os.remove(filepath)
        except Exception as e:
            print("⚠️ Erreur suppression fichier temporaire :", e)

    # Renvoie toujours le résultat (pattern, amplitude, et ahap ou erreur ahap)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
