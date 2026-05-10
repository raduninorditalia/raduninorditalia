
/**
 * Comprime un'immagine base64 ridimensionandola e riducendo la qualità.
 * Include una logica ricorsiva per assicurare che la dimensione rimanga sotto un limite specifico.
 * @param base64 Struttura base64 dell'immagine (data URL)
 * @param maxWidth Larghezza massima desiderata
 * @param maxHeight Altezza massima desiderata
 * @param initialQuality Qualità di partenza (0.0 - 1.0)
 * @param targetSizeKB Dimensione massima desiderata in KB (default 800 per stare sotto il limite di 1MB di Firestore)
 * @returns Promise che risolve con la stringa base64 compressa
 */
export const compressImage = async (
  base64: string,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  initialQuality: number = 0.7,
  targetSizeKB: number = 800
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calcola le nuove dimensioni mantenendo l'aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Impossibile ottenere il contesto del canvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = initialQuality;
      let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      
      // Calcolo approssimativo della dimensione in KB (base64 è circa il 33% più grande dei dati binari)
      let sizeInKB = (compressedBase64.length * 3) / 4 / 1024;

      // Se l'immagine è ancora troppo grande, riduciamo qualità e se necessario le dimensioni
      let currentMaxWidth = maxWidth;
      let currentMaxHeight = maxHeight;

      while (sizeInKB > targetSizeKB && quality > 0.1) {
        quality -= 0.1;
        compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        sizeInKB = (compressedBase64.length * 3) / 4 / 1024;
      }

      // Se ancora troppo grande, scendiamo ulteriormente con le dimensioni (brutale ma necessario per Firestore)
      if (sizeInKB > targetSizeKB) {
        // Riduciamo le dimensioni del 20% e riproviamo (massimo 3 tentativi di ridimensionamento)
        for (let i = 0; i < 3 && sizeInKB > targetSizeKB; i++) {
          currentMaxWidth *= 0.8;
          currentMaxHeight *= 0.8;
          
          // Ricreiamo il canvas più piccolo
          const tempCanvas = document.createElement('canvas');
          let tempWidth = img.width;
          let tempHeight = img.height;
          
          if (tempWidth > tempHeight) {
            if (tempWidth > currentMaxWidth) {
              tempHeight *= currentMaxWidth / tempWidth;
              tempWidth = currentMaxWidth;
            }
          } else {
            if (tempHeight > currentMaxHeight) {
              tempWidth *= currentMaxHeight / tempHeight;
              tempHeight = currentMaxHeight;
            }
          }
          
          tempCanvas.width = tempWidth;
          tempCanvas.height = tempHeight;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(img, 0, 0, tempWidth, tempHeight);
            compressedBase64 = tempCanvas.toDataURL('image/jpeg', 0.5); // Qualità fissa bassa per sicurezza
            sizeInKB = (compressedBase64.length * 3) / 4 / 1024;
          }
        }
      }

      console.log(`Immagine compressa: ${Math.round(sizeInKB)}KB (Qualità: ${quality.toFixed(1)})`);
      resolve(compressedBase64);
    };
    img.onerror = (err) => reject(err);
  });
};
