import React from "react";

export const Caption: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 120px",
      }}
    >
      <span
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 42,
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          textShadow: "0 2px 8px rgba(0,0,0,0.85)",
          lineHeight: 1.3,
        }}
      >
        {text}
      </span>
    </div>
  );
};
