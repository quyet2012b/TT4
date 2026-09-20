
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedDocument } from "../types";
import { PDFDocument } from "pdf-lib";

const API_LIMIT_BYTES = 30 * 1024 * 1024; 
const PAGES_PER_CHUNK = 15; 

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Lỗi khi đọc file."));
  });
};

const documentSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      docType: {
        type: Type.STRING,
        description: "Loại văn bản (Quyết định, Thông báo, Công văn, Kế hoạch...)",
      },
      symbol: {
        type: Type.STRING,
        description: "Số ký hiệu văn bản. Nếu không có để trống.",
      },
      date: {
        type: Type.STRING,
        description: "Ngày tháng văn bản (định dạng dd/mm/yyyy).",
      },
      summary: {
        type: Type.STRING,
        description: "Trích yếu nội dung tiếp nối sau tên loại văn bản.",
      },
      authority: {
        type: Type.STRING,
        description: "Cơ quan ban hành văn bản trực tiếp.",
      },
      startPage: {
        type: Type.STRING,
        description: "Số trang bắt đầu (là số nằm phía bên góc phải văn bản, được viết bằng bút chì). ĐỊNH DẠNG: Nếu số từ 1 đến 9, phải thêm số 0 ở trước (Ví dụ: '01', '02').",
      }
    },
    required: ["docType", "symbol", "date", "summary", "authority", "startPage"],
  },
};

