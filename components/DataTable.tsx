
import React from 'react';
import { ExtractedDocument, ThemeConfig } from '../types';
import { FileSearch, ClipboardList } from 'lucide-react';

interface DataTableProps {
  data: ExtractedDocument[];
  theme: ThemeConfig;
}

export const DataTable: React.FC<DataTableProps> = ({ data, theme }) => {
  const p = theme.primary;
  const g = theme.gray;

  if (data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 px-4 text-center bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-${g}-200 animate-in fade-in zoom-in duration-500`}>
        <div className={`p-4 bg-${p}-50 text-${p}-400 rounded-full mb-4`}>
          <FileSearch size={48} strokeWidth={1.5} />
        </div>
        <h3 className={`text-xl font-bold text-${g}-800`}>Chưa có dữ liệu trích xuất</h3>
        <p className={`text-${g}-500 mt-2 max-w-xs mx-auto`}>Vui lòng tải lên file PDF để bắt đầu quá trình bóc tách.</p>
      </div>
    );
  }

  const borderClass = `border border-slate-300`; 
  const cellPadding = "px-4 py-3";

  return (
    <div className="overflow-hidden rounded-2xl shadow-xl bg-white border border-slate-200 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <style>{`
        .row-stagger {
          animation: slideIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
          will-change: transform, opacity;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .administrative-table th {
          background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
        }
        .empty-field {
          color: #cbd5e1;
          font-style: italic;
        }
        .page-range-cell {
          color: #2563eb;
          font-weight: 700;
          font-family: ui-monospace, monospace;
        }
      `}</style>
      
      <div className="overflow-x-auto">
        <table 
          className="min-w-full border-collapse text-black administrative-table"
          style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt' }}
        >
          <thead>
            <tr>
              <th className={`${borderClass} ${cellPadding} w-[15%] text-center font-bold uppercase text-[10px] tracking-wider`}>Số Ký Hiệu</th>
              <th className={`${borderClass} ${cellPadding} w-[15%] text-center font-bold uppercase text-[10px] tracking-wider`}>Ngày Tháng</th>
              <th className={`${borderClass} ${cellPadding} w-[35%] text-center font-bold uppercase text-[10px] tracking-wider`}>Trích Yêu Nội Dung</th>
              <th className={`${borderClass} ${cellPadding} w-[20%] text-center font-bold uppercase text-[10px] tracking-wider`}>Cơ Quan Ban Hành</th>
              <th className={`${borderClass} ${cellPadding} w-[15%] text-center font-bold uppercase text-[10px] tracking-wider`}>Số trang (Số trang là số nằm phía bên góc phải văn bản, được viết bằng bút chì)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((doc, index) => (
              <tr 
                key={index} 
                className={`row-stagger group hover:bg-slate-50 transition-colors`}
                style={{ animationDelay: `${Math.min(index * 0.05, 0.8)}s` }}
              >
                <td className={`${borderClass} ${cellPadding} align-top`}>
                  {doc.symbol || <span className="empty-field">—</span>}
                </td>
                <td className={`${borderClass} ${cellPadding} align-top text-center whitespace-nowrap`}>
                  {doc.date || <span className="empty-field">—</span>}
                </td>
                <td className={`${borderClass} ${cellPadding} align-top text-justify leading-relaxed`}>
                  <span className="font-bold">{doc.docType}</span>&nbsp;{doc.summary}
                </td>
                <td className={`${borderClass} ${cellPadding} align-top`}>
                  {doc.authority}
                </td>
                <td className={`${borderClass} ${cellPadding} align-top text-center page-range-cell`}>
                  {doc.pageRange || <span className="empty-field">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className={`p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest`}>
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className={`text-${p}-500`} />
          Tổng cộng: {data.length} văn bản
        </div>
        <div>TRÍCH XUẤT TÀI LIỆU CHÍNH QUYỀN</div>
      </div>
    </div>
  );
};
