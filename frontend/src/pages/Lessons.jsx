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
// LESSONS COMPONENT
// ============================================================

function Lessons() {

  // ==========================================================
  // LESSON STATE
  // ==========================================================

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


  // ==========================================================
  // MESSAGE
  // ==========================================================

  const [message, setMessage] =
    useState("");


  // ==========================================================
  // VIEW PDF
  // ==========================================================

  const viewPdf = async (lesson) => {

    try {

      setMessage(
        "Opening Santali PDF..."
      );


      // ------------------------------------------------------
      // Get PDF from IndexedDB
      // ------------------------------------------------------

      const blob =
        await getPdfOffline(
          lesson.id
        );


      if (!blob) {

        setMessage(
          "PDF is not available in local storage."
        );

        return;

      }


      // ------------------------------------------------------
      // Create temporary browser URL
      // ------------------------------------------------------

      const url =
        URL.createObjectURL(
          blob
        );


      // ------------------------------------------------------
      // Open PDF
      // ------------------------------------------------------

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );


      // ------------------------------------------------------
      // Cleanup after 1 minute
      // ------------------------------------------------------

      setTimeout(() => {

        URL.revokeObjectURL(
          url
        );

      }, 60000);


      setMessage(
        "Santali PDF opened successfully."
      );

    }

    catch (error) {

      console.error(
        "PDF view error:",
        error
      );

      setMessage(
        "Could not open the PDF."
      );

    }

  };


  // ==========================================================
  // DELETE LESSON
  // ==========================================================

  const deleteLesson = (id) => {

    const updatedLessons =
      lessons.filter(
        (lesson) =>
          lesson.id !== id
      );


    localStorage.setItem(
      "echobridge_lessons",
      JSON.stringify(
        updatedLessons
      )
    );


    setLessons(
      updatedLessons
    );


    setMessage(
      "Lesson deleted successfully."
    );

  };


  // ==========================================================
  // TOGGLE PUBLISH
  // ==========================================================

  const togglePublish = (id) => {

    const updatedLessons =
      lessons.map(
        (lesson) => {

          if (
            lesson.id === id
          ) {

            return {
              ...lesson,
              published:
                !lesson.published,
            };

          }

          return lesson;

        }
      );


    localStorage.setItem(
      "echobridge_lessons",
      JSON.stringify(
        updatedLessons
      )
    );


    setLessons(
      updatedLessons
    );


    const lesson =
      lessons.find(
        (item) =>
          item.id === id
      );


    if (lesson) {

      setMessage(
        lesson.published
          ? "Lesson unpublished."
          : "Lesson published to students."
      );

    }

  };


  // ==========================================================
  // CLEAR ALL
  // ==========================================================

  const clearAllLessons = () => {

    if (
      lessons.length === 0
    ) {

      return;

    }


    const confirmed =
      window.confirm(
        "Delete all saved lessons?"
      );


    if (!confirmed) {

      return;

    }


    localStorage.removeItem(
      "echobridge_lessons"
    );


    setLessons([]);


    setMessage(
      "All lessons deleted."
    );

  };


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div
      style={
        styles.container
      }
    >

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div
        style={
          styles.header
        }
      >

        <div>

          <p
            style={
              styles.tag
            }
          >
            TEACHER PORTAL
          </p>


          <h1
            style={
              styles.title
            }
          >
            My Lessons
          </h1>


          <p
            style={
              styles.subtitle
            }
          >
            View, manage and publish your multilingual
            educational lessons.
          </p>

        </div>


        <div
          style={
            styles.headerActions
          }
        >

          <div
            style={
              styles.count
            }
          >

            {lessons.length}{" "}

            {lessons.length === 1
              ? "Lesson"
              : "Lessons"}

          </div>


          {lessons.length > 0 && (

            <button
              onClick={
                clearAllLessons
              }
              style={
                styles.clearButton
              }
            >
              Clear All
            </button>

          )}

        </div>

      </div>


      {/* ================================================== */}
      {/* MESSAGE */}
      {/* ================================================== */}

      {message && (

        <div
          style={
            styles.message
          }
        >
          {message}
        </div>

      )}


      {/* ================================================== */}
      {/* EMPTY STATE */}
      {/* ================================================== */}

      {lessons.length === 0 ? (

        <div
          style={
            styles.empty
          }
        >

          <div
            style={
              styles.emptyIcon
            }
          >
            📚
          </div>


          <h2>
            No lessons saved yet
          </h2>


          <p>
            Translate a lesson and save it here.
          </p>

        </div>

      ) : (

        /* ================================================== */
        /* LESSON GRID */
        /* ================================================== */

        <div
          style={
            styles.grid
          }
        >

          {lessons
            .slice()
            .reverse()
            .map(
              (lesson) => {

                // ------------------------------------------------
                // Source language
                // ------------------------------------------------

                const sourceLanguage =
                  lesson.sourceLanguage ===
                  "english"
                    ? "English"
                    : "Hindi";


                const sourceFlag =
                  lesson.sourceLanguage ===
                  "english"
                    ? "🇬🇧"
                    : "🇮🇳";


                // ------------------------------------------------
                // Published state
                // ------------------------------------------------

                const published =
                  lesson.published === true;


                // ------------------------------------------------
                // PDF lesson
                // ------------------------------------------------

                const isPdf =
                  lesson.type === "pdf";


                return (

                  <div
                    key={
                      lesson.id
                    }
                    style={
                      styles.card
                    }
                  >

                    {/* ====================================== */}
                    {/* CARD TOP */}
                    {/* ====================================== */}

                    <div
                      style={
                        styles.cardTop
                      }
                    >

                      <div
                        style={
                          styles.languageFlow
                        }
                      >

                        <span>
                          {sourceFlag}{" "}
                          {sourceLanguage}
                        </span>


                        <span
                          style={
                            styles.arrow
                          }
                        >
                          →
                        </span>


                        <span>
                          🗣️ Santali
                        </span>

                      </div>


                      <div
                        style={
                          styles.badgeGroup
                        }
                      >

                        {isPdf && (

                          <span
                            style={
                              styles.pdfBadge
                            }
                          >
                            📄 PDF
                          </span>

                        )}


                        <span
                          style={
                            published
                              ? styles.publishedBadge
                              : styles.draftBadge
                          }
                        >
                          {published
                            ? "● Published"
                            : "● Draft"}
                        </span>

                      </div>

                    </div>


                    <div
                      style={
                        styles.divider
                      }
                    />


                    {/* ====================================== */}
                    {/* ORIGINAL LESSON */}
                    {/* ====================================== */}

                    <div
                      style={
                        styles.section
                      }
                    >

                      <div
                        style={
                          styles.sectionHeader
                        }
                      >

                        <h3>
                          Original Lesson
                        </h3>


                        <span
                          style={
                            styles.sourceBadge
                          }
                        >
                          {sourceLanguage}
                        </span>

                      </div>


                      <div
                        style={
                          sourceLanguage ===
                          "Hindi"
                            ? styles.originalHindi
                            : styles.originalEnglish
                        }
                      >

                        {lesson.input ||
                          "Original lesson text unavailable."}

                      </div>

                    </div>


                    {/* ====================================== */}
                    {/* TRANSLATION */}
                    {/* ====================================== */}

                    <div
                      style={
                        styles.translationSection
                      }
                    >

                      <div
                        style={
                          styles.sectionHeader
                        }
                      >

                        <h3>
                          Santali Translation
                        </h3>


                        <span
                          style={
                            styles.targetBadge
                          }
                        >
                          Ol Chiki
                        </span>

                      </div>


                      <div
                        style={
                          styles.translation
                        }
                      >

                        {lesson.translation ||
                          "Santali translation unavailable."}

                      </div>

                    </div>


                    {/* ====================================== */}
                    {/* FOOTER */}
                    {/* ====================================== */}

                    <div
                      style={
                        styles.footer
                      }
                    >

                      <span
                        style={
                          styles.saved
                        }
                      >
                        ✓ Saved
                      </span>


                      {lesson.createdAt && (

                        <span
                          style={
                            styles.date
                          }
                        >

                          {new Date(
                            lesson.createdAt
                          ).toLocaleDateString()}

                        </span>

                      )}

                    </div>


                    {/* ====================================== */}
                    {/* ACTIONS */}
                    {/* ====================================== */}

                    <div
                      style={
                        styles.actions
                      }
                    >

                      {/* PDF VIEW */}

                      {isPdf && (

                        <button
                          onClick={() =>
                            viewPdf(
                              lesson
                            )
                          }
                          style={
                            styles.viewPdfButton
                          }
                        >
                          📖 View PDF
                        </button>

                      )}


                      {/* PUBLISH */}

                      <button
                        onClick={() =>
                          togglePublish(
                            lesson.id
                          )
                        }
                        style={
                          published
                            ? styles.unpublishButton
                            : styles.publishButton
                        }
                      >

                        {published
                          ? "↩ Unpublish"
                          : "📢 Publish to Students"}

                      </button>


                      {/* DELETE */}

                      <button
                        onClick={() =>
                          deleteLesson(
                            lesson.id
                          )
                        }
                        style={
                          styles.deleteButton
                        }
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                );

              }
            )}

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
    background:
      "#f5f7fb",
    fontFamily:
      "Arial, sans-serif",
    boxSizing:
      "border-box",
  },


  header: {
    maxWidth:
      "1100px",
    margin:
      "0 auto 30px",
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-end",
    gap:
      "20px",
  },


  tag: {
    margin:
      "0 0 8px",
    color:
      "#2563eb",
    fontSize:
      "12px",
    fontWeight:
      "bold",
    letterSpacing:
      "1px",
  },


  title: {
    margin:
      0,
    color:
      "#111827",
    fontSize:
      "32px",
  },


  subtitle: {
    margin:
      "8px 0 0",
    color:
      "#6b7280",
    fontSize:
      "15px",
  },


  headerActions: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "10px",
  },


  count: {
    padding:
      "10px 16px",
    borderRadius:
      "20px",
    background:
      "#eff6ff",
    color:
      "#2563eb",
    fontWeight:
      "bold",
    whiteSpace:
      "nowrap",
  },


  clearButton: {
    padding:
      "10px 14px",
    border:
      "none",
    borderRadius:
      "8px",
    background:
      "#fee2e2",
    color:
      "#dc2626",
    fontWeight:
      "bold",
    cursor:
      "pointer",
  },


  message: {
    maxWidth:
      "1100px",
    margin:
      "0 auto 20px",
    padding:
      "12px 16px",
    background:
      "#eff6ff",
    border:
      "1px solid #bfdbfe",
    color:
      "#1d4ed8",
    borderRadius:
      "10px",
    textAlign:
      "center",
    fontWeight:
      "600",
  },


  grid: {
    maxWidth:
      "1100px",
    margin:
      "0 auto",
    display:
      "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap:
      "22px",
  },


  card: {
    background:
      "white",
    padding:
      "24px",
    borderRadius:
      "16px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.06)",
    boxSizing:
      "border-box",
  },


  cardTop: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap:
      "10px",
  },


  languageFlow: {
    display:
      "flex",
    alignItems:
      "center",
    flexWrap:
      "wrap",
    gap:
      "5px",
    fontWeight:
      "bold",
    color:
      "#374151",
  },


  arrow: {
    color:
      "#2563eb",
    fontSize:
      "18px",
    margin:
      "0 4px",
  },


  badgeGroup: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "6px",
    flexWrap:
      "wrap",
    justifyContent:
      "flex-end",
  },


  pdfBadge: {
    padding:
      "6px 9px",
    borderRadius:
      "7px",
    background:
      "#ede9fe",
    color:
      "#6d28d9",
    fontSize:
      "12px",
    fontWeight:
      "bold",
    whiteSpace:
      "nowrap",
  },


  publishedBadge: {
    padding:
      "6px 9px",
    borderRadius:
      "7px",
    background:
      "#dcfce7",
    color:
      "#15803d",
    fontSize:
      "12px",
    fontWeight:
      "bold",
    whiteSpace:
      "nowrap",
  },


  draftBadge: {
    padding:
      "6px 9px",
    borderRadius:
      "7px",
    background:
      "#fef3c7",
    color:
      "#b45309",
    fontSize:
      "12px",
    fontWeight:
      "bold",
    whiteSpace:
      "nowrap",
  },


  divider: {
    height:
      "1px",
    background:
      "#e5e7eb",
    margin:
      "18px 0",
  },


  section: {
    marginBottom:
      "22px",
  },


  translationSection: {
    padding:
      "18px",
    background:
      "#f0fdf4",
    border:
      "1px solid #bbf7d0",
    borderRadius:
      "12px",
  },


  sectionHeader: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap:
      "10px",
    marginBottom:
      "12px",
  },


  sourceBadge: {
    fontSize:
      "12px",
    padding:
      "5px 8px",
    borderRadius:
      "6px",
    background:
      "#f3f4f6",
    color:
      "#4b5563",
  },


  targetBadge: {
    fontSize:
      "12px",
    padding:
      "5px 8px",
    borderRadius:
      "6px",
    background:
      "#dcfce7",
    color:
      "#15803d",
    fontWeight:
      "bold",
  },


  originalHindi: {
    fontSize:
      "17px",
    lineHeight:
      "1.7",
    color:
      "#374151",
  },


  originalEnglish: {
    fontSize:
      "16px",
    lineHeight:
      "1.7",
    color:
      "#374151",
  },


  translation: {
    fontSize:
      "21px",
    lineHeight:
      "1.8",
    color:
      "#111827",
    wordBreak:
      "break-word",
  },


  footer: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    marginTop:
      "20px",
  },


  saved: {
    color:
      "#16a34a",
    fontSize:
      "13px",
    fontWeight:
      "bold",
  },


  date: {
    color:
      "#9ca3af",
    fontSize:
      "12px",
  },


  actions: {
    display:
      "flex",
    gap:
      "10px",
    marginTop:
      "18px",
    flexWrap:
      "wrap",
  },


  viewPdfButton: {
    flex:
      1,
    minWidth:
      "120px",
    padding:
      "12px",
    border:
      "none",
    borderRadius:
      "9px",
    background:
      "#7c3aed",
    color:
      "white",
    fontSize:
      "14px",
    fontWeight:
      "bold",
    cursor:
      "pointer",
  },


  publishButton: {
    flex:
      1,
    minWidth:
      "150px",
    padding:
      "12px",
    border:
      "none",
    borderRadius:
      "9px",
    background:
      "#2563eb",
    color:
      "white",
    fontSize:
      "14px",
    fontWeight:
      "bold",
    cursor:
      "pointer",
  },


  unpublishButton: {
    flex:
      1,
    minWidth:
      "150px",
    padding:
      "12px",
    border:
      "none",
    borderRadius:
      "9px",
    background:
      "#6b7280",
    color:
      "white",
    fontSize:
      "14px",
    fontWeight:
      "bold",
    cursor:
      "pointer",
  },


  deleteButton: {
    padding:
      "12px 15px",
    border:
      "none",
    borderRadius:
      "9px",
    background:
      "#fee2e2",
    color:
      "#dc2626",
    fontWeight:
      "bold",
    cursor:
      "pointer",
  },


  empty: {
    maxWidth:
      "600px",
    margin:
      "80px auto",
    padding:
      "60px 30px",
    textAlign:
      "center",
    background:
      "white",
    borderRadius:
      "20px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)",
  },


  emptyIcon: {
    fontSize:
      "55px",
  },

};


export default Lessons;
