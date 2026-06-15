"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";

interface GarmentCanvasProps {
  userPhotoUrl: string;
  garmentUrl?: string;
  width?: number;
  height?: number;
}

function KonvaLayer({
  userPhotoUrl,
  garmentUrl,
  width,
  height,
}: GarmentCanvasProps) {
  const [userImg] = useImage(userPhotoUrl, "anonymous");
  const [garmentImg] = useImage(garmentUrl ?? "", "anonymous");

  return (
    <Layer>
      {userImg && (
        <KonvaImage image={userImg} width={width} height={height} />
      )}
      {garmentImg && garmentUrl && (
        <KonvaImage
          image={garmentImg}
          width={width}
          height={height}
          opacity={0.85}
        />
      )}
    </Layer>
  );
}

export default function GarmentCanvas({
  userPhotoUrl,
  garmentUrl,
  width = 400,
  height = 533,
}: GarmentCanvasProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Stage width={width} height={height} className="rounded-2xl overflow-hidden shadow-lg">
      <GarmentLayer
        userPhotoUrl={userPhotoUrl}
        garmentUrl={garmentUrl}
        width={width}
        height={height}
      />
    </Stage>
  );
}

function GarmentLayer(props: GarmentCanvasProps) {
  return <KonvaLayer {...props} />;
}
