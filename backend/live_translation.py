import os
import tempfile
import subprocess
import wave

import numpy as np
import librosa
import torch

from fastapi import WebSocket, WebSocketDisconnect
from transformers import (
    AutoProcessor,
    AutoModelForSpeechSeq2Seq,
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
)

from IndicTransToolkit.processor import IndicProcessor
from parler_tts import ParlerTTSForConditionalGeneration


# ============================================================
# DEVICE
# ============================================================

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print("=" * 60)
print("LIVE TRANSLATION MODULE")
print("=" * 60)
print(f"Device: {DEVICE}")

if DEVICE == "cuda":
    print(f"GPU: {torch.cuda.get_device_name(0)}")


# ============================================================
# MODELS
# ============================================================

WHISPER_MODEL_NAME = "openai/whisper-base"

HINDI_MODEL_NAME = (
    "ai4bharat/indictrans2-indic-indic-dist-320M"
)

ENGLISH_MODEL_NAME = (
    "ai4bharat/indictrans2-en-indic-dist-200M"
)

TTS_MODEL_NAME = (
    "ai4bharat/indic-parler-tts"
)


# ============================================================
# MODEL VARIABLES
# ============================================================

whisper_processor = None
whisper_model = None

hindi_tokenizer = None
hindi_model = None
hindi_processor = None

english_tokenizer = None
english_model = None
english_processor = None

tts_model = None
tts_tokenizer = None
tts_description_tokenizer = None


# ============================================================
# WHISPER
# ============================================================

def load_whisper():

    global whisper_processor
    global whisper_model

    if whisper_model is not None:
        return

    print("=" * 60)
    print("Loading Whisper...")
    print("=" * 60)

    whisper_processor = AutoProcessor.from_pretrained(
        WHISPER_MODEL_NAME
    )

    whisper_model = AutoModelForSpeechSeq2Seq.from_pretrained(
        WHISPER_MODEL_NAME,
        torch_dtype=(
            torch.float16
            if DEVICE == "cuda"
            else torch.float32
        ),
    ).to(DEVICE)

    whisper_model.eval()

    print("Whisper loaded successfully!")


# ============================================================
# INDIC TRANS 2
# ============================================================

def load_translation_model(source_language):

    global hindi_tokenizer
    global hindi_model
    global hindi_processor

    global english_tokenizer
    global english_model
    global english_processor

    if source_language == "hindi":

        if hindi_model is not None:
            return

        print("=" * 60)
        print("Loading Hindi → Santali model...")
        print("=" * 60)

        hindi_tokenizer = AutoTokenizer.from_pretrained(
            HINDI_MODEL_NAME,
            trust_remote_code=True,
        )

        hindi_model = AutoModelForSeq2SeqLM.from_pretrained(
            HINDI_MODEL_NAME,
            trust_remote_code=True,
            torch_dtype=(
                torch.float16
                if DEVICE == "cuda"
                else torch.float32
            ),
        ).to(DEVICE)

        hindi_processor = IndicProcessor(
            inference=True
        )

        hindi_model.eval()

        print(
            "Hindi → Santali model loaded successfully!"
        )

    else:

        if english_model is not None:
            return

        print("=" * 60)
        print("Loading English → Santali model...")
        print("=" * 60)

        english_tokenizer = AutoTokenizer.from_pretrained(
            ENGLISH_MODEL_NAME,
            trust_remote_code=True,
        )

        english_model = AutoModelForSeq2SeqLM.from_pretrained(
            ENGLISH_MODEL_NAME,
            trust_remote_code=True,
            torch_dtype=(
                torch.float16
                if DEVICE == "cuda"
                else torch.float32
            ),
        ).to(DEVICE)

        english_processor = IndicProcessor(
            inference=True
        )

        english_model.eval()

        print(
            "English → Santali model loaded successfully!"
        )


# ============================================================
# PARLER TTS
# ============================================================

def load_tts():

    global tts_model
    global tts_tokenizer
    global tts_description_tokenizer

    if tts_model is not None:
        return

    print("=" * 60)
    print("Loading Indic Parler-TTS...")
    print("=" * 60)

    tts_model = (
        ParlerTTSForConditionalGeneration
        .from_pretrained(
            TTS_MODEL_NAME,
            torch_dtype=(
                torch.float16
                if DEVICE == "cuda"
                else torch.float32
            ),
        )
        .to(DEVICE)
    )

    tts_tokenizer = AutoTokenizer.from_pretrained(
        TTS_MODEL_NAME
    )

    tts_description_tokenizer = (
        AutoTokenizer.from_pretrained(
            tts_model.config.text_encoder._name_or_path
        )
    )

    tts_model.eval()

    print("Indic Parler-TTS loaded successfully!")


# ============================================================
# SPEECH TO TEXT
# ============================================================

