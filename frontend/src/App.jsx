import { useState } from "react";

import LiveTranslation from "./LiveTranslation";

import Translator from "./pages/Translator";
import Dashboard from "./pages/Dashboard";
import Lessons from "./pages/Lessons";
import StudentDashboard from "./pages/StudentDashboard";
import OfflineContent from "./pages/OfflineContent";
import PdfPublisher from "./pages/PdfPublisher";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
 // Restore previously authenticated user from localStorage.
// This allows the PWA to reopen without requiring login again.
const storedUser = localStorage.getItem("echobridge_user");

let initialUser = null;

try {
  initialUser = storedUser ? JSON.parse(storedUser) : null;
} catch {
  initialUser = null;
}

// Authentication flow
const [authPage, setAuthPage] = useState(
  initialUser ? null : "welcome"
);

const [selectedRole, setSelectedRole] = useState(
  initialUser?.role || null
);

// Existing application pages
const [page, setPage] = useState(
  initialUser?.role === "student"
    ? "student"
    : "dashboard"
);
// Restored user state
const [user, setUser] = useState(initialUser);
  // --------------------------------------------------
  // WELCOME
  // --------------------------------------------------

  if (authPage === "welcome") {
    return (
      <Welcome
        onSelectRole={(role) => {
          setSelectedRole(role);
          setAuthPage("login");
        }}
      />
    );
  }

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  if (authPage === "login") {
    return (
      <Login
        role={selectedRole}
        onBack={() => {
          setAuthPage("welcome");
          setSelectedRole(null);
        }}
        onCreateAccount={() => {
          setAuthPage("register");
        }}
        onLogin={(authData) => {
          const loggedInUser=authData.user;
	  localStorage.setItem(
		  "echobridge_access_token",
		  authData.access_token
	  );
	  localStorage.setItem(
		  "echobridge_user",
		  JSON.stringify(loggedInUser)
	  );
		setUser(loggedInUser);

          if (loggedInUser.role === "teacher") {
            setPage("dashboard");
          } else {
            setPage("student");
          }

          setAuthPage("app");
        }}
      />
    );
  }

  // --------------------------------------------------
  // REGISTER
  // --------------------------------------------------

  if (authPage === "register") {
    return (
      <Register
        role={selectedRole}
        onBack={() => {
          setAuthPage("login");
        }}
        onLogin={(authData) => {
		const loggedInUser=authData.user;
		localStorage.setItem(
			"echobridge_access_token",
			authData.access_token
		);
		localStorage.setItem(
			"echobridge_user",
			JSON.stringify(loggedInUser)
		);
          setUser(loggedInUser);
	
          if (loggedInUser.role === "teacher") {
            setPage("dashboard");
          } else {
            setPage("student");
          }

          setAuthPage("app");
        }}
      />
    );
  }

  // --------------------------------------------------
  // MAIN APPLICATION
  // --------------------------------------------------

  return (
    <div className="app-shell">

      <nav style={styles.navbar}>

        {/* Logo */}

        <div
          style={styles.logo}
         onClick={() => {
  localStorage.removeItem(
    "echobridge_access_token"
  );

  localStorage.removeItem(
    "echobridge_user"
  );

  setUser(null);
  setSelectedRole(null);
  setAuthPage("welcome");
  setPage("dashboard");
}}        >
          <span style={styles.logoMark}>EB</span>
          EchoBridge
        </div>


        {/* User information */}

        <div style={styles.userArea}>

          <div style={styles.userInfo}>
            <span style={styles.userIcon}>
              {user?.role === "teacher" ? "👨‍🏫" : "👨‍🎓"}
            </span>

            <div>
              <div style={styles.userName}>
                {user?.name || user?.email || "User"}
              </div>

              <div style={styles.userRole}>
                {user?.role === "teacher" ? "Teacher" : "Student"}
              </div>
            </div>
          </div>

          <button
            style={styles.logoutButton}
           onClick={() => {
  localStorage.removeItem("echobridge_access_token");
  localStorage.removeItem("echobridge_user");

  setUser(null);
  setSelectedRole(null);
  setAuthPage("welcome");
  setPage("dashboard");
}}          >
            Logout
          </button>

        </div>

      </nav>


      {/* ------------------------------------------------
          TEACHER NAVIGATION
      ------------------------------------------------ */}

      {user?.role === "teacher" && (
        <div style={styles.subNav}>

          <button
            onClick={() => setPage("dashboard")}
            style={page === "dashboard"
              ? styles.activeNavButton
              : styles.navButton}
          >
            🏠 Dashboard
          </button>

          <button
            onClick={() => setPage("translator")}
            style={page === "translator"
              ? styles.activeNavButton
              : styles.navButton}
          >
            🌐 Translate Lesson
          </button>

          <button
            onClick={() => setPage("pdf")}
            style={page === "pdf"
              ? styles.activePurpleButton
              : styles.purpleButton}
          >
            📄 Publish PDF
          </button>

          <button
            onClick={() => setPage("lessons")}
            style={page === "lessons"
              ? styles.activeNavButton
              : styles.navButton}
          >
            📚 My Lessons
          </button>

          <button
            onClick={() => setPage("live")}
            style={page === "live"
              ? styles.activeVoiceButton
              : styles.voiceButton}
          >
            🎙️ Live Translation
          </button>

        </div>
      )}


      {/* ------------------------------------------------
          STUDENT NAVIGATION
      ------------------------------------------------ */}

      {user?.role === "student" && (
        <div style={styles.subNav}>

          <button
            onClick={() => setPage("student")}
            style={page === "student"
              ? styles.activeStudentButton
              : styles.studentButton}
          >
            🎓 My Learning
          </button>

          <button
            onClick={() => setPage("offline")}
            style={page === "offline"
              ? styles.activeOfflineButton
              : styles.offlineButton}
          >
            📱 Offline Content
          </button>

        </div>
      )}


      {/* ------------------------------------------------
          PAGE CONTENT
      ------------------------------------------------ */}

      <main>

        {page === "dashboard" && user?.role === "teacher" && (
          <Dashboard setPage={setPage} />
        )}

        {page === "translator" && user?.role === "teacher" && (
          <Translator />
        )}

        {page === "live" && user?.role === "teacher" && (
          <LiveTranslation />
        )}

        {page === "pdf" && user?.role === "teacher" && (
          <PdfPublisher />
        )}

        {page === "lessons" && user?.role === "teacher" && (
          <Lessons />
        )}

        {page === "student" && user?.role === "student" && (
          <StudentDashboard />
        )}

        {page === "offline" && user?.role === "student" && (
          <OfflineContent />
        )}

      </main>

    </div>
  );
}


