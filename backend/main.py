# ============================================================
# EchoBridge Backend
# AI-assisted Multilingual Education System
# ============================================================

import os
import io
import html
import shutil
import subprocess
import tempfile

import torch
import librosa
import soundfile as sf

from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    Header,
)
from live_translation import live_translation_websocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import User, Lesson, get_db
from auth import (
    register_user,
    login_user,
    create_access_token,
    decode_access_token,
)
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    AutoProcessor,
    AutoModelForSpeechSeq2Seq,
)

from IndicTransToolkit.processor import IndicProcessor

from parler_tts import ParlerTTSForConditionalGeneration

from pypdf import PdfReader


# ============================================================
# DEVICE / GPU
# ============================================================

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print("=" * 60)
print("EchoBridge Backend")
print("=" * 60)

print(f"PyTorch: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

if DEVICE == "cuda":
    print(
        f"GPU: {torch.cuda.get_device_name(0)}"
    )

print(f"Device: {DEVICE}")

print("=" * 60)


# ============================================================
# OL CHIKI FONT
# ============================================================

OL_CHIKI_FONT = (
    "/usr/share/fonts/truetype/noto/"
    "NotoSansOlChiki-Regular.ttf"
)

OL_CHIKI_BOLD_FONT = (
    "/usr/share/fonts/truetype/noto/"
    "NotoSansOlChiki-Bold.ttf"
)

if os.path.exists(OL_CHIKI_FONT):

    print(
        "Ol Chiki regular font found!"
    )

else:

    print(
        "WARNING: Ol Chiki regular font not found!"
    )


if os.path.exists(OL_CHIKI_BOLD_FONT):

    print(
        "Ol Chiki bold font found!"
    )

else:

    print(
        "WARNING: Ol Chiki bold font not found!"
    )


# ============================================================
# CHROMIUM
# ============================================================

CHROMIUM_PATH = (
    shutil.which("chromium")
    or shutil.which("chromium-browser")
    or "/snap/bin/chromium"
)

if os.path.exists(CHROMIUM_PATH):

    print(
        f"Chromium found: {CHROMIUM_PATH}"
    )

else:

    print(
        "WARNING: Chromium not found!"
    )


# ============================================================
# MODEL NAMES
# ============================================================

HINDI_MODEL_NAME = (
    "ai4bharat/indictrans2-indic-indic-dist-320M"
)

ENGLISH_MODEL_NAME = (
    "ai4bharat/indictrans2-en-indic-dist-200M"
)

TARGET_LANGUAGE = "sat_Olck"

WHISPER_MODEL_NAME = "openai/whisper-base"

TTS_MODEL_NAME = "ai4bharat/indic-parler-tts"


# ============================================================
# TRANSLATION MODEL LOADER
# ============================================================

def load_model(model_name):

    print("=" * 60)

    print(
        f"Loading model: {model_name}"
    )

    print(
        f"Device: {DEVICE}"
    )

    print("=" * 60)

    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=True,
        token=os.getenv("HF_TOKEN")
    )
    model = AutoModelForSeq2SeqLM.from_pretrained(

        model_name,

        trust_remote_code=True,
        token=os.getenv("HF_TOKEN"),

        torch_dtype=(

            torch.float16

            if DEVICE == "cuda"

            else torch.float32
        )

    ).to(DEVICE)

    model.eval()

    print(
        f"Loaded: {model_name}"
    )

    return tokenizer, model


# ============================================================
# HINDI → SANTALI
# ============================================================

print("=" * 60)
print("Loading Hindi → Santali model...")
print("=" * 60)

hindi_tokenizer, hindi_model = load_model(
    HINDI_MODEL_NAME
)

processor = IndicProcessor(
    inference=True
)

print(
    "Hindi → Santali model loaded successfully!"
)


# ============================================================
# ENGLISH → SANTALI
# ============================================================

english_tokenizer = None
english_model = None


def load_english_model_if_needed():

    global english_tokenizer
    global english_model

    if english_model is not None:

        return

    print("=" * 60)

    print(
        "Loading English → Santali model..."
    )

    print("=" * 60)

    english_tokenizer, english_model = load_model(
        ENGLISH_MODEL_NAME
    )

    print(
        "English → Santali model loaded successfully!"
    )


# ============================================================
# WHISPER
# ============================================================

speech_processor = None
speech_model = None


def load_speech_model_if_needed():

    global speech_processor
    global speech_model

    if speech_model is not None:

        return

    print("=" * 60)

    print(
        "Loading Whisper speech-to-text model..."
    )

    print("=" * 60)

    speech_processor = AutoProcessor.from_pretrained(

        WHISPER_MODEL_NAME
    )

    speech_model = AutoModelForSpeechSeq2Seq.from_pretrained(

        WHISPER_MODEL_NAME,

        torch_dtype=(

            torch.float16

            if DEVICE == "cuda"

            else torch.float32
        )

    ).to(DEVICE)

    speech_model.eval()

    print(
        f"Whisper device: {DEVICE}"
    )

    print(
        "Whisper speech-to-text model loaded!"
    )


