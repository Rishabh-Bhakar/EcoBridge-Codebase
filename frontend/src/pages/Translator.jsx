import { useEffect, useRef, useState } from "react";

import {
  translateText,
  speechToText,
  translatePdf,
} from "../services/api";


// ============================================================
// PDF STORAGE — IndexedDB
// ============================================================

function openPdfDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      "EchoBridgePDFDatabase",
      1
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("pdfs")) {
        db.createObjectStore("pdfs");
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


async function savePdfOffline(id, blob) {
  const db = await openPdfDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      "pdfs",
      "readwrite"
    );

    transaction.objectStore("pdfs").put(
      blob,
      String(id)
    );

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}


// ============================================================
// MAIN COMPONENT
// ============================================================

function Translator() {

  // ==========================================================
  // TEXT TRANSLATION STATE
  // ==========================================================

  const [sourceLanguage, setSourceLanguage] =
    useState("hindi");

  const [hindiText, setHindiText] =
    useState("");

  const [translation, setTranslation] =
    useState("");

  const [recording, setRecording] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [isTranslating, setIsTranslating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [saved, setSaved] =
    useState(false);


  // ==========================================================
  // PDF STATE
  // ==========================================================

  const [pdfFile, setPdfFile] =
    useState(null);

  const [pdfProcessing, setPdfProcessing] =
    useState(false);

  const [pdfPreviewUrl, setPdfPreviewUrl] =
    useState("");

  const [pdfTranslated, setPdfTranslated] =
    useState(false);

  const [pdfPublished, setPdfPublished] =
    useState(false);

  const [pdfError, setPdfError] =
    useState("");

  const [pdfFileName, setPdfFileName] =
    useState("");


  // ==========================================================
  // REFS
  // ==========================================================

  const mediaRecorderRef =
    useRef(null);

  const audioChunksRef =
    useRef([]);


  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {

    return () => {

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }

      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }

    };

  }, [pdfPreviewUrl]);


  // ==========================================================
  // TEXT TRANSLATION
  // ==========================================================

  async function translateTextOnly(
    text,
    language = sourceLanguage
  ) {

    if (!text || !text.trim()) {

      setError(
        "Please enter or speak some text."
      );

      return;
    }


    try {

      setError("");
      setSaved(false);
      setIsTranslating(true);


      const backendLanguage =
        language === "hinglish"
          ? "hindi"
          : language;


      console.log(
        "Translating:",
        text
      );

      console.log(
        "Source language:",
        backendLanguage
      );


      const result =
        await translateText(
          text,
          backendLanguage
        );


      console.log(
        "Translation result:",
        result
      );


      setTranslation(
        result.translation
      );

      setIsTranslating(false);

    }

    catch (err) {

      console.error(
        "Translation error:",
        err
      );

      setIsTranslating(false);

      setError(
        err.message ||
        "Translation failed."
      );
    }
  }


  // ==========================================================
  // START RECORDING
  // ==========================================================

  async function startRecording() {

    try {

      setError("");
      setSaved(false);


      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });


      const recorder =
        new MediaRecorder(stream);


      mediaRecorderRef.current =
        recorder;


      audioChunksRef.current =
        [];


      recorder.ondataavailable =
        (event) => {

          if (event.data.size > 0) {

            audioChunksRef.current.push(
              event.data
            );

          }

        };


      recorder.onstop =
        async () => {

          setRecording(false);
          setProcessing(true);


          stream
            .getTracks()
            .forEach(
              (track) => track.stop()
            );


          try {

            const audioBlob =
              new Blob(
                audioChunksRef.current,
                {
                  type:
                    recorder.mimeType ||
                    "audio/webm",
                }
              );


            console.log(
              "Audio recorded:",
              audioBlob.size,
              "bytes"
            );


            const result =
              await speechToText(
                audioBlob,
                sourceLanguage
              );


            console.log(
              "STT result:",
              result
            );


            const speechText =
              result.text;


            if (
              !speechText ||
              !speechText.trim()
            ) {

              throw new Error(
                "No speech detected."
              );
            }


            setHindiText(
              speechText
            );


            setProcessing(false);


            await translateTextOnly(
              speechText,
              sourceLanguage
            );

          }

          catch (err) {

            console.error(
              "Recording processing error:",
              err
            );

            setProcessing(false);

            setError(
              err.message ||
              "Could not process recording."
            );
          }

        };


      recorder.start();

      setRecording(true);

      console.log(
        "Recording started..."
      );

    }

    catch (err) {

      console.error(
        "Microphone error:",
        err
      );

      setError(
        "Microphone permission is required."
      );
    }
  }


  // ==========================================================
  // STOP RECORDING
  // ==========================================================

  function stopRecording() {

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {

      mediaRecorderRef.current.stop();
    }
  }


  // ==========================================================
  // SAVE TEXT LESSON
  // ==========================================================

  function saveLesson() {

    if (
      !hindiText.trim() ||
      !translation.trim()
    ) {

      setError(
        "Translate some content before saving."
      );

      return;
    }


    try {

      const existing =
        JSON.parse(
          localStorage.getItem(
            "echobridge_lessons"
          ) || "[]"
        );


      const lesson = {

        id: Date.now(),

        type:
          "text",

        sourceLanguage:
          sourceLanguage,

        input:
          hindiText,

        translation:
          translation,

        targetLanguage:
          "Santali",

        targetScript:
          "Ol Chiki",

        createdAt:
          new Date().toISOString(),

        published:
          false,
      };


      existing.push(
        lesson
      );


      localStorage.setItem(
        "echobridge_lessons",
        JSON.stringify(existing)
      );


      setSaved(true);
      setError("");


    }

    catch (err) {

      console.error(
        "Save lesson error:",
        err
      );

      setError(
        "Could not save lesson."
      );
    }
  }


  // ==========================================================
  // PDF SELECT
  // ==========================================================

  function handlePdfSelect(event) {

    const file =
      event.target.files?.[0];


    setPdfError("");
    setPdfTranslated(false);
    setPdfPublished(false);


    if (!file) {
      setPdfFile(null);
      setPdfFileName("");
      return;
    }


    if (
      file.type !==
      "application/pdf"
    ) {

      setPdfError(
        "Please select a PDF file."
      );

      setPdfFile(null);
      setPdfFileName("");

      return;
    }


    setPdfFile(file);
    setPdfFileName(file.name);


    console.log(
      "PDF selected:",
      file.name,
      file.size,
      "bytes"
    );
  }


  // ==========================================================
  // TRANSLATE PDF
  // ==========================================================

  async function handlePdfTranslation() {

    if (!pdfFile) {

      setPdfError(
        "Please select an English PDF first."
      );

      return;
    }


    try {

      setPdfError("");
      setPdfProcessing(true);
      setPdfTranslated(false);
      setPdfPublished(false);


      console.log(
        "Sending PDF for translation..."
      );


      const blob =
        await translatePdf(
          pdfFile
        );


      console.log(
        "Translated PDF received:",
        blob.size,
        "bytes"
      );


      if (
        !blob ||
        blob.size === 0
      ) {

        throw new Error(
          "Generated Santali PDF is empty."
        );
      }


      if (pdfPreviewUrl) {
        URL.revokeObjectURL(
          pdfPreviewUrl
        );
      }


      const url =
        URL.createObjectURL(blob);


      setPdfPreviewUrl(url);
      setPdfTranslated(true);
      setPdfProcessing(false);


    }

    catch (err) {

      console.error(
        "PDF translation error:",
        err
      );

      setPdfProcessing(false);

      setPdfError(
        err.message ||
        "PDF translation failed."
      );
    }
  }


  // ==========================================================
  // DOWNLOAD PDF
  // ==========================================================

  function downloadPdf() {

    if (!pdfPreviewUrl) {
      return;
    }


    const link =
      document.createElement("a");

    link.href =
      pdfPreviewUrl;

    link.download =
      "Santali_Translated_Lesson.pdf";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  }


  // ==========================================================
  // PUBLISH PDF LESSON
  // ==========================================================

  async function publishPdfLesson() {

    if (
      !pdfPreviewUrl ||
      !pdfTranslated
    ) {

      setPdfError(
        "Translate the PDF before publishing."
      );

      return;
    }


    try {

      setPdfError("");


      // ------------------------------------------------------
      // Fetch generated PDF from blob URL
      // ------------------------------------------------------

      const response =
        await fetch(
          pdfPreviewUrl
        );


      const blob =
        await response.blob();


      // ------------------------------------------------------
      // Unique lesson ID
      // ------------------------------------------------------

      const lessonId =
        Date.now();


      // ------------------------------------------------------
      // Save actual PDF offline
      // ------------------------------------------------------

      await savePdfOffline(
        lessonId,
        blob
      );


      // ------------------------------------------------------
      // Save lesson metadata
      // ------------------------------------------------------

      const existing =
        JSON.parse(
          localStorage.getItem(
            "echobridge_lessons"
          ) || "[]"
        );


      const lesson = {

        id:
          lessonId,

        type:
          "pdf",

        sourceLanguage:
          "english",

        input:
          pdfFileName,

        translation:
          "Santali PDF lesson",

        targetLanguage:
          "Santali",

        targetScript:
          "Ol Chiki",

        pdfStored:
          true,

        createdAt:
          new Date().toISOString(),

        published:
          true,
      };


      existing.push(
        lesson
      );


      localStorage.setItem(
        "echobridge_lessons",
        JSON.stringify(existing)
      );


      setPdfPublished(true);


      console.log(
        "PDF lesson published successfully."
      );

    }

    catch (err) {

      console.error(
        "PDF publish error:",
        err
      );

      setPdfError(
        "Could not publish PDF lesson: " +
        (err.message || "")
      );
    }
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div
      style={{
        minHeight: "100vh",
        background: "#1f2027",
        color: "#ffffff",
        padding: "30px",
        boxSizing: "border-box",
      }}
    >

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <h1
          style={{
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          Translate Lesson
        </h1>


        <p
          style={{
            textAlign: "center",
            color: "#a9a9b3",
            marginBottom: "30px",
          }}
        >
          Convert educational content into
          Santali (Ol Chiki)
        </p>


        {/* ================================================== */}
        {/* TEXT TRANSLATION */}
        {/* ================================================== */}

        <div
          style={{
            background: "#292b34",
            borderRadius: "14px",
            padding: "22px",
            marginBottom: "25px",
          }}
        >

          <h2
            style={{
              marginTop: 0,
              textAlign: "center",
            }}
          >
            📝 Text Translation
          </h2>


          {/* LANGUAGE */}

          <div
            style={{
              maxWidth: "430px",
              margin: "0 auto 25px",
            }}
          >

            <label
              style={{
                display: "block",
                marginBottom: "10px",
                textAlign: "center",
              }}
            >
              Source Language
            </label>


            <select
              value={sourceLanguage}
              onChange={(e) =>
                setSourceLanguage(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "16px",
              }}
            >

              <option value="hindi">
                Hindi
              </option>

              <option value="english">
                English
              </option>

              <option value="hinglish">
                Hinglish
              </option>

            </select>

          </div>


          {/* TWO PANELS */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "18px",
            }}
          >

            {/* SOURCE */}

            <div
              style={{
                background: "#ffffff",
                color: "#222222",
                borderRadius: "12px",
                padding: "18px",
              }}
            >

              <h3
                style={{
                  textAlign: "center",
                }}
              >
                {sourceLanguage === "english"
                  ? "English Input"
                  : sourceLanguage === "hinglish"
                  ? "Hinglish Input"
                  : "Hindi Input"}
              </h3>


              <textarea
                value={hindiText}
                onChange={(e) =>
                  setHindiText(
                    e.target.value
                  )
                }
                placeholder={
                  sourceLanguage === "english"
                    ? "Enter English text..."
                    : sourceLanguage === "hinglish"
                    ? "Type Hinglish..."
                    : "हिंदी में लिखें..."
                }
                style={{
                  width: "100%",
                  minHeight: "170px",
                  boxSizing: "border-box",
                  padding: "14px",
                  borderRadius: "8px",
                  border:
                    "1px solid #cccccc",
                  fontSize: "16px",
                  resize: "vertical",
                }}
              />


              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "15px",
                  flexWrap: "wrap",
                }}
              >

                {!recording ? (

                  <button
                    onClick={
                      startRecording
                    }
                    disabled={
                      processing ||
                      isTranslating
                    }
                    style={buttonStyle("#2864e8")}
                  >
                    🎙️ Speak
                  </button>

                ) : (

                  <button
                    onClick={
                      stopRecording
                    }
                    style={buttonStyle("#dc3545")}
                  >
                    ⏹ Stop Recording
                  </button>

                )}


                <button
                  onClick={() =>
                    translateTextOnly(
                      hindiText,
                      sourceLanguage
                    )
                  }
                  disabled={
                    !hindiText.trim() ||
                    recording ||
                    processing ||
                    isTranslating
                  }
                  style={buttonStyle("#2864e8")}
                >
                  🌐 Translate to Santali
                </button>

              </div>


              {processing && (

                <p
                  style={{
                    color: "#2864e8",
                    marginTop: "12px",
                  }}
                >
                  🎧 Converting speech to text...
                </p>

              )}


              {isTranslating && (

                <p
                  style={{
                    color: "#2864e8",
                    marginTop: "12px",
                  }}
                >
                  🌐 Translating to Santali...
                </p>

              )}


              <p
                style={{
                  textAlign: "center",
                  color: "#777777",
                }}
              >
                {hindiText.length} characters
              </p>

            </div>


            {/* OUTPUT */}

            <div
              style={{
                background: "#ffffff",
                color: "#222222",
                borderRadius: "12px",
                padding: "18px",
              }}
            >

              <h3
                style={{
                  textAlign: "center",
                }}
              >
                Santali — Ol Chiki
              </h3>


              <textarea
                value={translation}
                readOnly
                placeholder=
                  "Santali translation will appear here..."
                style={{
                  width: "100%",
                  minHeight: "170px",
                  boxSizing: "border-box",
                  padding: "14px",
                  borderRadius: "8px",
                  border:
                    "1px solid #cccccc",
                  fontSize: "18px",
                  resize: "vertical",
                }}
              />


              <p
                style={{
                  textAlign: "center",
                  color: "#777777",
                  marginTop: "15px",
                }}
              >
                Text translation only
              </p>

            </div>

          </div>


          {/* SAVE */}

          <button
            onClick={saveLesson}
            disabled={
              !translation.trim()
            }
            style={{
              marginTop: "18px",
              padding: "12px 22px",
              border: "none",
              borderRadius: "8px",
              background: "#20a957",
              color: "white",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            💾 Save Lesson
          </button>


          {saved && (

            <div style={successStyle}>
              ✅ Lesson saved successfully!
            </div>

          )}

        </div>


        {/* ================================================== */}
        {/* PDF TRANSLATION */}
        {/* ================================================== */}

        <div
          style={{
            background: "#ffffff",
            color: "#222222",
            borderRadius: "14px",
            padding: "25px",
            marginBottom: "25px",
          }}
        >

          <div
            style={{
              textAlign: "center",
              marginBottom: "25px",
            }}
          >

            <div
              style={{
                fontSize: "42px",
                marginBottom: "8px",
              }}
            >
              📄
            </div>

            <h2
              style={{
                margin: "0 0 8px",
              }}
            >
              English PDF → Santali
            </h2>

            <p
              style={{
                color: "#6b7280",
                margin: 0,
              }}
            >
              Upload an English educational PDF
              and convert it into Santali (Ol Chiki).
            </p>

          </div>


          {/* FILE SELECT */}

          <div
            style={{
              border:
                "2px dashed #bfdbfe",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              background: "#eff6ff",
            }}
          >

            <input
              id="pdf-upload"
              type="file"
              accept=".pdf,application/pdf"
              onChange={
                handlePdfSelect
              }
              style={{
                display: "none",
              }}
            />


            <label
              htmlFor="pdf-upload"
              style={{
                display: "inline-block",
                padding: "12px 22px",
                borderRadius: "9px",
                background: "#2563eb",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              📁 Choose English PDF
            </label>


            {pdfFileName && (

              <p
                style={{
                  marginTop: "15px",
                  color: "#374151",
                  fontWeight: "bold",
                }}
              >
                📄 {pdfFileName}
              </p>

            )}

          </div>


          {/* TRANSLATE BUTTON */}

          <button
            onClick={
              handlePdfTranslation
            }
            disabled={
              !pdfFile ||
              pdfProcessing
            }
            style={{
              width: "100%",
              marginTop: "18px",
              padding: "14px",
              border: "none",
              borderRadius: "9px",
              background:
                pdfProcessing
                  ? "#9ca3af"
                  : "#2563eb",
              color: "white",
              fontSize: "15px",
              fontWeight: "bold",
              cursor:
                pdfProcessing
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {pdfProcessing
              ? "⏳ Translating PDF..."
              : "🔄 Translate PDF to Santali"}
          </button>


          {/* PDF ERROR */}

          {pdfError && (

            <div
              style={{
                marginTop: "15px",
                padding: "13px",
                background: "#fee2e2",
                color: "#b91c1c",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              ❌ {pdfError}
            </div>

          )}


          {/* PDF PREVIEW */}

          {pdfTranslated &&
            pdfPreviewUrl && (

              <div
                style={{
                  marginTop: "25px",
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >

                <div
                  style={{
                    padding: "16px 18px",
                    background: "#f8fafc",
                    borderBottom:
                      "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >

                  <div>

                    <strong>
                      Santali PDF Preview
                    </strong>

                    <div
                      style={{
                        color: "#6b7280",
                        fontSize: "13px",
                        marginTop: "4px",
                      }}
                    >
                      Review the AI-generated
                      translation before publishing.
                    </div>

                  </div>


                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                    }}
                  >

                    <button
                      onClick={
                        downloadPdf
                      }
                      style={{
                        padding:
                          "10px 14px",
                        border:
                          "1px solid #d1d5db",
                        borderRadius:
                          "8px",
                        background:
                          "white",
                        cursor:
                          "pointer",
                        fontWeight:
                          "bold",
                      }}
                    >
                      ⬇️ Download
                    </button>


                    <button
                      onClick={
                        publishPdfLesson
                      }
                      disabled={
                        pdfPublished
                      }
                      style={{
                        padding:
                          "10px 14px",
                        border: "none",
                        borderRadius:
                          "8px",
                        background:
                          pdfPublished
                            ? "#6b7280"
                            : "#16a34a",
                        color: "white",
                        cursor:
                          pdfPublished
                            ? "default"
                            : "pointer",
                        fontWeight:
                          "bold",
                      }}
                    >
                      {pdfPublished
                        ? "✓ Published"
                        : "🚀 Publish Lesson"}
                    </button>

                  </div>

                </div>


                <iframe
                  src={pdfPreviewUrl}
                  title="Santali PDF Preview"
                  style={{
                    width: "100%",
                    height: "650px",
                    border: "none",
                  }}
                />

              </div>

            )}


          {pdfPublished && (

            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                background: "#dcfce7",
                color: "#166534",
                borderRadius: "9px",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              ✅ PDF lesson published successfully!
              Students can now access it from the
              Student Dashboard.
            </div>

          )}

        </div>


        {/* ================================================== */}
        {/* GENERAL ERROR */}
        {/* ================================================== */}

        {error && (

          <div
            style={{
              marginTop: "18px",
              padding: "14px",
              background: "#ffdede",
              color: "#a00000",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            ❌ {error}
          </div>

        )}


        {/* ================================================== */}
        {/* PIPELINE */}
        {/* ================================================== */}

        <div
          style={{
            background: "#ffffff",
            color: "#222222",
            borderRadius: "12px",
            padding: "22px",
            textAlign: "center",
          }}
        >

          <h3>
            🎙️ EchoBridge Translation Pipeline
          </h3>


          <p>
            🎙️ Speech
            {" → "}
            🤖 Local Whisper
            {" → "}
            🌐 IndicTrans2
            {" → "}
            ᱥᱟᱱᱛᱟᱲᱤ Santali / Ol Chiki
          </p>


          <p
            style={{
              color: "#777777",
              fontSize: "14px",
              marginTop: "12px",
            }}
          >
            PDF lessons can be reviewed by the
            teacher before publishing to students.
          </p>

        </div>

      </div>

    </div>
  );
}


// ============================================================
// SMALL STYLE HELPERS
// ============================================================

function buttonStyle(background) {
  return {
    padding: "12px 18px",
    border: "none",
    borderRadius: "8px",
    background,
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
  };
}


const successStyle = {
  marginTop: "18px",
  padding: "14px",
  background: "#d9f7e5",
  color: "#08752d",
  borderRadius: "8px",
  textAlign: "center",
};


export default Translator;
