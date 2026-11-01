"use client";

import { useEffect, useState } from "react";
import { loadIdeaImage } from "@/lib/idea-images";

export function IdeaImage({ imageId }: { imageId?: string }) {
  const [image, setImage] = useState<{
    id: string;
    url?: string;
    error?: string;
  }>();

  useEffect(() => {
    if (!imageId) return;

    let active = true;
    let objectUrl: string | undefined;
    loadIdeaImage(imageId)
      .then((image) => {
        if (!image) throw new Error("The saved image is no longer available.");
        objectUrl = URL.createObjectURL(image);
        if (active) setImage({ id: imageId, url: objectUrl });
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((cause: unknown) => {
        console.error("Could not load a saved idea image.", cause);
        if (active) setImage({ id: imageId, error: "This image could not be loaded." });
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (!imageId) return null;
  if (image?.id !== imageId) return null;
  if (image.error) {
    return <p className="mt-3 text-xs text-[#c98e89]">{image.error}</p>;
  }
  if (!image.url) return null;

  return (
    <div
      aria-label="Saved idea image"
      className="mt-3 aspect-[4/3] w-full rounded-xl bg-cover bg-center"
      role="img"
      style={{ backgroundImage: `url("${image.url}")` }}
    />
  );
}
