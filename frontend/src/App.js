// frontend/src/App.js
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import "./App.css";
import ModeSelector from "./components/ModeSelector";
import StoryEditor from "./components/StoryEditor";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";

function MainApp({
  mode,
  setMode,
  outputFormat,
  setOutputFormat,
  story,
  setStory,
  currentScene,
  setCurrentScene,
  onReset,
}) {
  return (
    <div className="App">
      <header className="App-header">
        <h1>TaleTeller</h1>
        <p>The story Co-writer</p>
      </header>

      {!mode ? (
        <ModeSelector
          onStart={(selectedMode, selectedFormat) => {
            setMode(selectedMode);
            setOutputFormat(selectedFormat);
          }}
        />
      ) : (
        <StoryEditor
          mode={mode}
          outputFormat={outputFormat}
          story={story}
          setStory={setStory}
          currentScene={currentScene}
          setCurrentScene={setCurrentScene}
          onReset={onReset}
        />
      )}
    </div>
  );
}

// Floating buttons (Dark mode + Logout)
function FloatingButtons({ user, setUser }) {
  const navigate = useNavigate();

  const toggleDarkMode = () => {
    const updatedUser = { ...user, darkMode: !user.darkMode };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    document.body.classList.toggle("dark", updatedUser.darkMode);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    document.body.classList.remove("dark");
    navigate("/login");
  };

  return (
    <>
      <button
        onClick={toggleDarkMode}
        style={{
          position: "fixed",
          bottom: 70,
          right: 20,
          padding: "10px 15px",
          borderRadius: "25px",
          border: "none",
          backgroundColor: "#539ff1",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        {user.darkMode ? "Light Mode" : "Dark Mode"}
      </button>

      <button
        onClick={handleLogout}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          padding: "10px 15px",
          borderRadius: "25px",
          border: "none",
          backgroundColor: "#f15353",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(null);
  const [outputFormat, setOutputFormat] = useState("text");
  const [story, setStory] = useState([]);
  const [currentScene, setCurrentScene] = useState("");

  // Load user on refresh
  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (savedUser) {
      setUser(savedUser);
      if (savedUser.darkMode) {
        document.body.classList.add("dark");
      }
    }
  }, []);

  const handleReset = () => {
    setMode(null);
    setOutputFormat("text");
    setStory([]);
    setCurrentScene("");
  };

  return (
    <Router>
      <Routes>
        {/* 🔐 PROTECTED HOME ROUTE */}
        <Route
          path="/"
          element={
            user ? (
              <MainApp
                mode={mode}
                setMode={setMode}
                outputFormat={outputFormat}
                setOutputFormat={setOutputFormat}
                story={story}
                setStory={setStory}
                currentScene={currentScene}
                setCurrentScene={setCurrentScene}
                onReset={handleReset}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login setUser={setUser} />}
        />

        <Route
          path="/signup"
          element={user ? <Navigate to="/" /> : <Signup setUser={setUser} />}
        />
      </Routes>

      {user && <FloatingButtons user={user} setUser={setUser} />}
    </Router>
  );
}

export default App;