def speech_to_text(audio):

    load_whisper()

    inputs = whisper_processor(
        audio,
        sampling_rate=16000,
        return_tensors="pt",
    )

    input_features = inputs.input_features.to(
        DEVICE
    )

    if DEVICE == "cuda":
        input_features = input_features.half()

    with torch.no_grad():

        generated_ids = whisper_model.generate(
            input_features,
            num_beams=3,
            max_new_tokens=128,
            no_repeat_ngram_size=3,
        )

    text = whisper_processor.batch_decode(
        generated_ids,
        skip_special_tokens=True,
    )[0].strip()

    return text


# ============================================================
# TRANSLATION
# ============================================================

def translate_to_santali(
    text,
    source_language,
):

    load_translation_model(source_language)

    target_language = "sat_Olck"

    if source_language == "hindi":

        tokenizer = hindi_tokenizer
        model = hindi_model
        processor = hindi_processor

        source_code = "hin_Deva"

    else:

        tokenizer = english_tokenizer
        model = english_model
        processor = english_processor

        source_code = "eng_Latn"

    batch = processor.preprocess_batch(
        [text],
        src_lang=source_code,
        tgt_lang=target_language,
    )

    inputs = tokenizer(
        batch,
        padding=True,
        truncation=True,
        return_tensors="pt",
    )

    inputs = {
        key: value.to(DEVICE)
        for key, value in inputs.items()
    }

    with torch.no_grad():

        generated_tokens = model.generate(
            **inputs,
            max_new_tokens=128,
            num_beams=3,
        )

    decoded = tokenizer.batch_decode(
        generated_tokens,
        skip_special_tokens=True,
    )

    translated = processor.postprocess_batch(
        decoded,
        lang=target_language,
    )

    return translated[0].strip()


# ============================================================
# TEXT TO SPEECH
# ============================================================

def santali_text_to_speech(text):

    load_tts()

    description = (
        "A clear speaker delivers Santali speech "
        "at a moderate speed with natural pronunciation "
        "and high audio quality."
    )

    description_inputs = tts_description_tokenizer(
        description,
        return_tensors="pt",
    )

    prompt_inputs = tts_tokenizer(
        text,
        return_tensors="pt",
    )

    description_input_ids = (
        description_inputs.input_ids.to(DEVICE)
    )

    description_attention_mask = (
        description_inputs.attention_mask.to(DEVICE)
    )

    prompt_input_ids = (
        prompt_inputs.input_ids.to(DEVICE)
    )

    prompt_attention_mask = (
        prompt_inputs.attention_mask.to(DEVICE)
    )

    with torch.no_grad():

        generation = tts_model.generate(
            input_ids=description_input_ids,
            attention_mask=description_attention_mask,
            prompt_input_ids=prompt_input_ids,
            prompt_attention_mask=prompt_attention_mask,
        )

    audio_arr = (
        generation
        .cpu()
        .numpy()
        .squeeze()
        .astype("float32")
    )

    sample_rate = tts_model.config.sampling_rate

    temp_wav = tempfile.NamedTemporaryFile(
        suffix=".wav",
        delete=False,
    )

    temp_wav.close()

    try:

        with wave.open(
            temp_wav.name,
            "wb",
        ) as wav_file:

            wav_file.setnchannels(1)

            wav_file.setsampwidth(2)

            wav_file.setframerate(
                sample_rate
            )

            audio_int16 = np.clip(
                audio_arr,
                -1,
                1,
            )

            audio_int16 = (
                audio_int16 * 32767
            ).astype(np.int16)

            wav_file.writeframes(
                audio_int16.tobytes()
            )

        with open(
            temp_wav.name,
            "rb",
        ) as f:

            return f.read()

    finally:

        try:
            os.unlink(temp_wav.name)
        except Exception:
            pass


# ============================================================
# PROCESS ONE LIVE AUDIO CHUNK
# ============================================================

