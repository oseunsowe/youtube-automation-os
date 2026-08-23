import React from "react";
import { Composition } from "remotion";
import {
  Documentary,
  DocumentarySchema,
  calculateDocumentaryMetadata,
  FPS,
  WIDTH,
  HEIGHT,
} from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Documentary"
      component={Documentary}
      durationInFrames={FPS * 60}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      schema={DocumentarySchema}
      defaultProps={{ scenes: [], audioSrc: "" }}
      calculateMetadata={calculateDocumentaryMetadata}
    />
  );
};
