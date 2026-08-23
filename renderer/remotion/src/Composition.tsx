import React from "react";
import { z } from "zod";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import { SceneSchema } from "./scenes/types";
import { SceneRenderer } from "./scenes/SceneRenderer";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const DocumentarySchema = z.object({
  scenes: z.array(SceneSchema),
  audioSrc: z.string().optional(),
});
export type DocumentaryProps = z.infer<typeof DocumentarySchema>;

export const calculateDocumentaryMetadata = ({
  props,
}: {
  props: DocumentaryProps;
}) => {
  const totalSeconds =
    props.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) || 60;

  return {
    durationInFrames: Math.max(1, Math.round(totalSeconds * FPS)),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
  };
};

export const Documentary: React.FC<DocumentaryProps> = ({
  scenes,
  audioSrc,
}) => {
  const { fps } = useVideoConfig();
  let startFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {scenes.map((scene) => {
        const durationInFrames = Math.max(
          1,
          Math.round(scene.durationSeconds * fps),
        );
        const from = startFrame;
        startFrame += durationInFrames;

        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
            <SceneRenderer scene={scene} />
            {scene.audioPath ? <Audio src={scene.audioPath} /> : null}
          </Sequence>
        );
      })}
      {audioSrc ? <Audio src={audioSrc} /> : null}
    </AbsoluteFill>
  );
};