const processChunk = async (ai: GoogleGenAI, base64Data: string): Promise<ExtractedDocument[]> => {
  const systemInstruction = `Bạn là chuyên gia văn thư lưu trữ và chuyên gia giải mã văn bản lịch sử. Nhiệm vụ của bạn là bóc tách TOÀN BỘ các văn bản có trong tệp PDF.

QUY TẮC NGHIÊM NGẶT VỀ GIẢI MÃ VĂN BẢN (ĐẶC BIỆT QUAN TRỌNG):
1. ĐỐI VỚI VĂN BẢN ĐÁNH MÁY KIỂU CŨ (MÁY OLIVETTI, HERMES) VÀ CÔNG ĐIỆN:
   - Các văn bản này thường không có dấu hoặc sử dụng quy ước Telex cổ điển (Ví dụ: 'as' -> 'á', 'af' -> 'à', 'ax' -> 'ã', 'aj' -> 'ạ', 'ar' -> 'ả', 'ee' -> 'ê', 'oo' -> 'ô', 'aa' -> 'â', 'dd' -> 'đ', 'uw' -> 'ư', 'ow' -> 'ơ').
   - Bạn PHẢI dịch thuật, giải mã và chuyển đổi các ký tự Telex sang tiếng Việt có dấu một cách CHÍNH XÁC NHẤT.
   - Đảm bảo nội dung trích xuất hoàn toàn là tiếng Việt chuẩn, tự nhiên, không còn các ký tự Telex thừa hay lỗi font.
   - Nếu văn bản hoàn toàn không có dấu (không dùng Telex), bạn phải dựa vào ngữ cảnh để thêm dấu tiếng Việt một cách chính xác nhất.

2. TÓM TẮT TRÍCH YẾU (Summary):
   - Phải tóm tắt rõ ràng, ngắn gọn nhưng PHẢI ĐẦY ĐỦ NỘI DUNG cốt lõi.
   - Trích yếu phải bám sát nội dung trong văn bản, phản ánh đúng tinh thần và các thông tin quan trọng nhất (đối tượng, sự việc, thời gian, mục đích).
   - Văn phong phải chuyên nghiệp, hành chính.
   - TUYỆT ĐỐI KHÔNG lặp lại tên loại văn bản (docType) trong phần trích yếu. Ví dụ: Nếu docType là "Báo cáo", thì summary chỉ ghi "kết quả công tác...", KHÔNG ghi "báo cáo kết quả công tác...".
   - Bắt đầu trích yếu bằng chữ thường (Ví dụ: "về việc...", "kết quả...", "tình hình..."). CHỈ viết hoa nếu là tên riêng hoặc địa danh.
   - Nếu trích yếu gốc trong văn bản quá dài, hãy tóm lược lại nhưng vẫn giữ đủ ý chính. Nếu trích yếu gốc quá ngắn hoặc không rõ ràng, hãy dựa vào nội dung văn bản để viết lại trích yếu cho đầy đủ.

3. Cơ quan ban hành (authority): 
   - KHÔNG viết in hoa tất cả các chữ cái.
   - CHỈ viết hoa chữ cái đầu tiên và các từ là tên riêng.
   - Đối với BẢN TỰ KIỂM ĐIỂM, SƠ YẾU LÝ LỊCH...: Cơ quan ban hành chính là Tên cá nhân thực hiện văn bản.

4. Số hiệu: Ghi đầy đủ (Ví dụ: 12-QĐ/UBKTHU). KHÔNG THÊM dấu nháy đơn '.
5. Ngày tháng: Định dạng dd/mm/yyyy.
6. Số trang bắt đầu: Trích xuất số bút chì ghi ở góc trên bên phải trang đầu mỗi văn bản. ĐỊNH DẠNG: Nếu số từ 1 đến 9, phải thêm số 0 ở trước (Ví dụ: '01', '02').

TUYỆT ĐỐI KHÔNG BỎ SÓT BẤT KỲ VĂN BẢN NÀO, kể cả các văn bản nhỏ như "PHIẾU ĐẢNG VIÊN", "ĐƠN TỪ"...`;

  const makeRequest = async (retries = 2): Promise<ExtractedDocument[]> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview", // Sử dụng model Pro để xử lý các tác vụ phức tạp và PDF ổn định hơn
        contents: [
          {
            parts: [
              { inlineData: { mimeType: "application/pdf", data: base64Data } },
              { text: "Phân tích và trích xuất danh sách văn bản sang JSON theo đúng schema và hướng dẫn hệ thống." }
            ],
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: documentSchema,
        },
      });

      const result = response.text;
      if (!result) return [];
      
      const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const rawData: ExtractedDocument[] = JSON.parse(cleanJson);

      // Hậu xử lý
      rawData.forEach(doc => {
        if (doc.startPage && /^\d$/.test(doc.startPage.toString().trim())) {
          doc.startPage = `0${doc.startPage.toString().trim()}`;
        }
        
        if (doc.docType && doc.summary) {
          let summary = doc.summary.trim();
          const docTypeLower = doc.docType.toLowerCase().trim();
          
          // Xóa tên loại văn bản lặp lại ở đầu trích yếu
          if (summary.toLowerCase().startsWith(docTypeLower)) {
            summary = summary.substring(docTypeLower.length).trim();
          }
          
          // Viết thường chữ cái đầu tiên của trích yếu
          if (summary.length > 0) {
            summary = summary.charAt(0).toLowerCase() + summary.slice(1);
          }
          
          doc.summary = summary;
        }
      });

      return rawData;
    } catch (e: any) {
      if (retries > 0 && (e.message?.includes('500') || e.status === 500 || e.message?.includes('Internal error'))) {
        console.warn(`Gemini 500 error, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return makeRequest(retries - 1);
      }
      console.error("Gemini processing error:", e);
      throw e;
    }
  };

  return makeRequest();
};

export const extractDataFromPdf = async (file: File): Promise<ExtractedDocument[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPdfPages = pdfDoc.getPageCount();

  let allResults: ExtractedDocument[] = [];

  try {
    if (file.size <= API_LIMIT_BYTES) {
      const base64Data = await fileToBase64(file);
      allResults = await processChunk(ai, base64Data);
    } else {
      for (let i = 0; i < totalPdfPages; i += PAGES_PER_CHUNK) {
        const newDoc = await PDFDocument.create();
        const end = Math.min(i + PAGES_PER_CHUNK, totalPdfPages);
        const pagesToCopy = Array.from({ length: end - i }, (_, k) => i + k);
        const copiedPages = await newDoc.copyPages(pdfDoc, pagesToCopy);
        copiedPages.forEach(page => newDoc.addPage(page));
        const pdfBytes = await newDoc.save();
        const base64Chunk = uint8ArrayToBase64(pdfBytes);
        const chunkResults = await processChunk(ai, base64Chunk);
        allResults = [...allResults, ...chunkResults];
      }
    }

    // HẬU XỬ LÝ: Tính toán pageRange
    return allResults.map((doc, index, array) => {
      const nextDoc = array[index + 1];
      const startPage = doc.startPage;
      let endPage: number | null = null;
      
      if (nextDoc) {
        endPage = Number(nextDoc.startPage) - 1;
      }

      // Logic: Số trang bắt đầu-Số trang kết thúc
      let displayRange = `'${startPage}`;
      if (endPage !== null && endPage > Number(startPage)) {
        const endPageStr = endPage < 10 ? `0${endPage}` : `${endPage}`;
        displayRange = `'${startPage}-${endPageStr}`;
      }

      let formattedDate = doc.date ? (doc.date.startsWith("'") ? doc.date.substring(1) : doc.date) : "";
      if (formattedDate) {
        const parts = formattedDate.split('/');
        if (parts.length === 3) {
          let [day, month, year] = parts;
          const monthNum = parseInt(month, 10);
          if (!isNaN(monthNum)) {
            if (monthNum >= 1 && monthNum <= 3) {
              month = monthNum.toString().padStart(2, '0');
            } else if (monthNum >= 4 && monthNum <= 9) {
              month = monthNum.toString();
            }
            formattedDate = `${day}/${month}/${year}`;
          }
        }
        formattedDate = `'${formattedDate}`;
      }

      return {
        ...doc,
        date: formattedDate,
        pageRange: displayRange
      };
    });
  } catch (error: any) {
    throw new Error(error.message || "Lỗi xử lý PDF.");
  }
};