# ============================================================
# PARLER TTS
# ============================================================

tts_model = None
tts_tokenizer = None
tts_description_tokenizer = None


def load_tts_model_if_needed():

    global tts_model
    global tts_tokenizer
    global tts_description_tokenizer

    if tts_model is not None:

        return

    print("=" * 60)

    print(
        "Loading Indic Parler-TTS..."
    )

    print("=" * 60)

    tts_model = (
        ParlerTTSForConditionalGeneration
        .from_pretrained(

            TTS_MODEL_NAME,

            torch_dtype=(

                torch.float16

                if DEVICE == "cuda"

                else torch.float32
            )
        )
        .to(DEVICE)
    )

    tts_tokenizer = AutoTokenizer.from_pretrained(

        TTS_MODEL_NAME
    )

    tts_description_tokenizer = (
        AutoTokenizer.from_pretrained(

            tts_model
            .config
            .text_encoder
            ._name_or_path
        )
    )

    tts_model.eval()

    print(
        f"TTS device: {DEVICE}"
    )

    print(
        "Indic Parler-TTS loaded successfully!"
    )


# ============================================================
# FASTAPI APPLICATION
# ============================================================
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str

app = FastAPI(

    title="EchoBridge API",

    description=(
        "AI-assisted multilingual "
        "education system"
    ),

    version="0.6.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://localhost:5173",

        "http://localhost:5174",
        "http://localhost:4173",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class TranslationRequest(BaseModel):

    text: str

    source_language: str = "hindi"


# ============================================================
# TEXT TRANSLATION
# ============================================================

def translate_text(
    text,
    source_language
):

    source_language = (
        source_language.lower()
    )

    # --------------------------------------------------------
    # Hindi
    # --------------------------------------------------------

    if source_language == "hindi":

        tokenizer = hindi_tokenizer

        model = hindi_model

        src_lang = "hin_Deva"

    # --------------------------------------------------------
    # English
    # --------------------------------------------------------

    elif source_language == "english":

        load_english_model_if_needed()

        tokenizer = english_tokenizer

        model = english_model

        src_lang = "eng_Latn"

    else:

        raise HTTPException(

            status_code=400,

            detail=(
                "Unsupported source language. "
                "Use hindi or english."
            )
        )

    # --------------------------------------------------------
    # Preprocess
    # --------------------------------------------------------

    batch = processor.preprocess_batch(

        [text],

        src_lang=src_lang,

        tgt_lang=TARGET_LANGUAGE
    )

    # --------------------------------------------------------
    # Tokenize
    # --------------------------------------------------------

    inputs = tokenizer(

        batch,

        truncation=True,

        padding="longest",

        return_tensors="pt",

        return_attention_mask=True

    ).to(DEVICE)

    # --------------------------------------------------------
    # Generate
    # --------------------------------------------------------

    with torch.no_grad():

        generated_tokens = model.generate(

            **inputs,

            use_cache=True,

            min_length=0,

            max_length=256,

            num_beams=5,

            num_return_sequences=1
        )

    # --------------------------------------------------------
    # Decode
    # --------------------------------------------------------

    generated_tokens = tokenizer.batch_decode(

        generated_tokens,

        skip_special_tokens=True,

        clean_up_tokenization_spaces=True
    )

    # --------------------------------------------------------
    # Postprocess
    # --------------------------------------------------------

    translations = processor.postprocess_batch(

        generated_tokens,

        lang=TARGET_LANGUAGE
    )

    return translations[0]


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {

        "message":
            "EchoBridge Backend is running!"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():

    return {

        "status": "ok",

        "service": "EchoBridge API",

        "device": DEVICE,

        "gpu": (

            torch.cuda.get_device_name(0)

            if DEVICE == "cuda"

            else None
        ),

        "version": "0.6.0"
    }


# ============================================================
# TRANSLATE TEXT
# ============================================================

@app.post("/api/translate")
def translate(

    request: TranslationRequest

):

    if not request.text.strip():

        raise HTTPException(

            status_code=400,

            detail="Text cannot be empty"
        )

    source_language = (
        request.source_language.lower()
    )

    translation = translate_text(

        request.text,

        source_language
    )

    language_names = {

        "hindi": "Hindi",

        "english": "English",

        "hinglish": "Hinglish"
    }

    return {

        "source_language":
            language_names.get(

                source_language,

                source_language
            ),

        "target_language":
            "Santali",

        "target_script":
            "Ol Chiki",

        "input":
            request.text,

        "translation":
            translation,

        "device":
            DEVICE
    }


# ============================================================
# SPEECH → TEXT
# ============================================================

@app.post("/api/speech-to-text")
async def speech_to_text(

    audio: UploadFile = File(...),

    source_language: str = "hindi"

):

    if not audio:

        raise HTTPException(

            status_code=400,

            detail="Audio file is required"
        )

    source_language = (
        source_language.lower()
    )

    if source_language == "english":

        whisper_language = "english"

    else:

        whisper_language = "hindi"

    print("=" * 60)

    print(
        "Speech recognition request"
    )

    print(
        f"Source language: {source_language}"
    )

    print("=" * 60)

    load_speech_model_if_needed()

    input_path = None
    wav_path = None

    try:

        # ----------------------------------------------------
        # Save uploaded WebM
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(

            delete=False,

            suffix=".webm"

        ) as input_file:

            input_path = input_file.name

            content = await audio.read()

            input_file.write(content)

        # ----------------------------------------------------
        # Temporary WAV
        # ----------------------------------------------------

        wav_file = tempfile.NamedTemporaryFile(

            delete=False,

            suffix=".wav"
        )

        wav_path = wav_file.name

        wav_file.close()

        # ----------------------------------------------------
        # FFmpeg
        # ----------------------------------------------------

        subprocess.run(

            [

                "ffmpeg",

                "-y",

                "-i",

                input_path,

                "-ar",

                "16000",

                "-ac",

                "1",

                wav_path
            ],

            check=True,

            stdout=subprocess.DEVNULL,

            stderr=subprocess.DEVNULL
        )

        # ----------------------------------------------------
        # Load audio
        # ----------------------------------------------------

        audio_array, sampling_rate = (

            librosa.load(

                wav_path,

                sr=16000,

                mono=True
            )
        )

        # ----------------------------------------------------
        # Whisper processor
        # ----------------------------------------------------

        inputs = speech_processor(

            audio_array,

            sampling_rate=16000,

            return_tensors="pt",

            return_attention_mask=True
        )

        input_features = (

            inputs
            .input_features
            .to(

                device=DEVICE,

                dtype=speech_model.dtype
            )
        )

        attention_mask = (

            inputs
            .attention_mask
            .to(DEVICE)
        )

        # ----------------------------------------------------
        # Generate transcription
        # ----------------------------------------------------

        with torch.no_grad():

            generated_tokens = (

                speech_model.generate(

                    input_features=input_features,

                    attention_mask=attention_mask,

                    language=whisper_language,

                    task="transcribe",

                    num_beams=5,

                    max_new_tokens=256
                )
            )

        # ----------------------------------------------------
        # Decode
        # ----------------------------------------------------

        text = (

            speech_processor
            .batch_decode(

                generated_tokens,

                skip_special_tokens=True
            )[0]
            .strip()
        )

        print(
            f"Speech transcription: {text}"
        )

        if not text:

            raise HTTPException(

                status_code=400,

                detail="No speech detected"
            )

        return {

            "source_language":
                source_language,

            "text":
                text,

            "device":
                DEVICE,

            "model":
                WHISPER_MODEL_NAME
        }

    except subprocess.CalledProcessError:

        raise HTTPException(

            status_code=500,

            detail=(
                "Could not process audio. "
                "Make sure ffmpeg is installed."
            )
        )

    except HTTPException:

        raise

    except Exception as e:

        print(
            "Speech recognition error:",
            str(e)
        )

        raise HTTPException(

            status_code=500,

            detail=(
                "Speech recognition failed: "
                f"{str(e)}"
            )
        )

    finally:

        if (

            input_path

            and os.path.exists(input_path)

        ):

            try:

                os.remove(input_path)

            except Exception:

                pass

        if (

            wav_path

            and os.path.exists(wav_path)

        ):

            try:

                os.remove(wav_path)

            except Exception:

                pass


# ============================================================
# SANTALI TEXT → SPEECH
#
# Used later for Live Voice Translation.
#
# Normal text translation does NOT call TTS.
# ============================================================

@app.post("/api/text-to-speech")
async def text_to_speech(

    request: TranslationRequest

):

    if not request.text.strip():

        raise HTTPException(

            status_code=400,

            detail="Text cannot be empty"
        )

    print("=" * 60)

    print(
        "Text-to-Speech request"
    )

    print("=" * 60)

    try:

        load_tts_model_if_needed()

        prompt = request.text.strip()

        description = (

            "A clear speaker delivers Santali speech "
            "at a moderate speed. "
            "The recording is very high quality and close."
        )

        # ----------------------------------------------------
        # Description tokenizer
        # ----------------------------------------------------

        description_inputs = (

            tts_description_tokenizer(

                description,

                return_tensors="pt"

            ).to(DEVICE)
        )

        # ----------------------------------------------------
        # Prompt tokenizer
        # ----------------------------------------------------

        prompt_inputs = (

            tts_tokenizer(

                prompt,

                return_tensors="pt"

            ).to(DEVICE)
        )

        # ----------------------------------------------------
        # Generate
        # ----------------------------------------------------

        with torch.no_grad():

            generation = (

                tts_model.generate(

                    input_ids=(

                        description_inputs
                        .input_ids
                    ),

                    attention_mask=(

                        description_inputs
                        .attention_mask
                    ),

                    prompt_input_ids=(

                        prompt_inputs
                        .input_ids
                    ),

                    prompt_attention_mask=(

                        prompt_inputs
                        .attention_mask
                    )
                )
            )

        # ----------------------------------------------------
        # Float32
        # ----------------------------------------------------

        audio_arr = (

            generation
            .cpu()
            .numpy()
            .squeeze()
            .astype("float32")
        )

        # ----------------------------------------------------
        # WAV
        # ----------------------------------------------------

        audio_buffer = io.BytesIO()

        sf.write(

            audio_buffer,

            audio_arr,

            tts_model.config.sampling_rate,

            format="WAV"
        )

        audio_buffer.seek(0)

        print(
            "TTS audio generated successfully!"
        )

        return StreamingResponse(

            audio_buffer,

            media_type="audio/wav",

            headers={

                "Content-Disposition":
                    'inline; '
                    'filename="'
                    'santali_speech.wav"'
            }
        )

    except Exception as e:

        print(
            "TTS error:",
            str(e)
        )

        raise HTTPException(

            status_code=500,

            detail=(
                "Text-to-speech failed: "
                f"{str(e)}"
            )
        )


# ============================================================
# HTML → PDF USING CHROMIUM
# ============================================================

def create_santali_pdf(
    translated_pages,
    output_path
):

    if not os.path.exists(OL_CHIKI_FONT):

        raise RuntimeError(
            "Ol Chiki font not found."
        )

    if not os.path.exists(CHROMIUM_PATH):

        raise RuntimeError(
            "Chromium not found."
        )

    # ========================================================
    # IMPORTANT:
    # Keep HTML and Chromium profile inside the project
    # directory because Chromium is installed through Snap.
    # ========================================================

    backend_dir = os.path.dirname(
        os.path.abspath(__file__)
    )

    html_path = os.path.join(
        backend_dir,
        "_echobridge_translation.html"
    )

    chromium_profile = os.path.join(
        backend_dir,
        "_chromium_profile"
    )

    # Remove old temporary files if they exist
    if os.path.exists(html_path):

        try:
            os.remove(html_path)

        except Exception:
            pass

    if os.path.exists(chromium_profile):

        shutil.rmtree(
            chromium_profile,
            ignore_errors=True
        )

    os.makedirs(
        chromium_profile,
        exist_ok=True
    )

    # ========================================================
    # FONT URL
    # ========================================================

    font_url = (
        "file://"
        + OL_CHIKI_FONT
    )

    # ========================================================
    # BUILD HTML
    # ========================================================

    page_blocks = []

    for page_number, text in enumerate(
        translated_pages,
        start=1
    ):

        escaped_text = html.escape(
            text
        )

        paragraphs = escaped_text.split(
            "\n\n"
        )

        paragraph_html = []

        for paragraph in paragraphs:

            paragraph = paragraph.strip()

            if not paragraph:
                continue

            paragraph_html.append(
                "<p>"
                + paragraph.replace(
                    "\n",
                    "<br>"
                )
                + "</p>"
            )

        page_html = "\n".join(
            paragraph_html
        )

        page_blocks.append(
            f"""
            <section class="source-page">

                <h1>
                    Santali Translation - Page
                    {page_number}
                </h1>

                <div class="santali-text">
                    {page_html}
                </div>

            </section>
            """
        )

    # ========================================================
    # COMPLETE HTML DOCUMENT
    # ========================================================

    document_html = f"""
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<style>

@font-face {{

    font-family: "NotoOlChiki";

    src: url("{font_url}");

    font-weight: 400;

    font-style: normal;

}}

@page {{

    size: A4;

    margin: 18mm 16mm 18mm 16mm;

}}

* {{

    box-sizing: border-box;

}}

html,
body {{

    margin: 0;

    padding: 0;

}}

body {{

    background: white;

    font-family:
        Arial,
        sans-serif;

}}

.source-page {{

    page-break-after: always;

    width: 100%;

}}

.source-page:last-child {{

    page-break-after: auto;

}}

h1 {{

    font-family:
        Arial,
        sans-serif;

    font-size: 18px;

    font-weight: 600;

    margin:
        0 0 18px 0;

    padding-bottom: 8px;

    border-bottom:
        1px solid #cccccc;

}}

.santali-text {{

    font-family:
        "NotoOlChiki",
        sans-serif;

    font-size: 17px;

    line-height: 1.75;

    word-wrap: break-word;

    overflow-wrap: break-word;

}}

.santali-text p {{

    margin:
        0 0 14px 0;

}}

</style>

</head>

<body>

{"".join(page_blocks)}

</body>

</html>
"""

    # ========================================================
    # WRITE HTML INSIDE BACKEND DIRECTORY
    # ========================================================

    with open(
        html_path,
        "w",
        encoding="utf-8"
    ) as html_file:

        html_file.write(
            document_html
        )

    # ========================================================
    # HTML FILE URL
    # ========================================================

    html_url = (
        "file://"
        + html_path
    )

    # ========================================================
    # CHROMIUM PDF COMMAND
    # ========================================================

    command = [

        CHROMIUM_PATH,

        "--headless=new",

        "--no-sandbox",

        "--disable-gpu",

        "--disable-dev-shm-usage",

        "--no-pdf-header-footer",

        f"--user-data-dir={chromium_profile}",

        f"--print-to-pdf={output_path}",

        html_url
    ]

    print("=" * 60)

    print(
        "Generating PDF using Chromium..."
    )

    print(
        "Chromium:",
        CHROMIUM_PATH
    )

    print(
        "HTML:",
        html_path
    )

    print(
        "Output:",
        output_path
    )

    print("=" * 60)

    try:

        result = subprocess.run(

            command,

            stdout=subprocess.PIPE,

            stderr=subprocess.PIPE,

            text=True,

            timeout=120
        )

        print(
            "Chromium return code:",
            result.returncode
        )

        if result.stdout:

            print(
                "Chromium stdout:",
                result.stdout
            )

        if result.stderr:

            print(
                "Chromium stderr:",
                result.stderr
            )

        if result.returncode != 0:

            raise RuntimeError(

                "Chromium PDF generation failed: "

                + result.stderr
            )

        # ====================================================
        # VERIFY PDF
        # ====================================================

        if not os.path.exists(
            output_path
        ):

            raise RuntimeError(
                "Chromium did not create the PDF."
            )

        pdf_size = os.path.getsize(
            output_path
        )

        print(
            "Generated PDF size:",
            pdf_size,
            "bytes"
        )

        if pdf_size == 0:

            raise RuntimeError(
                "Generated PDF is empty."
            )

        print(
            "Chromium PDF created successfully!"
        )

    finally:

        # ====================================================
        # CLEAN TEMP HTML
        # ====================================================

        if os.path.exists(
            html_path
        ):

            try:

                os.remove(
                    html_path
                )

            except Exception:
                pass

        # ====================================================
        # CLEAN CHROMIUM PROFILE
        # ====================================================

        if os.path.exists(
            chromium_profile
        ):

            shutil.rmtree(
                chromium_profile,
                ignore_errors=True
            )
# ============================================================
# ENGLISH PDF → SANTALI PDF
# ============================================================

@app.post("/api/translate-pdf")
async def translate_pdf(

    file: UploadFile = File(...)

):

    if not file:

        raise HTTPException(

            status_code=400,

            detail="PDF file is required"
        )

    # --------------------------------------------------------
    # Check extension
    # --------------------------------------------------------

    if not file.filename.lower().endswith(
        ".pdf"
    ):

        raise HTTPException(

            status_code=400,

            detail="Only PDF files are supported"
        )

    input_path = None
    output_path = None

    try:

        print("=" * 60)

        print(
            "PDF translation request"
        )

        print(
            "File:",
            file.filename
        )

        print("=" * 60)

        # ====================================================
        # SAVE INPUT PDF
        # ====================================================

        with tempfile.NamedTemporaryFile(

            delete=False,

            suffix=".pdf"

        ) as input_file:

            input_path = input_file.name

            content = await file.read()

            input_file.write(content)

        # ====================================================
        # READ PDF
        # ====================================================

        reader = PdfReader(
            input_path
        )

        if not reader.pages:

            raise HTTPException(

                status_code=400,

                detail="PDF contains no pages"
            )

        translated_pages = []

        # ====================================================
        # PROCESS EACH PAGE
        # ====================================================

        for page_number, page in enumerate(

            reader.pages,

            start=1

        ):

            print(

                f"Processing page "
                f"{page_number}/"
                f"{len(reader.pages)}"
            )

            # ------------------------------------------------
            # Extract text
            # ------------------------------------------------

            page_text = (

                page.extract_text()
                or ""
            )

            page_text = (
                page_text.strip()
            )

            # ------------------------------------------------
            # Empty page
            # ------------------------------------------------

            if not page_text:

                translated_pages.append(

                    "No readable text found on this page."
                )

                continue

            # =================================================
            # CHUNK TEXT
            # =================================================

            words = page_text.split()

            chunks = []

            current_chunk = []

            current_length = 0

            for word in words:

                if (

                    current_length
                    + len(word)
                    > 500

                ):

                    if current_chunk:

                        chunks.append(

                            " ".join(
                                current_chunk
                            )
                        )

                    current_chunk = []

                    current_length = 0

                current_chunk.append(
                    word
                )

                current_length += (
                    len(word) + 1
                )

            if current_chunk:

                chunks.append(

                    " ".join(
                        current_chunk
                    )
                )

            # =================================================
            # TRANSLATE CHUNKS
            # =================================================

            translated_chunks = []

            for chunk in chunks:

                translation = translate_text(

                    chunk,

                    "english"
                )

                translated_chunks.append(
                    translation
                )

            # ------------------------------------------------
            # Combine page
            # ------------------------------------------------

            translated_page = (

                "\n\n".join(
                    translated_chunks
                )
            )

            translated_pages.append(
                translated_page
            )

        # ====================================================
        # CREATE OUTPUT FILE
        # ====================================================

        # ====================================================
        # CREATE OUTPUT FILE
        # ====================================================

        output_path = os.path.join(
            os.path.dirname(
                os.path.abspath(__file__)
            ),
            "_echobridge_output.pdf"
        )

        if os.path.exists(output_path):
            os.remove(output_path)

        # ====================================================
        # CREATE PDF USING CHROMIUM
        # ====================================================

        create_santali_pdf(
            translated_pages,
            output_path
        )

        print("=" * 60)

        print(
            "PDF translation completed!"
        )

        print(
            "Output:",
            output_path
        )

        print("=" * 60)

        # ====================================================
        # RETURN PDF
        # ====================================================

        translated_pdf = open(
            output_path,
            "rb"
        )
        return StreamingResponse(

            translated_pdf,

            media_type="application/pdf",

            headers={

                "Content-Disposition":
                    'attachment; '
                    'filename="'
                    'santali_translation.pdf"'
            }
        )

    except HTTPException:

        raise

    except Exception as e:

        print("=" * 60)

        print(
            "PDF translation error:",
            str(e)
        )

        print("=" * 60)

        raise HTTPException(

            status_code=500,

            detail=(
                "PDF translation failed: "
                f"{str(e)}"
            )
        )

    finally:

        # ----------------------------------------------------
        # Delete input PDF
        # ----------------------------------------------------

        if (

            input_path
            and os.path.exists(input_path)

        ):

            try:

                os.remove(input_path)

            except Exception:

                pass

        # ----------------------------------------------------
        # Delete generated PDF
        # ----------------------------------------------------



# ============================================================
# END OF ECHOBRIDGE BACKEND
# ============================================================
# ============================================================
# LIVE VOICE TRANSLATION — WEBSOCKET
#
# Pipeline:
#
# Browser microphone
#       ↓
# 3-second audio clip
#       ↓
# WebSocket
#       ↓
# Whisper STT
#       ↓
# IndicTrans2
#       ↓
# Santali / Ol Chiki
#       ↓
# Indic Parler-TTS
#       ↓
# Santali audio
#
# This is interactive chunk-based live translation.
# It is not word-by-word streaming.
# ============================================================


async def process_live_audio(audio_bytes, source_language):
    """
    Process one standalone audio chunk.

    Returns:
        transcript
        translation
        audio bytes
    """

    input_path = None
    wav_path = None
    tts_path = None

    try:

        print("=" * 60)
        print("LIVE AUDIO CHUNK")
        print("=" * 60)

        # ----------------------------------------------------
        # SAVE RECEIVED AUDIO
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".webm"
        ) as input_file:

            input_path = input_file.name

            input_file.write(
                audio_bytes
            )

        # ----------------------------------------------------
        # CONVERT WEBM → WAV
        # ----------------------------------------------------

        wav_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".wav"
        )

        wav_path = wav_file.name
        wav_file.close()

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                input_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                wav_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # ----------------------------------------------------
        # LOAD AUDIO
        # ----------------------------------------------------

        audio_array, sampling_rate = librosa.load(
            wav_path,
            sr=16000,
            mono=True
        )

        if len(audio_array) == 0:

            raise ValueError(
                "Audio chunk is empty."
            )

        # ----------------------------------------------------
        # WHISPER
        # ----------------------------------------------------

        print("Loading Whisper...")

        load_speech_model_if_needed()

        if source_language == "english":

            whisper_language = "english"

        else:

            whisper_language = "hindi"

        speech_inputs = speech_processor(
            audio_array,
            sampling_rate=16000,
            return_tensors="pt",
            return_attention_mask=True
        )

        input_features = (
            speech_inputs
            .input_features
            .to(
                device=DEVICE,
                dtype=speech_model.dtype
            )
        )

        attention_mask = (
            speech_inputs
            .attention_mask
            .to(DEVICE)
        )

        print("Running Whisper...")

        with torch.no_grad():

            generated_tokens = (
                speech_model.generate(
                    input_features=input_features,
                    attention_mask=attention_mask,
                    language=whisper_language,
                    task="transcribe",
                    num_beams=3,
                    max_new_tokens=128,
                )
            )

        transcript = (
            speech_processor
            .batch_decode(
                generated_tokens,
                skip_special_tokens=True
            )[0]
            .strip()
        )

        print(
            "LIVE TRANSCRIPT:",
            transcript
        )

        # ----------------------------------------------------
        # NO SPEECH
        # ----------------------------------------------------

        if not transcript:

            return {
                "transcript": "",
                "translation": "",
                "audio": None,
            }

        # ----------------------------------------------------
        # TRANSLATION
        # ----------------------------------------------------

        translation_source = (
            "english"
            if source_language == "english"
            else "hindi"
        )

        print(
            "Translating:",
            transcript
        )

        translation = translate_text(
            transcript,
            translation_source
        )

        print(
            "LIVE SANTALI:",
            translation
        )

        # ----------------------------------------------------
        # TTS
        # ----------------------------------------------------

        print(
            "Generating Santali speech..."
        )

        load_tts_model_if_needed()

        prompt = translation.strip()

        description = (
            "A clear speaker delivers Santali speech "
            "at a moderate speaking speed with a natural "
            "and slightly expressive tone. "
            "The recording is very high quality, "
            "clear and close."
        )

        description_inputs = (
            tts_description_tokenizer(
                description,
                return_tensors="pt"
            )
            .to(DEVICE)
        )

        prompt_inputs = (
            tts_tokenizer(
                prompt,
                return_tensors="pt"
            )
            .to(DEVICE)
        )

        with torch.no_grad():

            generation = (
                tts_model.generate(
                    input_ids=(
                        description_inputs
                        .input_ids
                    ),

                    attention_mask=(
                        description_inputs
                        .attention_mask
                    ),

                    prompt_input_ids=(
                        prompt_inputs
                        .input_ids
                    ),

                    prompt_attention_mask=(
                        prompt_inputs
                        .attention_mask
                    ),
                )
            )

        audio_array = (
            generation
            .cpu()
            .numpy()
            .squeeze()
            .astype("float32")
        )

        # ----------------------------------------------------
        # SAVE TTS WAV
        # ----------------------------------------------------

        tts_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".wav"
        )

        tts_path = tts_file.name
        tts_file.close()

        import soundfile as sf

        sf.write(
            tts_path,
            audio_array,
            tts_model.config.sampling_rate
        )

        # ----------------------------------------------------
        # READ AUDIO BYTES
        # ----------------------------------------------------

        with open(
            tts_path,
            "rb"
        ) as audio_file:

            output_audio = (
                audio_file.read()
            )

        print(
            "LIVE TTS generated:",
            len(output_audio),
            "bytes"
        )

        return {
            "transcript": transcript,
            "translation": translation,
            "audio": output_audio,
        }

    finally:

        # ----------------------------------------------------
        # CLEAN TEMP FILES
        # ----------------------------------------------------

        if (
            input_path
            and os.path.exists(input_path)
        ):

            try:
                os.remove(input_path)
            except Exception:
                pass

        if (
            wav_path
            and os.path.exists(wav_path)
        ):

            try:
                os.remove(wav_path)
            except Exception:
                pass

        if (
            tts_path
            and os.path.exists(tts_path)
        ):

            try:
                os.remove(tts_path)
            except Exception:
                pass


