import { useState } from "react";
import {
  translatePdf,
  createLesson,
  publishLesson,
} from "../services/api";
function openPdfDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("EchoBridgePDFDatabase", 1);

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
    const transaction = db.transaction("pdfs", "readwrite");

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
function PdfPublisher() {
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfBlob, setPdfBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [published, setPublished] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setStatus("Please select a PDF file.");
      setFile(null);
      return;
    }

setFile(selectedFile);
setPdfUrl("");
setPdfBlob(null);
setPublished(false);
setStatus("");
  };

  const handleTranslate = async () => {
    if (!file) {
      setStatus("Please select an English PDF first.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Translating PDF to Santali... This may take a moment.");

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl("");
      }

     const blob = await translatePdf(file);

setPdfBlob(blob);

const url = URL.createObjectURL(blob);

setPdfUrl(url);      setStatus(
        "Translation completed successfully. Review the Santali PDF below."
      );
    } catch (error) {
      console.error(error);
      setStatus(error.message || "PDF translation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) {
      return;
    }

    const link = document.createElement("a");

    link.href = pdfUrl;
    link.download = "santali_translation.pdf";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

const handlePublish = async () => {
  if (!pdfBlob) {
    setStatus("Translate the PDF before publishing.");
    return;
  }

  try {
    setLoading(true);
    setStatus("Publishing lesson...");

    // 1. Create lesson in PostgreSQL
    const result = await createLesson({
      type: "pdf",
      source_language: "English",
      input: file?.name || "English Lesson PDF",
      translation: "Santali PDF lesson",
      target_language: "Santali",
      target_script: "Ol Chiki",
      published: false,
    });

    const lessonId = result.lesson?.id;

    if (!lessonId) {
      throw new Error("Server did not return a lesson ID.");
    }

    // 2. Store actual PDF using the PostgreSQL lesson ID
    await savePdfOffline(lessonId, pdfBlob);

    // 3. Publish the lesson
    await publishLesson(lessonId);

    setPublished(true);

    setStatus(
      "Lesson published successfully. Students can now access it."
    );

    console.log("Published PDF lesson:", lessonId);

  } catch (error) {
    console.error("Publish PDF error:", error);

    setStatus(
      error.message || "Could not publish the PDF lesson."
    );
  } finally {
    setLoading(false);
  }
};
  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <div>
            <div style={styles.badge}>TEACHER TOOL</div>

            <h1 style={styles.title}>
              Publish Lesson
            </h1>

            <p style={styles.subtitle}>
              Upload an English lesson PDF and convert it into Santali
              using Ol Chiki script.
            </p>
          </div>
        </div>

        <div style={styles.pipeline}>

          <div style={styles.step}>
            <div style={styles.stepIcon}>📄</div>
            <div>
              <strong>Upload</strong>
              <span>English PDF</span>
            </div>
          </div>

          <div style={styles.arrow}>→</div>

          <div style={styles.step}>
            <div style={styles.stepIcon}>🤖</div>
            <div>
              <strong>Translate</strong>
              <span>AI + IndicTrans2</span>
            </div>
          </div>

          <div style={styles.arrow}>→</div>

          <div style={styles.step}>
            <div style={styles.stepIcon}>👀</div>
            <div>
              <strong>Review</strong>
              <span>Santali PDF</span>
            </div>
          </div>

          <div style={styles.arrow}>→</div>

          <div style={styles.step}>
            <div style={styles.stepIcon}>✅</div>
            <div>
              <strong>Publish</strong>
              <span>For students</span>
            </div>
          </div>

        </div>

        <div style={styles.card}>

          <h2 style={styles.cardTitle}>
            Upload English Lesson
          </h2>

          <p style={styles.cardText}>
            Select a PDF containing your English teaching material.
          </p>

          <label style={styles.uploadBox}>

            <div style={styles.uploadIcon}>
              📄
            </div>

            <div style={styles.uploadTitle}>
              {file
                ? file.name
                : "Click to choose an English PDF"}
            </div>

            <div style={styles.uploadHint}>
              PDF files only
            </div>

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

          </label>

          {file && (
            <div style={styles.fileInfo}>
              <span>Selected:</span>

              <strong>
                {file.name}
              </strong>

              <span>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          )}

          <button
            onClick={handleTranslate}
            disabled={!file || loading}
            style={{
              ...styles.translateButton,
              opacity: !file || loading ? 0.6 : 1,
              cursor: !file || loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "🔄 Translating..."
              : "🔄 Translate to Santali"}
          </button>

          {status && (
            <div
              style={{
                ...styles.status,
                background: published
                  ? "#ecfdf5"
                  : status.includes("failed") ||
                    status.includes("Please")
                  ? "#fef2f2"
                  : "#eff6ff",
                color: published
                  ? "#047857"
                  : status.includes("failed") ||
                    status.includes("Please")
                  ? "#b91c1c"
                  : "#1d4ed8",
              }}
            >
              {status}
            </div>
          )}

        </div>

        {pdfUrl && (
          <div style={styles.previewCard}>

            <div style={styles.previewHeader}>

              <div>
                <h2 style={styles.previewTitle}>
                  Santali PDF Preview
                </h2>

                <p style={styles.previewSubtitle}>
                  Review the AI-generated translation before publishing.
                </p>
              </div>

              <div style={styles.actions}>

                <button
                  onClick={handleDownload}
                  style={styles.downloadButton}
                >
                  ⬇️ Download
                </button>

                <button
                  onClick={handlePublish}
                  style={styles.publishButton}
                >
                  {published
                    ? "✅ Published"
                    : "🚀 Publish Lesson"}
                </button>

              </div>

            </div>

            <div style={styles.previewWrapper}>
              <iframe
                src={pdfUrl}
                title="Santali PDF Preview"
                style={styles.preview}
              />
            </div>

          </div>
        )}

        <div style={styles.infoSection}>

          <div style={styles.infoItem}>
            <span style={styles.infoIcon}>🌐</span>

            <div>
              <strong>English → Santali</strong>
              <p>
                Powered by AI4Bharat IndicTrans2.
              </p>
            </div>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.infoIcon}>🔤</span>

            <div>
              <strong>Ol Chiki Script</strong>
              <p>
                Santali content is generated using Ol Chiki Unicode.
              </p>
            </div>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.infoIcon}>👩‍🏫</span>

            <div>
              <strong>Teacher Review</strong>
              <p>
                Teachers can review the AI translation before publishing.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "calc(100vh - 70px)",
    background: "#f8fafc",
    padding: "40px 24px 60px",
    boxSizing: "border-box",
  },

  container: {
    maxWidth: "1150px",
    margin: "0 auto",
  },

  header: {
    marginBottom: "30px",
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "0.08em",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    fontSize: "34px",
    color: "#111827",
  },

  subtitle: {
    marginTop: "10px",
    color: "#6b7280",
    fontSize: "16px",
    maxWidth: "700px",
    lineHeight: 1.6,
  },

  pipeline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "18px 24px",
    marginBottom: "25px",
    overflowX: "auto",
  },

  step: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: "150px",
  },

  stepIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0,
  },

  step: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: "150px",
  },

  arrow: {
    color: "#9ca3af",
    fontSize: "24px",
    margin: "0 10px",
  },

  card: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "30px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
  },

  cardTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#111827",
  },

  cardText: {
    color: "#6b7280",
    marginTop: "7px",
    marginBottom: "22px",
  },

  uploadBox: {
    border: "2px dashed #93c5fd",
    borderRadius: "16px",
    minHeight: "190px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    background: "#f8fbff",
    transition: "0.2s",
  },

  uploadIcon: {
    fontSize: "42px",
    marginBottom: "12px",
  },

  uploadTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    padding: "0 15px",
  },

  uploadHint: {
    color: "#6b7280",
    fontSize: "13px",
    marginTop: "7px",
  },

  fileInfo: {
    marginTop: "15px",
    background: "#f3f4f6",
    borderRadius: "10px",
    padding: "12px 15px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
    color: "#6b7280",
    fontSize: "14px",
  },

  translateButton: {
    width: "100%",
    marginTop: "20px",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    fontSize: "16px",
    fontWeight: "700",
  },

  status: {
    marginTop: "18px",
    padding: "13px 15px",
    borderRadius: "10px",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  previewCard: {
    marginTop: "25px",
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "25px",
  },

  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  previewTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "22px",
  },

  previewSubtitle: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  downloadButton: {
    border: "1px solid #d1d5db",
    background: "white",
    color: "#374151",
    padding: "11px 16px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  publishButton: {
    border: "none",
    background: "#16a34a",
    color: "white",
    padding: "11px 16px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  previewWrapper: {
    height: "700px",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#f3f4f6",
  },

  preview: {
    width: "100%",
    height: "100%",
    border: "none",
  },

  infoSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "15px",
    marginTop: "25px",
  },

  infoItem: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "18px",
    display: "flex",
    gap: "13px",
  },

  infoIcon: {
    fontSize: "23px",
  },
};

export default PdfPublisher;
