import numpy as np
import scipy.io.wavfile as wav
import json
import traceback

def convert_wav_to_adaptive_vibration(wav_path, segment_ms=5, ahap_mode=False):
    # --- Génération Android ---
    try:
        rate, data = wav.read(wav_path)

        if len(data.shape) == 2:
            data = data[:, 0]  # mono uniquement

        # Normalisation
        data = data / np.max(np.abs(data))  # signal entre -1 et 1

        segment_samples = int(rate * segment_ms / 1000)

        energies = []
        for i in range(0, len(data), segment_samples):
            segment = data[i:i+segment_samples]
            energy = np.abs(segment).mean()
            energies.append(energy)

        max_energy = max(energies)
        mean_energy = np.mean(energies)

        low_threshold = mean_energy * 0.8

        pattern = []
        amplitude = []

        is_vibrating = False
        current_duration = 0
        current_amplitude = 0

        # Pour .ahap (si demandé)
        ahap_events = []
        ahap_duration_total = 0
        event_start_time = 0

        for idx, energy in enumerate(energies):
            amp = float(np.clip(energy / max_energy, 0, 1)) if max_energy > 0 else 0
            if energy > low_threshold:
                # Vibration
                if is_vibrating:
                    current_duration += segment_ms
                    current_amplitude = (current_amplitude + amp) / 2
                else:
                    if current_duration > 0:
                        pattern.append(current_duration)
                        amplitude.append(0)
                        ahap_duration_total += current_duration / 1000
                    current_duration = segment_ms
                    current_amplitude = amp
                    is_vibrating = True
                    event_start_time = ahap_duration_total
            else:
                # Pause
                if is_vibrating:
                    pattern.append(current_duration)
                    amplitude.append(int(current_amplitude * 255))
                    # Ajoute event dans ahap si demandé
                    if ahap_mode:
                        ahap_events.append({
                            "Time": round(event_start_time, 3),
                            "EventType": "HapticContinuous",
                            "EventDuration": round(current_duration / 1000, 3),
                            "EventParameters": [
                                {"ParameterID": "HapticIntensity", "ParameterValue": round(current_amplitude, 2)},
                                {"ParameterID": "HapticSharpness", "ParameterValue": 0.5}
                            ]
                        })
                    ahap_duration_total += current_duration / 1000
                    current_duration = segment_ms
                    current_amplitude = 0
                    is_vibrating = False
                else:
                    current_duration += segment_ms

        # Dernier segment
        if current_duration > 0:
            pattern.append(current_duration)
            amplitude.append(int(current_amplitude * 255 if is_vibrating else 0))
            if is_vibrating and ahap_mode:
                ahap_events.append({
                    "Time": round(event_start_time, 3),
                    "EventType": "HapticContinuous",
                    "EventDuration": round(current_duration / 1000, 3),
                    "EventParameters": [
                        {"ParameterID": "HapticIntensity", "ParameterValue": round(current_amplitude, 2)},
                        {"ParameterID": "HapticSharpness", "ParameterValue": 0.5}
                    ]
                })

        if pattern and pattern[0] != 0:
            pattern = [0] + pattern
            amplitude = [0] + amplitude

        result = {
            "pattern": pattern,
            "amplitude": amplitude
        }
    except Exception as e:
        print("Erreur Android :", e)
        print(traceback.format_exc())
        return {"error": f"Erreur Android : {str(e)}"}

    # --- Génération .ahap (sécurisée) ---
    if ahap_mode:
        try:
            ahap = {
                "Version": 1,
                "Pattern": [
                    {"Event": event} for event in ahap_events
                ]
            }
            result["ahap"] = ahap
        except Exception as e:
            print("Erreur .ahap :", e)
            print(traceback.format_exc())
            result["ahap_error"] = f"Erreur à la génération .ahap : {str(e)}"

    return result
