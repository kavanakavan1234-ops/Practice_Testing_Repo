

import Tesseract from 'tesseract.js';

export class OCRUtil {

  static async extractText(imagePath: string): Promise<string> {

    const result = await Tesseract.recognize(
      imagePath,
      'eng'
    );

    // Clean OCR result
    const cleanedText = result.data.text
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .trim();

    return cleanedText;
  }

}   

  
 