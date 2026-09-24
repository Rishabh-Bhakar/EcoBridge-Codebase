import {useEffect,useState } from "react";

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
// OFFLINE LESSON INDEXEDDB
// ============================================================

function openLessonDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      "EchoBridgeLessonDatabase",
      1
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("lessons")) {
        db.createObjectStore("lessons", {
          keyPath: "id",
        });
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

async function getOfflineLessons() {
  const db = await openLessonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      "lessons",
      "readonly"
    );

    const request = transaction
      .objectStore("lessons")
      .getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function deleteLessonOffline(id) {
  const db = await openLessonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      "lessons",
      "readwrite"
    );

    transaction.objectStore("lessons").delete(id);

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
// COMPONENT
// ============================================================

function OfflineContent() {

 const [lessons, setLessons] = useState([]);

useEffect(() => {
  async function loadOfflineLessons() {
    try {
      const indexedLessons = await getOfflineLessons();

      if (indexedLessons.length > 0) {
        setLessons(indexedLessons);
        return;
      }

      
      setLessons([]);
    } catch (error) {
      console.error("Could not load offline lessons:", error);

      try {
       setLessons([]);
      } catch {
        setLessons([]);
      }
    }
  }

  loadOfflineLessons();
}, []);

  const [selectedLesson, setSelectedLesson] =
    useState(null);


  const [message, setMessage] =
    useState("");


  const [openingPdf, setOpeningPdf] =
    useState(false);


  // ==========================================================
  // REMOVE LESSON
  // ==========================================================

 const removeLesson = async (id) => {
  try {
    await deleteLessonOffline(id);
  } catch (error) {
    console.error("Could not remove lesson from IndexedDB:", error);
  }

  const updatedLessons = lessons.filter(
    (lesson) => lesson.id !== id
  );

  

  setLessons(updatedLessons);

  if (selectedLesson?.id === id) {
    setSelectedLesson(null);
  }

  setMessage("Lesson removed from offline storage.");
};  // ==========================================================
  // SELECT TEXT LESSON
  // ==========================================================

  function selectTextLesson(lesson) {

    setSelectedLesson(
      lesson
    );

    setMessage("");
  }


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
            Offline Content
          </h1>

          <p style={styles.subtitle}>
            Your downloaded lessons are available
            even without an internet connection.
          </p>

        </div>


        <div style={styles.offlineBadge}>
          🟢 Available Offline
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
      {/* INFO */}
      {/* ================================================== */}

      <div style={styles.infoBox}>

        <div style={styles.infoIcon}>
          📱
        </div>

        <div>

          <h3 style={styles.infoTitle}>
            Learn without internet
          </h3>

          <p style={styles.infoText}>
            These lessons are stored on this device.
            Downloaded PDFs are stored locally and can
            be opened even when network connectivity
            is unavailable.
          </p>

        </div>

      </div>


      {/* ================================================== */}
      {/* EMPTY */}
      {/* ================================================== */}

      {lessons.length === 0 ? (

        <div style={styles.empty}>

          <div style={styles.emptyIcon}>
            📥
          </div>

         <h2 style={{ color: "#111827", margin: "14px 0 10px" }}>
  No offline lessons yet
</h2>
          <p>
            Go to Student Dashboard and download
            a lesson first.
          </p>

        </div>

      ) : (

        <div style={styles.content}>

          {/* ================================================= */}
          {/* LESSON LIST */}
          {/* ================================================= */}

          <div style={styles.list}>

            <h2 style={styles.sectionTitle}>
              Downloaded Lessons
            </h2>


            {lessons
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


                return (

                  <div
                    key={lesson.id}
                    style={{
                      ...styles.lessonItem,
                      ...(selectedLesson?.id ===
                      lesson.id
                        ? styles.selectedItem
                        : {}),
                    }}
                  >

                    {/* TOP */}

                    <div
                      style={
                        styles.lessonItemTop
                      }
                    >

                      <span>
                        {source === "Hindi"
                          ? "🇮🇳"
                          : "🇬🇧"}{" "}
                        {source}
                      </span>

                      <span>
                        →
                      </span>

                      <span>
                        🗣️ Santali
                      </span>

                    </div>


                    {/* TYPE */}

                    {isPdf && (

                      <span
                        style={
                          styles.pdfBadge
                        }
                      >
                        📄 PDF
                      </span>

                    )}


                    {/* NAME / PREVIEW */}

                    <p
                      style={
                        styles.preview
                      }
                    >

                      {isPdf
                        ? lesson.input
                        : lesson.input?.slice(
                            0,
                            65
                          )}

                      {!isPdf &&
                        lesson.input?.length >
                          65 &&
                        "..."}

                    </p>


                    {/* STATUS */}

                    <span
                      style={
                        styles.offlineSmall
                      }
                    >
                      ✓ Offline
                    </span>


                    {/* ACTIONS */}

                    <div
                      style={
                        styles.itemActions
                      }
                    >

                      {/* VIEW PDF */}

                      {isPdf ? (

                        <button
                          onClick={() =>
                            viewPdf(
                              lesson
                            )
                          }
                          disabled={
                            openingPdf
                          }
                          style={
                            styles.viewButton
                          }
                        >
                          📖 View PDF
                        </button>

                      ) : (

                        <button
                          onClick={() =>
                            selectTextLesson(
                              lesson
                            )
                          }
                          style={
                            styles.viewButton
                          }
                        >
                          📖 View Lesson
                        </button>

                      )}


                    </div>

                  </div>

                );
              })}

          </div>


          {/* ================================================= */}
          {/* VIEWER */}
          {/* ================================================= */}

          <div style={styles.viewer}>

            {!selectedLesson ? (

              <div style={styles.viewerEmpty}>

                <div style={styles.viewerIcon}>
                  📖
                </div>

                <h2>
                  Select a text lesson
                </h2>

                <p>
                  PDF lessons can be opened directly
                  using the View PDF button.
                </p>

              </div>

            ) : (

              <div>

                <div
                  style={
                    styles.viewerHeader
                  }
                >

                  <div>

                    <p
                      style={
                        styles.viewerTag
                      }
                    >
                      OFFLINE LESSON
                    </p>

                    <h2
                      style={
                        styles.viewerTitle
                      }
                    >
                      {selectedLesson
                        .sourceLanguage ===
                      "english"
                        ? "English → Santali"
                        : "Hindi → Santali"}
                    </h2>

                  </div>


                  <span
                    style={
                      styles.offlineBadge
                    }
                  >
                    ✓ Offline
                  </span>

                </div>


                <div
                  style={
                    styles.divider
                  }
                />


                {/* ORIGINAL */}

                <div
                  style={
                    styles.originalSection
                  }
                >

                  <div
                    style={
                      styles.labelRow
                    }
                  >

                    <strong>
                      Original Lesson
                    </strong>

                    <span
                      style={
                        styles.badge
                      }
                    >
                      {selectedLesson
                        .sourceLanguage ===
                      "english"
                        ? "English"
                        : "Hindi"}
                    </span>

                  </div>


                  <p
                    style={
                      styles.originalText
                    }
                  >
                    {selectedLesson.input}
                  </p>

                </div>


                {/* TRANSLATION */}

                <div
                  style={
                    styles.translationBox
                  }
                >

                  <div
                    style={
                      styles.labelRow
                    }
                  >

                    <strong>
                      Santali Translation
                    </strong>

                    <span
                      style={
                        styles.greenBadge
                      }
                    >
                      Ol Chiki
                    </span>

                  </div>


                  <p
                    style={
                      styles.translation
                    }
                  >
                    {selectedLesson.translation}
                  </p>

                </div>


                {/* REMOVE */}

                <button
                  onClick={() =>
                    removeLesson(
                      selectedLesson.id
                    )
                  }
                  style={
                    styles.removeButton
                  }
                >
                  🗑 Remove from Offline Storage
                </button>

              </div>

            )}

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
    color: "#111827",
    fontSize: "32px",
  },


  subtitle: {
    margin:
      "8px 0 0",
    color: "#6b7280",
    fontSize: "15px",
  },


  offlineBadge: {
    padding:
      "11px 15px",
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
    padding:
      "12px 16px",
    background: "#eff6ff",
    border:
      "1px solid #bfdbfe",
    color: "#1d4ed8",
    borderRadius: "10px",
    textAlign: "center",
    fontWeight: "600",
  },


  infoBox: {
    maxWidth: "1100px",
    margin:
      "0 auto 30px",
    padding: "20px",
    background: "#eff6ff",
    border:
      "1px solid #bfdbfe",
    borderRadius: "14px",
    display: "flex",
    gap: "15px",
    alignItems:
      "flex-start",
    boxSizing:
      "border-box",
  },


  infoIcon: {
    fontSize: "30px",
  },


  infoTitle: {
    margin:
      "0 0 6px",
    color: "#1e3a8a",
  },


  infoText: {
    margin: 0,
    color: "#475569",
    lineHeight: "1.6",
  },


  content: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "350px minmax(0, 1fr)",
    gap: "22px",
  },


  list: {
    background: "white",
    padding: "20px",
    borderRadius: "16px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)",
  },


  sectionTitle: {
    margin:
      "0 0 15px",
    fontSize: "19px",
    color: "#111827",
  },


  lessonItem: {
    width: "100%",
    padding: "15px",
    marginBottom: "10px",
    border:
      "1px solid #e5e7eb",
    borderRadius: "10px",
    background: "white",
    boxSizing:
      "border-box",
  },


  selectedItem: {
    border:
      "2px solid #2563eb",
    background: "#eff6ff",
  },


  lessonItemTop: {
    display: "flex",
    gap: "5px",
    flexWrap: "wrap",
    fontWeight: "bold",
    color: "#374151",
  },


  pdfBadge: {
    display: "inline-block",
    marginTop: "8px",
    padding:
      "5px 8px",
    borderRadius: "6px",
    background: "#ede9fe",
    color: "#6d28d9",
    fontSize: "11px",
    fontWeight: "bold",
  },


  preview: {
    margin:
      "10px 0",
    color: "#6b7280",
    lineHeight: "1.5",
    wordBreak:
      "break-word",
  },


  offlineSmall: {
    color: "#16a34a",
    fontSize: "12px",
    fontWeight: "bold",
  },


  itemActions: {
    marginTop: "12px",
  },


  viewButton: {
    width: "100%",
    padding: "10px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },


  viewer: {
    minHeight: "500px",
    background: "white",
    padding: "28px",
    borderRadius: "16px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)",
    boxSizing:
      "border-box",
  },


  viewerEmpty: {
    minHeight: "450px",
    display: "flex",
    flexDirection: "column",
    justifyContent:
      "center",
    alignItems: "center",
    textAlign: "center",
    color: "#6b7280",
  },


  viewerIcon: {
    fontSize: "55px",
    marginBottom: "10px",
  },


  viewerHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
  },


  viewerTag: {
    margin:
      "0 0 5px",
    color: "#16a34a",
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "1px",
  },


  viewerTitle: {
    margin: 0,
    color: "#111827",
  },


  divider: {
    height: "1px",
    background: "#e5e7eb",
    margin:
      "20px 0",
  },


  originalSection: {
    marginBottom: "25px",
  },


  labelRow: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom:
      "12px",
  },


  badge: {
    padding:
      "5px 9px",
    borderRadius: "6px",
    background: "#f3f4f6",
    color: "#4b5563",
    fontSize: "12px",
  },


  greenBadge: {
    padding:
      "5px 9px",
    borderRadius: "6px",
    background: "#dcfce7",
    color: "#15803d",
    fontSize: "12px",
    fontWeight: "bold",
  },


  originalText: {
    fontSize: "17px",
    lineHeight: "1.8",
    color: "#374151",
  },


  translationBox: {
    padding: "20px",
    background: "#f0fdf4",
    border:
      "1px solid #bbf7d0",
    borderRadius: "12px",
  },


  translation: {
    margin: 0,
    fontSize: "23px",
    lineHeight: "1.9",
    color: "#111827",
    wordBreak:
      "break-word",
  },


  removeButton: {
    marginTop: "25px",
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "9px",
    background: "#fee2e2",
    color: "#dc2626",
    fontWeight: "bold",
    cursor: "pointer",
  },


  empty: {
    maxWidth: "600px",
    margin:
      "70px auto",
    padding:
      "60px 30px",
    textAlign: "center",
    background: "white",
    borderRadius: "20px",
  },


  emptyIcon: {
    fontSize: "55px",
  },

};


export default OfflineContent;
