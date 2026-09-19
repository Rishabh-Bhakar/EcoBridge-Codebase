import React from "react";

function Welcome({ onSelectRole }) {
  return (
    <div className="welcome-page">
      <div className="welcome-overlay">
        <div className="welcome-content">

          <div className="brand-mark">EB</div>

          <p className="welcome-tag">AI • EDUCATION • LANGUAGE</p>

          <h1>
            Welcome to <span>EchoBridge</span>
          </h1>

          <h2>Here, language barriers stop.</h2>

          <p className="welcome-description">
            Empowering teachers and students to learn, teach, and communicate
            across languages with AI-powered multilingual education.
          </p>

          <div className="role-section">
            <p className="role-title">Continue as</p>

            <div className="role-cards">

              <button
                className="role-card"
                onClick={() => onSelectRole("teacher")}
              >
                <div className="role-icon">👨‍🏫</div>
                <div>
                  <strong>Teacher</strong>
                  <span>Teach in your students' language</span>
                </div>
                <div className="role-arrow">→</div>
              </button>

              <button
                className="role-card"
                onClick={() => onSelectRole("student")}
              >
                <div className="role-icon">👨‍🎓</div>
                <div>
                  <strong>Student</strong>
                  <span>Learn in a language you understand</span>
                </div>
                <div className="role-arrow">→</div>
              </button>

            </div>
          </div>

          <p className="welcome-footer">
            Built for multilingual education • EchoBridge
          </p>

        </div>
      </div>
    </div>
  );
}

export default Welcome;
