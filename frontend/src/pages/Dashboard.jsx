function Dashboard({ setPage }) {
  const lessons = JSON.parse(
    localStorage.getItem("echobridge_lessons") || "[]"
  );

  return (
    <div style={styles.container}>

      {/* Hero Section */}
      <div style={styles.hero}>
        <div>
          <p style={styles.tag}>TEACHER PORTAL</p>

          <h1 style={styles.heading}>
            Welcome to EchoBridge 👋
          </h1>

          <p style={styles.description}>
            Create multilingual educational content
            and make learning accessible in Santali.
          </p>

          <button
            onClick={() => setPage("translator")}
            style={styles.primaryButton}
          >
            + Create New Lesson
          </button>
        </div>

        <div style={styles.heroIcon}>
          🌉
        </div>
      </div>

      {/* Statistics */}
      <div style={styles.stats}>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>📚</div>

          <div>
            <p style={styles.statNumber}>
              {lessons.length}
            </p>

            <p style={styles.statLabel}>
              Lessons Created
            </p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🌐</div>

          <div>
            <p style={styles.statNumber}>
              2
            </p>

            <p style={styles.statLabel}>
              Source Languages
            </p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🗣️</div>

          <div>
            <p style={styles.statNumber}>
              1
            </p>

            <p style={styles.statLabel}>
              Target Language
            </p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🔤</div>

          <div>
            <p style={styles.statNumber}>
              Ol Chiki
            </p>

            <p style={styles.statLabel}>
              Target Script
            </p>
          </div>
        </div>

      </div>

      {/* Quick Actions */}
      <h2 style={styles.sectionTitle}>
        Quick Actions
      </h2>

      <div style={styles.actions}>

        {/* Translate */}
        <div
          style={styles.actionCard}
          onClick={() => setPage("translator")}
        >
          <div style={styles.actionIcon}>
            🌐
          </div>

          <h3>
            Translate Lesson
          </h3>

          <p>
            Convert Hindi or English educational
            content into Santali.
          </p>

          <span style={styles.link}>
            Start translating →
          </span>
        </div>

        {/* My Lessons */}
        <div
          style={styles.actionCard}
          onClick={() => setPage("lessons")}
        >
          <div style={styles.actionIcon}>
            📖
          </div>

          <h3>
            My Lessons
          </h3>

          <p>
            View and manage your saved multilingual
            lessons.
          </p>

          <span style={styles.link}>
            View lessons →
          </span>
        </div>

        {/* Offline */}
        <div style={styles.actionCard}>
          <div style={styles.actionIcon}>
            📥
          </div>

          <h3>
            Offline Content
          </h3>

          <p>
            Access downloaded lessons even when
            internet connectivity is unavailable.
          </p>

          <span style={styles.comingSoon}>
            Coming next
          </span>
        </div>

      </div>

    </div>
  );
}


const styles = {
  container: {
    minHeight: "calc(100vh - 70px)",
    padding: "45px",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  /* Hero */
  hero: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "40px",
    borderRadius: "20px",
    background: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
  },

  tag: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: "13px",
    letterSpacing: "1px",
  },

  heading: {
    fontSize: "36px",
    margin: "10px 0",
    color: "#111827",
  },

  description: {
    color: "#6b7280",
    fontSize: "17px",
    maxWidth: "600px",
    lineHeight: "1.6",
  },

  primaryButton: {
    marginTop: "15px",
    padding: "14px 22px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  heroIcon: {
    fontSize: "80px",
    padding: "25px",
  },

  /* Statistics */
  stats: {
    maxWidth: "1100px",
    margin: "25px auto",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "18px",
  },

  statCard: {
    background: "white",
    padding: "22px",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
  },

  statIcon: {
    fontSize: "28px",
  },

  statNumber: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "bold",
    color: "#111827",
  },

  statLabel: {
    margin: "4px 0 0",
    color: "#6b7280",
    fontSize: "13px",
  },

  /* Quick Actions */
  sectionTitle: {
    maxWidth: "1100px",
    margin: "35px auto 18px",
    color: "#111827",
  },

  actions: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  },

  actionCard: {
    background: "white",
    padding: "25px",
    borderRadius: "16px",
    cursor: "pointer",
    boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
    transition: "transform 0.2s",
  },

  actionIcon: {
    fontSize: "32px",
  },

  link: {
    display: "inline-block",
    marginTop: "10px",
    color: "#2563eb",
    fontWeight: "bold",
  },

  comingSoon: {
    display: "inline-block",
    marginTop: "10px",
    color: "#6b7280",
    fontSize: "14px",
  },
};


export default Dashboard;
