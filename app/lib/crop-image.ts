type Area = {
  width: number;
  height: number;
  x: number;
  y: number;
};

type CropOutputOptions = {
  rotation?: number;
  outputType?: "image/jpeg" | "image/webp";
  quality?: number;
  maxSize?: number;
};

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
  options: CropOutputOptions = {}
): Promise<Blob> {
  const rotation = options.rotation ?? 0;
  const outputType = options.outputType ?? "image/jpeg";
  const quality = options.quality ?? 0.85;
  const maxSize = options.maxSize ?? 1600;
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    throw new Error("Cropped canvas context not available");
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  const outputCanvas = document.createElement("canvas");
  const outputCtx = outputCanvas.getContext("2d");

  if (!outputCtx) {
    throw new Error("Output canvas context not available");
  }

  let targetWidth = croppedCanvas.width;
  let targetHeight = croppedCanvas.height;

  const largestSide = Math.max(targetWidth, targetHeight);
  if (maxSize > 0 && largestSide > maxSize) {
    const scale = maxSize / largestSide;
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;
  outputCtx.drawImage(croppedCanvas, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob((file) => {
      if (file) {
        resolve(file);
      } else {
        reject(new Error("Failed to create image blob"));
      }
    }, outputType, quality);
  });
}
