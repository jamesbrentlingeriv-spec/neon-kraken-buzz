import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import SplashScreen from "./components/SplashScreen.tsx";
import "./globals.css";

const Root = () => {
  const [showSplash, setShowSplash] = React.useState(
    !sessionStorage.getItem("splash-shown")
  );

  const handleSplashComplete = () => {
    sessionStorage.setItem("splash-shown", "1");
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {!showSplash && <App />}
    </>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);