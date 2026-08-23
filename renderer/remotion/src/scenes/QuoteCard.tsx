import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "./types";

export const QuoteCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#111318",
        alignItems: "center",
        justifyContent: "center",
        padding: 180,
      }}
    >
      <div
        style={{
          opacity,
          fontFamily: "Georgia, serif",
          fontSize: 54,
          fontStyle: "italic",
          color: "#f2f2f2",
          textAlign: "center",
          lineHeight: 1.45,
          borderLeft: "6px solid #d4af37",
          paddingLeft: 48,
        }}
      >
        &ldquo;{scene.overlayText ?? scene.narration}&rdquo;
      </div>
    </AbsoluteFill>
  );
};
