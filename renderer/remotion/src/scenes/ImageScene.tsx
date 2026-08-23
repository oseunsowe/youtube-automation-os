import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "./types";
import { Caption } from "./Caption";

/** Simple Ken Burns pan/zoom for a static photograph or document image. */
export const ImageScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.12], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {scene.assetPath ? (
        <Img
          src={scene.assetPath}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      ) : null}
      <Caption text={scene.overlayText ?? scene.narration} />
    </AbsoluteFill>
  );
};