# ============================================================
# LIVE VOICE TRANSLATION WEBSOCKET
# ============================================================

@app.websocket("/ws/live-translation")
async def live_translation_websocket(
    websocket: WebSocket
):

    await websocket.accept()

    print("=" * 60)
    print("LIVE TRANSLATION WEBSOCKET CONNECTED")
    print("=" * 60)

    try:

        # ----------------------------------------------------
        # RECEIVE SOURCE LANGUAGE
        # ----------------------------------------------------

        source_language = (
            websocket
            .query_params
            .get(
                "source_language",
                "hindi"
            )
            .lower()
        )

        if source_language not in [
            "hindi",
            "english",
        ]:

            source_language = "hindi"

        print(
            "Live source language:",
            source_language
        )

        # ----------------------------------------------------
        # SEND READY MESSAGE
        # ----------------------------------------------------

        await websocket.send_json(
            {
                "type": "ready",
                "message": (
                    "Live translation ready"
                ),
                "source_language":
                    source_language,
                "target_language":
                    "Santali",
                "target_script":
                    "Ol Chiki",
            }
        )

        # ----------------------------------------------------
        # CONTINUOUS AUDIO LOOP
        # ----------------------------------------------------

        while True:

            message = (
                await websocket.receive()
            )

            # ------------------------------------------------
            # CLIENT DISCONNECTED
            # ------------------------------------------------

            if message.get(
                "type"
            ) == "websocket.disconnect":

                print(
                    "Live client disconnected."
                )

                break

            # ------------------------------------------------
            # AUDIO DATA
            # ------------------------------------------------

            audio_bytes = message.get(
                "bytes"
            )

            if not audio_bytes:

                continue

            print(
                "Received live audio:",
                len(audio_bytes),
                "bytes"
            )

            try:

                # --------------------------------------------
                # PROCESS AUDIO
                # --------------------------------------------

                result = (
                    await process_live_audio(
                        audio_bytes,
                        source_language
                    )
                )

                # --------------------------------------------
                # SEND TEXT RESULT
                # --------------------------------------------

                await websocket.send_json(
                    {
                        "type":
                            "translation",

                        "transcript":
                            result["transcript"],

                        "translation":
                            result["translation"],

                        "target_language":
                            "Santali",

                        "target_script":
                            "Ol Chiki",
                    }
                )

                # --------------------------------------------
                # SEND AUDIO RESULT
                # --------------------------------------------

                if result["audio"]:

                    await websocket.send_bytes(
                        result["audio"]
                    )

            except Exception as chunk_error:

                print(
                    "Live chunk error:",
                    str(chunk_error)
                )

                await websocket.send_json(
                    {
                        "type":
                            "error",

                        "message":
                            str(chunk_error),
                    }
                )

    except WebSocketDisconnect:

        print(
            "=" * 60
        )

        print(
            "LIVE TRANSLATION WEBSOCKET DISCONNECTED"
        )

        print(
            "=" * 60
        )

    except Exception as e:

        print(
            "Live WebSocket error:",
            str(e)
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
@app.websocket("/ws/live-translation")
async def live_translation_endpoint(websocket: WebSocket):
    await live_translation_websocket(websocket)
# ============================================================
# AUTHENTICATION
# ============================================================

@app.post("/api/auth/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    try:
        user = register_user(
            db=db,
            name=request.name,
            email=request.email,
            password=request.password,
            role=request.role,
        )
        token = create_access_token(user)
        return {
            "success": True,
            "message": "Account created successfully.",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


@app.post("/api/auth/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    try:
        user = login_user(
            db=db,
            email=request.email,
            password=request.password,
        )
        token = create_access_token(user)        

        return {
            "success": True,
            "message": "Login successful.",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
        }

    except ValueError as error:
        raise HTTPException(
            status_code=401,
            detail=str(error),
        )    
       # ============================================================
# LESSON AUTHENTICATION
# ============================================================

def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required.",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header.",
        )

    token = authorization.split(" ", 1)[1]

    try:
        payload = decode_access_token(token)
    except ValueError as error:
        raise HTTPException(
            status_code=401,
            detail=str(error),
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token.",
        )

    user = (
        db.query(User)
        .filter(User.id == int(user_id))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found.",
        )

    return user 
# ============================================================
# LESSON API
# ============================================================

class LessonCreateRequest(BaseModel):
    type: str
    source_language: str
    input: str
    translation: str
    target_language: str
    target_script: str
    published: bool = False


@app.post("/api/lessons")
def create_lesson(
    request: LessonCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail="Only teachers can create lessons.",
        )

    lesson = Lesson(
        teacher_id=current_user.id,
        type=request.type,
        source_language=request.source_language,
        input=request.input,
        translation=request.translation,
        target_language=request.target_language,
        target_script=request.target_script,
        published=request.published,
    )

    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    return {
        "success": True,
        "lesson": {
            "id": lesson.id,
            "teacher_id": lesson.teacher_id,
            "type": lesson.type,
            "source_language": lesson.source_language,
            "input": lesson.input,
            "translation": lesson.translation,
            "target_language": lesson.target_language,
            "target_script": lesson.target_script,
            "created_at": lesson.created_at,
            "published": lesson.published,
        },
    }


@app.get("/api/lessons")
def get_lessons(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "teacher":
        lessons = (
            db.query(Lesson)
            .filter(Lesson.teacher_id == current_user.id)
            .order_by(Lesson.created_at.desc())
            .all()
        )
    else:
        lessons = (
            db.query(Lesson)
            .filter(Lesson.published == True)
            .order_by(Lesson.created_at.desc())
            .all()
        )

    return {
        "success": True,
        "lessons": [
            {
                "id": lesson.id,
                "teacher_id": lesson.teacher_id,
                "type": lesson.type,
                "source_language": lesson.source_language,
                "input": lesson.input,
                "translation": lesson.translation,
                "target_language": lesson.target_language,
                "target_script": lesson.target_script,
                "created_at": lesson.created_at,
                "published": lesson.published,
            }
            for lesson in lessons
        ],
    }


@app.put("/api/lessons/{lesson_id}/publish")
def publish_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail="Only teachers can publish lessons.",
        )

    lesson = (
        db.query(Lesson)
        .filter(
            Lesson.id == lesson_id,
            Lesson.teacher_id == current_user.id,
        )
        .first()
    )

    if not lesson:
        raise HTTPException(
            status_code=404,
            detail="Lesson not found.",
        )

    lesson.published = True

    db.commit()
    db.refresh(lesson)

    return {
        "success": True,
        "message": "Lesson published successfully.",
        "lesson_id": lesson.id,
        "published": lesson.published,
    }


@app.delete("/api/lessons/{lesson_id}")
def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail="Only teachers can delete lessons.",
        )

    lesson = (
        db.query(Lesson)
        .filter(
            Lesson.id == lesson_id,
            Lesson.teacher_id == current_user.id,
        )
        .first()
    )

    if not lesson:
        raise HTTPException(
            status_code=404,
            detail="Lesson not found.",
        )

    db.delete(lesson)
    db.commit()

    return {
        "success": True,
        "message": "Lesson deleted successfully.",
    }

