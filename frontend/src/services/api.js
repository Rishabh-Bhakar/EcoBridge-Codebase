const API_URL = "http://localhost:8000";


// ============================================================
// HEALTH CHECK
// ============================================================

export async function checkBackend() {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Backend request failed");
  }

  return response.json();
}


// ============================================================
// TEXT TRANSLATION
// ============================================================

export async function translateText(
  text,
  sourceLanguage = "hindi"
) {
  const response = await fetch(
    `${API_URL}/api/translate`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        text,
        source_language: sourceLanguage,
      }),
    }
  );


  if (!response.ok) {
    const errorData =
      await response.json().catch(() => ({}));

    throw new Error(
      errorData.detail ||
      "Translation request failed"
    );
  }


  return response.json();
}


// ============================================================
// SPEECH TO TEXT
// ============================================================

export async function speechToText(
  audioBlob,
  sourceLanguage = "hindi"
) {
  const formData = new FormData();

  formData.append(
    "audio",
    audioBlob,
    "recording.webm"
  );


  const response = await fetch(
    `${API_URL}/api/speech-to-text?source_language=${encodeURIComponent(
      sourceLanguage
    )}`,
    {
      method: "POST",
      body: formData,
    }
  );


  if (!response.ok) {
    const errorData =
      await response.json().catch(() => ({}));

    throw new Error(
      errorData.detail ||
      "Speech recognition failed"
    );
  }


  return response.json();
}


// ============================================================
// SANTALI TEXT TO SPEECH
// ============================================================

export async function textToSpeech(
  text
) {
  const response = await fetch(
    `${API_URL}/api/text-to-speech`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        text,
      }),
    }
  );


  if (!response.ok) {
    const errorData =
      await response.json().catch(() => ({}));

    throw new Error(
      errorData.detail ||
      "Santali text-to-speech failed"
    );
  }


  // Backend returns audio/wav
  const audioBlob =
    await response.blob();


  return audioBlob;
}
export async function translatePdf(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/api/translate-pdf`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      errorData.detail || "PDF translation failed"
    );
  }

  return await response.blob();
}
export async function registerUser(name, email, password, role) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
      role,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || "Account creation failed."
    );
  }

  return data;
}


export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || "Login failed."
    );
  }

  return data;
}
export function getAuthToken() {
  return localStorage.getItem(
    "echobridge_access_token"
  );
}


export function getStoredUser() {
  const user = localStorage.getItem(
    "echobridge_user"
  );

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}


export function getAuthHeaders() {
  const token = getAuthToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}
