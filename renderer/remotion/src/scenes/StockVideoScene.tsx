import React from "react";
import { AbsoluteFill, OffthreadVideo } from "remotion";
import type { Scene } from "./types";
import { Caption } from "./Caption";

export const StockVideoScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {scene.assetPath ? (
        <OffthreadVideo
          src={scene.assetPath}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
      <Caption text={scene.overlayText ?? scene.narration} />
    </AbsoluteFill>
  );
};
