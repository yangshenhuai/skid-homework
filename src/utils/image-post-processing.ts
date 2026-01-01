/**
 * Processes an image using OpenCV.js to create a clean, high-contrast document.
 * Pipeline: Grayscale → Gaussian Blur → Adaptive Thresholding
 *
 * IMPORTANT:
 * - OpenCV.js must be loaded via <Script> and available as window.cv
 * - This function MUST run in the browser (Client Component)
 *
 * @param imageFile The original image file
 * @returns Promise with the processed File and Object URL
 */
export const processImage = async (
  imageFile: File,
): Promise<{ file: File; url: string }> => {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cv = (window as any).cv;

    if (!cv) {
      reject(new Error("OpenCV.js is not loaded"));
      return;
    }

    const waitForOpenCV = () => {
      // ✅ wasm ready check (THIS is the key)
      if (cv.Mat) {
        run();
      } else {
        setTimeout(waitForOpenCV, 30);
      }
    };

    const run = () => {
      const img = new Image();
      const originalUrl = URL.createObjectURL(imageFile);

      img.onload = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let src: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let dst: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let bg: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let kernelSmall: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let kernelBig: any = null;

        try {
          src = cv.imread(img);
          dst = new cv.Mat();
          bg = new cv.Mat();

          // 1. Convert to Grayscale
          cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);

          // 2. Tiny Denoise (High Frequency Removal)
          // Remove small specks/noise (salt-and-pepper noise)
          kernelSmall = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(3, 3),
          );
          // Close: fills small black holes
          cv.morphologyEx(src, src, cv.MORPH_CLOSE, kernelSmall);
          // Open: removes small white noise
          cv.morphologyEx(src, src, cv.MORPH_OPEN, kernelSmall);

          // 3. Shadow Removal / Illumination Correction (Low Frequency Processing)
          // We estimate the background (low freq) using a large kernel.
          // A size of 40-50 is usually good for A4 documents to ignore text but capture shadows.
          kernelBig = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(50, 50),
          );

          // Calculate the background (shading)
          cv.morphologyEx(src, bg, cv.MORPH_CLOSE, kernelBig);

          // Divide source by background to flatten illumination
          // Formula: dst = (src / bg) * 255
          cv.divide(src, bg, dst, 255, -1);

          // 4. Binarization (Thresholding)
          // Now that shadows are gone, we can safely binarize.
          // Using adaptive threshold to handle any remaining local variations.
          cv.adaptiveThreshold(
            dst, // Input is the shadow-removed image
            dst, // Output
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY,
            15, // Block size (smaller is finer, since shadows are already gone)
            10, // Constant C (contrast tuning)
          );

          const outputCanvas = document.createElement("canvas");
          cv.imshow(outputCanvas, dst);

          outputCanvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Canvas encoding failed"));
                return;
              }

              const file = new File([blob], `ocr_${Date.now()}.png`, {
                type: "image/png",
              });

              resolve({
                file,
                url: URL.createObjectURL(file),
              });
            },
            "image/png",
            1,
          );
        } catch (err) {
          reject(err);
        } finally {
          // Clean up memory (Very Important in OpenCV.js)
          if (src) src.delete();
          if (dst) dst.delete();
          if (bg) bg.delete();
          if (kernelSmall) kernelSmall.delete();
          if (kernelBig) kernelBig.delete();
          URL.revokeObjectURL(originalUrl);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(originalUrl);
        reject(new Error("Image load failed"));
      };

      img.src = originalUrl;
    };

    // 🚀 start here
    waitForOpenCV();
  });
};
