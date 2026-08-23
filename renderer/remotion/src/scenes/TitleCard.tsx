import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "./types";

export const TitleCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        alignItems: "center",
        justifyContent: "center",
        padding: 160,
      }}
    >
      <div
        style={{
          opacity,
          fontFamily: "Georgia, serif",
          fontSize: 68,
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {scene.overlayText ?? scene.narration}
      </div>
    </AbsoluteFill>
  );
};
