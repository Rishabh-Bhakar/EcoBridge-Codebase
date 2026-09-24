function Dashboard({ setPage }) {
  return (
    <div style={styles.container}>
      <div style={styles.content}>

        {/* Welcome */}
        <div style={styles.hero}>
          <div>
            <p style={styles.tag}>TEACHER DASHBOARD</p>

            <h1 style={styles.heading}>
              Welcome to EchoBridge
            </h1>

            <p style={styles.description}>
              Teach in the language every child understands.
              Create and deliver multilingual learning content
              with ease.
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

        {/* Quick Actions */}
        <h2 style={styles.sectionTitle}>
          What would you like to do?
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

            <h3 style={styles.cardTitle}>
              Translate Lesson
            </h3>

            <p style={styles.cardDescription}>
              Convert Hindi educational content into
              Santali with context-aware translation.
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
              📚
            </div>

            <h3 style={styles.cardTitle}>
              My Lessons
            </h3>

            <p style={styles.cardDescription}>
              View, manage and publish your multilingual
              lessons for students.
            </p>

            <span style={styles.link}>
              View lessons →
            </span>
          </div>

          {/* Live Translation */}
          <div
            style={styles.actionCard}
            onClick={() => setPage("live")}
          >
            <div style={styles.actionIcon}>
              🎙️
            </div>

            <h3 style={styles.cardTitle}>
              Live Translation
            </h3>

            <p style={styles.cardDescription}>
              Translate spoken content in real time
              during classroom interaction.
            </p>

            <span style={styles.link}>
              Start live translation →
            </span>
          </div>

        </div>

        {/* Simple Info */}
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>
            📥
          </div>

          <div>
            <h3 style={styles.infoTitle}>
              Learn Anywhere
            </h3>

            <p style={styles.infoText}>
              Download lessons for offline access when
              internet connectivity is unavailable.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 70px)",
    padding: "40px 24px",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  content: {
    maxWidth: "1100px",
    margin: "0 auto",
  },

  /* Hero */
  hero: {
    padding: "38px 40px",
    borderRadius: "20px",
    background: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 6px 25px rgba(0, 0, 0, 0.05)",
  },

  tag: {
    margin: 0,
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: "12px",
    letterSpacing: "1px",
  },

  heading: {
    margin: "10px 0",
    fontSize: "34px",
    color: "#111827",
  },

  description: {
    maxWidth: "620px",
    margin: 0,
    color: "#6b7280",
    fontSize: "16px",
    lineHeight: "1.6",
  },

  primaryButton: {
    marginTop: "22px",
    padding: "13px 20px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  heroIcon: {
    fontSize: "70px",
    padding: "20px",
  },

  /* Actions */
  sectionTitle: {
    margin: "38px 0 18px",
    fontSize: "22px",
    color: "#111827",
  },

  actions: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  },

  actionCard: {
    background: "white",
    padding: "26px",
    borderRadius: "16px",
    cursor: "pointer",
    boxShadow: "0 5px 20px rgba(0, 0, 0, 0.05)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },

  actionIcon: {
    fontSize: "32px",
    marginBottom: "12px",
  },

  cardTitle: {
    margin: "0 0 8px",
    fontSize: "19px",
    color: "#111827",
  },

  cardDescription: {
    margin: 0,
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  link: {
    display: "inline-block",
    marginTop: "18px",
    color: "#2563eb",
    fontSize: "14px",
    fontWeight: "bold",
  },

  /* Offline info */
  infoCard: {
    marginTop: "25px",
    padding: "20px 24px",
    background: "#eff6ff",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  infoIcon: {
    fontSize: "28px",
  },

  infoTitle: {
    margin: "0 0 4px",
    fontSize: "16px",
    color: "#111827",
  },

  infoText: {
    margin: 0,
    fontSize: "14px",
    color: "#6b7280",
  },
};

export default Dashboard;
