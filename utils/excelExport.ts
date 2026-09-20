
import XLSX from 'xlsx';
import { ExtractedDocument, ExcelExportConfig } from '../types';

export const exportToExcel = (
  data: ExtractedDocument[], 
  fileName: string = 'ket_qua_trich_xuat',
  config: ExcelExportConfig
) => {
  // Map data to Vietnamese headers with 5 columns
  const formattedData = data.map(item => ({
    "Số ký hiệu văn bản": item.symbol,
    "Ngày tháng của văn bản": item.date,
    "Trích yếu nội dung văn bản": `${item.docType} ${item.summary}`,
    "Cơ quan ban hành": item.authority,
    "Số trang (Số trang là số nằm phía bên góc phải văn bản, được viết bằng bút chì)": item.pageRange,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
  
  const borderStyle = config.allBorders ? {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  } : {};

  const fontStyle = {
    name: config.fontName,
    sz: config.fontSize,
  };

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) continue;

      const cell = worksheet[cellAddress];
      if (!cell.s) cell.s = {};

      cell.s.font = { ...fontStyle };
      if (config.allBorders) cell.s.border = borderStyle;

      cell.s.alignment = { 
        vertical: "center",
        wrapText: config.wrapText 
      };

      if (R === 0) {
        cell.s.font = { ...fontStyle, bold: true };
        cell.s.alignment = { horizontal: "center", vertical: "center", wrapText: true };
        cell.s.fill = { fgColor: { rgb: "EFEFEF" } };
      } else {
        // Alignment for columns
        if (C === 1 || C === 4) { // Date, Page Range
            cell.s.alignment = { horizontal: "center", vertical: "center" };
        }
      }
    }
  }

  const wscols = [
    { wch: 18 }, // Symbol
    { wch: 18 }, // Date
    { wch: 60 }, // Summary
    { wch: 30 }, // Authority
    { wch: 25 }, // Page Range
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ liệu");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
