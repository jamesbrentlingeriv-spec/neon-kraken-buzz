import * as React from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [auraVisible, setAuraVisible] = React.useState(false);
  const [fadeOut, setFadeOut] = React.useState(false);

  React.useEffect(() => {
    // Show logo for 1.0 second, then trigger bright gold aura
    const auraTimer = setTimeout(() => setAuraVisible(true), 1000);
    // Start fade out 500ms after aura appears
    const fadeTimer = setTimeout(() => setFadeOut(true), 1500);
    // Complete transition 400ms after fade begins
    const completeTimer = setTimeout(() => onComplete(), 1900);

    return () => {
      clearTimeout(auraTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Golden aura behind the logo */}
      <div
        className={`absolute h-72 w-72 rounded-full bg-amber-400/30 blur-3xl transition-all duration-700 ${
          auraVisible ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      />

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <img
          src="/liberai.png"
          alt="LiberAI"
          className={`h-36 w-36 object-contain transition-all duration-500 ${
            auraVisible ? "drop-shadow-[0_0_50px_rgba(251,191,36,0.8)]" : ""
          }`}
        />
        {auraVisible && (
          <span className="animate-fade-in text-sm font-light tracking-[0.35em] text-amber-300/80 uppercase">
            LiberAI
          </span>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.7s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;