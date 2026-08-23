import React from "react";
import type { Scene } from "./types";
import { TitleCard } from "./TitleCard";
import { QuoteCard } from "./QuoteCard";
import { ImageScene } from "./ImageScene";
import { StockVideoScene } from "./StockVideoScene";

export const SceneRenderer: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.visualType) {
    case "title":
      return <TitleCard scene={scene} />;
    case "quote":
      return <QuoteCard scene={scene} />;
    case "image":
      return <ImageScene scene={scene} />;
    case "stock_video":
      return <StockVideoScene scene={scene} />;
    default:
      return <ImageScene scene={scene} />;
  }
};
