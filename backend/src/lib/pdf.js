import multer from 'multer';

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export async function extractPdfText(file) {
  const pdfParse = (await import('pdf-parse')).default;
  const { text } = await pdfParse(file.buffer);
  return text;
}