async def process_live_audio(
    audio_bytes,
    source_language,
):

    webm_path = None
    wav_path = None

    try:

        # ----------------------------------------------------
        # SAVE WEBM
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(
            suffix=".webm",
            delete=False,
        ) as temp:

            temp.write(audio_bytes)
            webm_path = temp.name

        # ----------------------------------------------------
        # CONVERT WEBM → WAV
        # ----------------------------------------------------

        wav_file = tempfile.NamedTemporaryFile(
            suffix=".wav",
            delete=False,
        )

        wav_file.close()

        wav_path = wav_file.name

        command = [
            "ffmpeg",
            "-y",
            "-i",
            webm_path,
            "-ar",
            "16000",
            "-ac",
            "1",
            wav_path,
        ]

        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        if result.returncode != 0:

            error = result.stderr.decode(
                errors="ignore"
            )

            print(
                "FFmpeg error:",
                error,
            )

            return {
                "transcript": "",
                "translation": "",
                "audio": None,
            }

        # ----------------------------------------------------
        # LOAD AUDIO
        # ----------------------------------------------------

        audio, sr = librosa.load(
            wav_path,
            sr=16000,
            mono=True,
        )

        # ----------------------------------------------------
        # SILENCE DETECTION
        # ----------------------------------------------------

        if len(audio) == 0:

            print(
                "LIVE AUDIO: empty audio"
            )

            return {
                "transcript": "",
                "translation": "",
                "audio": None,
            }

        rms = float(
            np.sqrt(
                np.mean(
                    audio ** 2
                )
            )
        )

        print(
            f"Live audio RMS: {rms:.6f}"
        )

        SILENCE_THRESHOLD = 0.008

        if rms < SILENCE_THRESHOLD:

            print(
                "LIVE AUDIO: silence detected - skipping Whisper"
            )

            return {
                "transcript": "",
                "translation": "",
                "audio": None,
            }

        # ----------------------------------------------------
        # WHISPER
        # ----------------------------------------------------

        print("=" * 60)
        print("LIVE AUDIO CHUNK")
        print("=" * 60)

        print("Running Whisper...")

        transcript = speech_to_text(
            audio
        )

        print(
            "LIVE TRANSCRIPT:",
            transcript,
        )

        # ----------------------------------------------------
        # EMPTY / HALLUCINATION CHECK
        # ----------------------------------------------------

        if not transcript:

            return {
                "transcript": "",
                "translation": "",
                "audio": None,
            }

        hallucinations = [
            "i don't know",
            "i don't know.",
            "thank you",
            "thanks for watching",
        ]

        lower_text = transcript.lower().strip()

        if lower_text in hallucinations:

            print(
                "Possible Whisper hallucination - ignored"
            )

            return {
                "transcript": "",
                "translation": "",
                "audio": None,
            }

        # ----------------------------------------------------
        # TRANSLATION
        # ----------------------------------------------------

        print("Translating...")

        translation = translate_to_santali(
            transcript,
            source_language,
        )

        print(
            "LIVE SANTALI:",
            translation,
        )

        if not translation:

            return {
                "transcript": transcript,
                "translation": "",
                "audio": None,
            }

        # ----------------------------------------------------
        # TTS
        # ----------------------------------------------------

        print(
            "Generating Santali speech..."
        )

        audio_response = (
            santali_text_to_speech(
                translation
            )
        )

        print(
            "Santali speech generated."
        )

        return {
            "transcript": transcript,
            "translation": translation,
            "audio": audio_response,
        }

    except Exception as e:

        print(
            "Live chunk error:",
            str(e),
        )

        return {
            "transcript": "",
            "translation": "",
            "audio": None,
        }

    finally:

        if webm_path:

            try:
                os.unlink(webm_path)
            except Exception:
                pass

        if wav_path:

            try:
                os.unlink(wav_path)
            except Exception:
                pass


# ============================================================
# WEBSOCKET
# ============================================================

async def live_translation_websocket(
    websocket: WebSocket,
):

    await websocket.accept()

    source_language = (
        websocket.query_params
        .get(
            "source_language",
            "hindi",
        )
        .lower()
    )

    if source_language not in [
        "hindi",
        "english",
    ]:

        source_language = "hindi"

    print("=" * 60)
    print("LIVE TRANSLATION SESSION STARTED")
    print(
        f"Source language: {source_language}"
    )
    print("=" * 60)

    await websocket.send_json(
        {
            "type": "ready",
            "message": (
                "Live translation ready"
            ),
            "source_language": source_language,
            "target_language": "Santali",
            "target_script": "Ol Chiki",
        }
    )

    try:

        while True:

            message = (
                await websocket.receive()
            )

            if (
                message.get("type")
                == "websocket.disconnect"
            ):

                break

            audio_bytes = message.get(
                "bytes"
            )

            if not audio_bytes:
                continue

            print(
                f"Received live audio: "
                f"{len(audio_bytes)} bytes"
            )

            result = (
                await process_live_audio(
                    audio_bytes,
                    source_language,
                )
            )

            # ------------------------------------------------
            # NO SPEECH
            # ------------------------------------------------

            if not result["transcript"]:

                await websocket.send_json(
                    {
                        "type": "no_speech",
                        "message": (
                            "No speech detected"
                        ),
                    }
                )

                continue

            # ------------------------------------------------
            # TRANSLATION RESULT
            # ------------------------------------------------

            await websocket.send_json(
                {
                    "type": "translation",
                    "transcript": (
                        result["transcript"]
                    ),
                    "translation": (
                        result["translation"]
                    ),
                    "target_language": "Santali",
                    "target_script": "Ol Chiki",
                }
            )

            # ------------------------------------------------
            # TTS AUDIO
            # ------------------------------------------------

            if result["audio"]:

                await websocket.send_bytes(
                    result["audio"]
                )

    except WebSocketDisconnect:

        print(
            "Live WebSocket disconnected."
        )

    except Exception as e:

        print(
            "Live WebSocket error:",
            str(e),
        )

        try:

            await websocket.send_json(
                {
                    "type": "error",
                    "message": str(e),
                }
            )

        except Exception:
            pass

    finally:

        print(
            "Live translation session ended."
        )
