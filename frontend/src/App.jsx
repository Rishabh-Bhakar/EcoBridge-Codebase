import { useEffect, useState } from "react";
import { checkBackend } from "./services/api";

function App() {
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    checkBackend()
      .then((data) => {
        setStatus(data.status);
      })
      .catch(() => {
        setStatus("Backend not connected");
      });
  }, []);

  return (
    <div>
      <h1>EchoBridge</h1>

      <p>Hindi → Santali</p>

      <p>Backend Status: {status}</p>
    </div>
  );
}

export default App;