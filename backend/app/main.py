import torch

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor


# ============================================================
# CONFIG
# ============================================================

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

HINDI_MODEL_NAME = "ai4bharat/indictrans2-indic-indic-dist-320M"
ENGLISH_MODEL_NAME = "ai4bharat/indictrans2-en-indic-dist-200M"

TARGET_LANGUAGE = "sat_Olck"


# ============================================================
# MODEL LOADING
# ============================================================

def load_model(model_name):
    print(f"Loading model: {model_name}")
    print(f"Device: {DEVICE}")

    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=True
    )

    model = AutoModelForSeq2SeqLM.from_pretrained(
        model_name,
        trust_remote_code=True,
        torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32
    ).to(DEVICE)

    model.eval()

    print(f"Loaded: {model_name}")

    return tokenizer, model


# Hindi model is loaded when backend starts.
print("Loading Hindi → Santali model...")

hindi_tokenizer, hindi_model = load_model(
    HINDI_MODEL_NAME
)

processor = IndicProcessor(inference=True)

print("Hindi → Santali model loaded successfully!")


# English model will be loaded only when first English request arrives.
english_tokenizer = None
english_model = None


def load_english_model_if_needed():
    global english_tokenizer
    global english_model

    if english_model is None:
        print("Loading English → Santali model for the first time...")

        english_tokenizer, english_model = load_model(
            ENGLISH_MODEL_NAME
        )

        print("English → Santali model loaded successfully!")


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="EchoBridge API",
    description="AI-assisted multilingual education system",
    version="0.2.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
# TRANSLATION FUNCTION
# ============================================================

def translate_text(
    text,
    source_language
):

    if source_language == "hindi":

        tokenizer = hindi_tokenizer
        model = hindi_model

        src_lang = "hin_Deva"

    elif source_language == "english":

        load_english_model_if_needed()

        tokenizer = english_tokenizer
        model = english_model

        src_lang = "eng_Latn"

    else:

        raise HTTPException(
            status_code=400,
            detail="Unsupported source language"
        )


    # Prepare text
    batch = processor.preprocess_batch(
        [text],
        src_lang=src_lang,
        tgt_lang=TARGET_LANGUAGE
    )


    # Tokenize
    inputs = tokenizer(
        batch,
        truncation=True,
        padding="longest",
        return_tensors="pt",
        return_attention_mask=True
    ).to(DEVICE)


    # Generate
    with torch.no_grad():

        generated_tokens = model.generate(
            **inputs,
            use_cache=True,
            min_length=0,
            max_length=256,
            num_beams=5,
            num_return_sequences=1
        )


    # Decode
    generated_tokens = tokenizer.batch_decode(
        generated_tokens,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=True
    )


    # Post-process
    translations = processor.postprocess_batch(
        generated_tokens,
        lang=TARGET_LANGUAGE
    )


    return translations[0]


# ============================================================
# ROUTES
# ============================================================

@app.get("/")
def root():

    return {
        "message": "EchoBridge Backend is running!"
    }


@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "service": "EchoBridge API",
        "device": DEVICE,
        "version": "0.2.0"
    }


@app.post("/api/translate")
def translate(request: TranslationRequest):

    if not request.text.strip():

        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )


    source_language = request.source_language.lower()


    translation = translate_text(
        request.text,
        source_language
    )


    language_names = {
        "hindi": "Hindi",
        "english": "English"
    }


    return {
        "source_language": language_names.get(
            source_language,
            source_language
        ),
        "target_language": "Santali",
        "target_script": "Ol Chiki",
        "input": request.text,
        "translation": translation,
        "device": DEVICE
    }
