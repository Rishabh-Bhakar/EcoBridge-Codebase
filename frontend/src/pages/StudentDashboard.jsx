import { useState } from "react";

// ============================================================
// PDF INDEXEDDB
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


async function getPdfOffline(id) {
  const db = await openPdfDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      "pdfs",
      "readonly"
    );

    const request =
      transaction.objectStore("pdfs").get(
        String(id)
      );

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}


// ============================================================
// COMPONENT
// ============================================================

function StudentDashboard() {

  const [lessons, setLessons] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          "echobridge_lessons"
        ) || "[]"
      );
    } catch {
      return [];
    }
  });


  const [downloaded, setDownloaded] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "echobridge_downloaded_lessons"
          ) || "[]"
        );
      } catch {
        return [];
      }
    });


  const [selectedLesson, setSelectedLesson] =
    useState(null);


  const [openingPdf, setOpeningPdf] =
    useState(false);


  const [message, setMessage] =
    useState("");


  // ==========================================================
  // PUBLISHED LESSONS
  // ==========================================================

  const publishedLessons =
    lessons.filter(
      (lesson) =>
        lesson.published === true
    );


  // ==========================================================
  // DOWNLOADED CHECK
  // ==========================================================

  const isDownloaded = (id) => {
    return downloaded.some(
      (lesson) =>
        lesson.id === id
    );
  };


  // ==========================================================
  // DOWNLOAD LESSON
  // ==========================================================

  async function downloadLesson(lesson) {

    if (isDownloaded(lesson.id)) {
      return;
    }

    try {

      // ------------------------------------------------------
      // PDF is already stored in IndexedDB when published.
      // We only store its metadata in localStorage here.
      // ------------------------------------------------------

      if (lesson.type === "pdf") {

        const pdfBlob =
          await getPdfOffline(
            lesson.id
          );

        if (!pdfBlob) {
          setMessage(
            "PDF is not available in offline storage."
          );
          return;
        }
      }


      const updated = [
        ...downloaded,
        lesson,
      ];


      localStorage.setItem(
        "echobridge_downloaded_lessons",
        JSON.stringify(updated)
      );


      setDownloaded(updated);

      setMessage(
        "Lesson is now available offline."
      );

    } catch (err) {

      console.error(
        "Download error:",
        err
      );

      setMessage(
        "Could not save lesson offline."
      );
    }
  }


  // ==========================================================
  // VIEW PDF
  // ==========================================================

  async function viewPdf(lesson) {

    if (!lesson || lesson.type !== "pdf") {
      return;
    }


    try {

      setOpeningPdf(true);
      setMessage("Opening Santali PDF...");


      const blob =
        await getPdfOffline(
          lesson.id
        );


      if (!blob) {

        setMessage(
          "PDF is not available offline. Download it first."
        );

        setOpeningPdf(false);

        return;
      }


      const url =
        URL.createObjectURL(blob);


      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );


      // Give the browser time to load the PDF
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);


      setMessage(
        "Santali PDF opened successfully."
      );

    } catch (err) {

      console.error(
        "PDF view error:",
        err
      );

      setMessage(
        "Could not open the PDF."
      );

    } finally {

      setOpeningPdf(false);
    }
  }


  // ==========================================================
  // VIEW TEXT LESSON
  // ==========================================================

  function viewTextLesson(lesson) {
    setSelectedLesson(lesson);
    setMessage("");
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div style={styles.container}>

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div style={styles.header}>

        <div>

          <p style={styles.tag}>
            STUDENT PORTAL
          </p>

          <h1 style={styles.title}>
            Welcome, Student 👋
          </h1>

          <p style={styles.subtitle}>
            Learn your lessons in Santali,
            even with limited internet connectivity.
          </p>

        </div>


        <div style={styles.offlineBadge}>
          📱 Offline Learning
        </div>

      </div>


      {/* ================================================== */}
      {/* MESSAGE */}
      {/* ================================================== */}

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}


      {/* ================================================== */}
      {/* STATS */}
      {/* ================================================== */}

      <div style={styles.stats}>

        <div style={styles.statCard}>

          <div style={styles.icon}>
            📚
          </div>

          <div>

            <strong style={styles.number}>
              {publishedLessons.length}
            </strong>

            <p style={styles.statText}>
              Available Lessons
            </p>

          </div>

        </div>


        <div style={styles.statCard}>

          <div style={styles.icon}>
            ⬇️
          </div>

          <div>

            <strong style={styles.number}>
              {downloaded.length}
            </strong>

            <p style={styles.statText}>
              Downloaded
            </p>

          </div>

        </div>


        <div style={styles.statCard}>

          <div style={styles.icon}>
            🗣️
          </div>

          <div>

            <strong style={styles.number}>
              Santali
            </strong>

            <p style={styles.statText}>
              Learning Language
            </p>

          </div>

        </div>

      </div>


      {/* ================================================== */}
      {/* AVAILABLE LESSONS */}
      {/* ================================================== */}

      <h2 style={styles.sectionTitle}>
        Available Lessons
      </h2>


      {publishedLessons.length === 0 ? (

        <div style={styles.empty}>

          <div style={styles.emptyIcon}>
            📚
          </div>

          <h2>
            No lessons available
          </h2>

          <p>
            Your teacher has not published any
            lessons yet.
          </p>

        </div>

      ) : (

        <div style={styles.grid}>

          {publishedLessons
            .slice()
            .reverse()
            .map((lesson) => {

              const isPdf =
                lesson.type === "pdf";


              const source =
                lesson.sourceLanguage ===
                "english"
                  ? "English"
                  : "Hindi";


              const flag =
                lesson.sourceLanguage ===
                "english"
                  ? "🇬🇧"
                  : "🇮🇳";


              const saved =
                isDownloaded(
                  lesson.id
                );


              return (

                <div
                  key={lesson.id}
                  style={styles.lessonCard}
                >

                  {/* CARD TOP */}

                  <div style={styles.cardTop}>

                    <div>

                      <span style={styles.language}>
                        {flag} {source}
                      </span>

                      <span style={styles.arrow}>
                        →
                      </span>

                      <span style={styles.language}>
                        🗣️ Santali
                      </span>

                    </div>


                    {isPdf && (
                      <span style={styles.pdfBadge}>
                        📄 PDF
                      </span>
                    )}

                  </div>


                  <div style={styles.divider} />


                  {/* TITLE */}

                  <h3 style={styles.lessonTitle}>

                    {isPdf
                      ? lesson.input
                      : "Lesson"}

                  </h3>


                  {/* ORIGINAL */}

                  {!isPdf && (
                    <p style={styles.original}>
                      {lesson.input}
                    </p>
                  )}


                  {isPdf && (
                    <p style={styles.pdfDescription}>
                      Santali educational PDF
                      translated by EchoBridge.
                    </p>
                  )}


                  {/* TRANSLATION */}

                  <div style={styles.translationBox}>

                    <div
                      style={
                        styles.translationHeader
                      }
                    >

                      <strong>
                        Santali
                      </strong>

                      <span
                        style={styles.script}
                      >
                        Ol Chiki
                      </span>

                    </div>


                    <p
                      style={
                        styles.translation
                      }
                    >
                      {isPdf
                        ? "Santali PDF lesson"
                        : lesson.translation}
                    </p>

                  </div>


                  {/* ACTIONS */}

                  <div style={styles.actions}>

                    {/* VIEW */}

                    <button
                      onClick={() =>
                        isPdf
                          ? viewPdf(lesson)
                          : viewTextLesson(
                              lesson
                            )
                      }
                      disabled={
                        isPdf &&
                        openingPdf
                      }
                      style={
                        styles.viewButton
                      }
                    >

                      {isPdf
                        ? "📖 View PDF"
                        : "📖 View Lesson"}

                    </button>


                    {/* DOWNLOAD */}

                    {!saved && (

                      <button
                        onClick={() =>
                          downloadLesson(
                            lesson
                          )
                        }
                        style={
                          styles.downloadButton
                        }
                      >
                        ⬇️ Download
                      </button>

                    )}


                    {saved && (

                      <button
                        disabled
                        style={
                          styles.offlineButton
                        }
                      >
                        ✓ Offline
                      </button>

                    )}

                  </div>

                </div>
              );
            })}

        </div>
      )}


      {/* ================================================== */}
      {/* TEXT LESSON VIEWER */}
      {/* ================================================== */}

      {selectedLesson && (
        <div style={styles.viewerOverlay}>

          <div style={styles.viewer}>

            <div style={styles.viewerHeader}>

              <div>

                <p style={styles.viewerTag}>
                  OFFLINE / ONLINE LESSON
                </p>

                <h2 style={styles.viewerTitle}>
                  Hindi / English → Santali
                </h2>

              </div>


              <button
                onClick={() =>
                  setSelectedLesson(null)
                }
                style={styles.closeButton}
              >
                ✕
              </button>

            </div>


            <div style={styles.divider} />


            <h3>
              Original Lesson
            </h3>

            <p style={styles.viewerOriginal}>
              {selectedLesson.input}
            </p>


            <div
              style={
                styles.viewerTranslation
              }
            >

              <div
                style={
                  styles.translationHeader
                }
              >

                <strong>
                  Santali Translation
                </strong>

                <span
                  style={styles.script}
                >
                  Ol Chiki
                </span>

              </div>


              <p style={styles.viewerSantali}>
                {selectedLesson.translation}
              </p>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = {

  container: {
    minHeight:
      "calc(100vh - 70px)",
    padding: "40px",
    background: "#f5f7fb",
    fontFamily:
      "Arial, sans-serif",
    boxSizing: "border-box",
  },


  header: {
    maxWidth: "1100px",
    margin:
      "0 auto 30px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
  },


  tag: {
    margin:
      "0 0 8px",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "1px",
  },


  title: {
    margin: 0,
    fontSize: "32px",
    color: "#111827",
  },


  subtitle: {
    marginTop: "8px",
    color: "#6b7280",
    fontSize: "15px",
  },


  offlineBadge: {
    padding:
      "12px 16px",
    borderRadius: "20px",
    background: "#dcfce7",
    color: "#15803d",
    fontWeight: "bold",
    whiteSpace:
      "nowrap",
  },


  message: {
    maxWidth: "1100px",
    margin:
      "0 auto 20px",
    padding: "12px 16px",
    background: "#eff6ff",
    border:
      "1px solid #bfdbfe",
    color: "#1d4ed8",
    borderRadius: "10px",
    textAlign: "center",
    fontWeight: "600",
  },


  stats: {
    maxWidth: "1100px",
    margin:
      "0 auto 35px",
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "18px",
  },


  statCard: {
    background: "white",
    padding: "20px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)",
  },


  icon: {
    fontSize: "30px",
  },


  number: {
    fontSize: "21px",
    color: "#111827",
  },


  statText: {
    margin:
      "4px 0 0",
    color: "#6b7280",
    fontSize: "13px",
  },


  sectionTitle: {
    maxWidth: "1100px",
    margin:
      "0 auto 18px",
    color: "#111827",
  },


  grid: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "22px",
  },


  lessonCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.06)",
  },


  cardTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "10px",
  },


  language: {
    fontWeight: "bold",
    color: "#374151",
  },


  arrow: {
    color: "#2563eb",
    fontSize: "18px",
    margin:
      "0 5px",
  },


  pdfBadge: {
    padding:
      "6px 9px",
    borderRadius: "7px",
    background: "#ede9fe",
    color: "#6d28d9",
    fontSize: "12px",
    fontWeight: "bold",
  },


  divider: {
    height: "1px",
    background: "#e5e7eb",
    margin:
      "18px 0",
  },


  lessonTitle: {
    color: "#111827",
    wordBreak: "break-word",
  },


  original: {
    color: "#4b5563",
    lineHeight: "1.7",
    fontSize: "16px",
  },


  pdfDescription: {
    color: "#6b7280",
    lineHeight: "1.6",
  },


  translationBox: {
    marginTop: "20px",
    padding: "18px",
    borderRadius: "12px",
    background: "#f0fdf4",
    border:
      "1px solid #bbf7d0",
  },


  translationHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "10px",
  },


  script: {
    fontSize: "12px",
    background: "#dcfce7",
    color: "#15803d",
    padding:
      "5px 8px",
    borderRadius: "6px",
    fontWeight: "bold",
  },


  translation: {
    marginBottom: 0,
    fontSize: "21px",
    lineHeight: "1.8",
    wordBreak: "break-word",
  },


  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "18px",
  },


  viewButton: {
    flex: 1,
    padding: "13px",
    border: "none",
    borderRadius: "9px",
    background: "#2563eb",
    color: "white",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },


  downloadButton: {
    flex: 1,
    padding: "13px",
    border: "none",
    borderRadius: "9px",
    background: "#16a34a",
    color: "white",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },


  offlineButton: {
    flex: 1,
    padding: "13px",
    border: "none",
    borderRadius: "9px",
    background: "#dcfce7",
    color: "#15803d",
    fontSize: "14px",
    fontWeight: "bold",
  },


  empty: {
    maxWidth: "600px",
    margin:
      "70px auto",
    padding:
      "55px 30px",
    textAlign: "center",
    background: "white",
    borderRadius: "18px",
  },


  emptyIcon: {
    fontSize: "55px",
  },


  viewerOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "25px",
    zIndex: 1000,
    boxSizing: "border-box",
  },


  viewer: {
    width: "100%",
    maxWidth: "800px",
    maxHeight: "85vh",
    overflowY: "auto",
    background: "white",
    borderRadius: "18px",
    padding: "30px",
    boxSizing: "border-box",
  },


  viewerHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
  },


  viewerTag: {
    margin:
      "0 0 5px",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "1px",
  },


  viewerTitle: {
    margin: 0,
    color: "#111827",
  },


  closeButton: {
    border: "none",
    background: "#f3f4f6",
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "18px",
  },


  viewerOriginal: {
    fontSize: "17px",
    lineHeight: "1.8",
    color: "#374151",
  },


  viewerTranslation: {
    marginTop: "25px",
    padding: "22px",
    background: "#f0fdf4",
    border:
      "1px solid #bbf7d0",
    borderRadius: "12px",
  },


  viewerSantali: {
    fontSize: "24px",
    lineHeight: "1.9",
    color: "#111827",
    wordBreak: "break-word",
  },

};


export default StudentDashboard;