const styles = {

  navbar: {
    minHeight: "72px",
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255,255,255,0.95)",
    borderBottom: "1px solid #e5e7eb",
    boxSizing: "border-box",
    gap: "20px",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "24px",
    fontWeight: "800",
    color: "#172554",
    cursor: "pointer",
  },

  logoMark: {
    width: "38px",
    height: "38px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "white",
    fontSize: "14px",
    fontWeight: "800",
  },

  userArea: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },

  userIcon: {
    fontSize: "26px",
  },

  userName: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#111827",
  },

  userRole: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "2px",
    textTransform: "capitalize",
  },

  logoutButton: {
    border: "1px solid #e5e7eb",
    background: "white",
    color: "#374151",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  subNav: {
  minHeight: "58px",
  padding: "0 30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  flexWrap: "wrap",
},
    navButton: {
    border: "none",
    background: "transparent",
    padding: "9px 13px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    color: "#475569",
    fontWeight: "600",
  },

  activeNavButton: {
    border: "none",
    background: "#dbeafe",
    padding: "9px 13px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    color: "#1d4ed8",
    fontWeight: "700",
  },

  purpleButton: {
    border: "none",
    padding: "9px 14px",
    borderRadius: "8px",
    background: "#7c3aed",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  activePurpleButton: {
    border: "none",
    padding: "9px 14px",
    borderRadius: "8px",
    background: "#5b21b6",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  voiceButton: {
    border: "none",
    padding: "9px 14px",
    borderRadius: "8px",
    background: "#0f766e",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  activeVoiceButton: {
    border: "none",
    padding: "9px 14px",
    borderRadius: "8px",
    background: "#115e59",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  studentButton: {
    border: "none",
    padding: "9px 14px",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  activeStudentButton: {
    border: "none",
    padding: "9px 14px",
    borderRadius: "8px",
    background: "#1d4ed8",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  offlineButton: {
    border: "none",
    padding: "9px 14px",
    borderRadius: "8px",
    background: "#16a34a",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  activeOfflineButton: {
    border: "none",
    padding: "9px 14px",
    borderRadius: "8px",
    background: "#15803d",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
};


export default App;
