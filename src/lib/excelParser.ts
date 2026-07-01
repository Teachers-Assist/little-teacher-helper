// 學生 Excel 批次匯入的「前端」解析器（002 US1）。
//
// 架構決策：xlsx(SheetJS) 在瀏覽器解析，後端（Cloudflare Workers）只收乾淨 JSON，
// 避開 Workers 對 SheetJS 的相容性與安全風險。本檔負責：
//   1. 欄位驗證（必須有「座號」「姓名」欄）
//   2. 逐列格式驗證（座號為 1-99 整數、姓名 1-50 字）
//   3. 檔案內部衝突偵測（重複座號、重複姓名）
// 與既有資料的衝突由後端 import endpoint 偵測（見 students/import/route.ts）。
//
// 全或無策略（FR-022）：任一列有錯即回傳完整錯誤清單，呼叫端不上傳。

import * as XLSX from 'xlsx';

const SEAT_HEADER = '座號';
const NAME_HEADER = '姓名';

/** 錯誤碼皆為 messages 字典的點分路徑，可直接交給 resolveError() 翻譯。 */
const P = 'teacher.studentList.importErrors';

export interface ParsedStudent {
  /** 試算表列號（1-based，含標題列；第一筆資料列為 2），給老師對照 Excel 用。 */
  rowNumber: number;
  seatNumber: number;
  name: string;
}

export interface ImportRowError {
  rowNumber: number;
  field: 'seat' | 'name' | null;
  /** messages 點分路徑。 */
  code: string;
}

export type ParseResult =
  | { ok: true; students: ParsedStudent[] }
  | { ok: false; fileErrorCode?: string; rowErrors?: ImportRowError[] };

export async function parseStudentExcel(file: File): Promise<ParseResult> {
  let rows: unknown[][];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { ok: false, fileErrorCode: `${P}.fileEmpty` };
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
    }) as unknown[][];
  } catch {
    return { ok: false, fileErrorCode: `${P}.fileParseFailed` };
  }

  if (rows.length === 0) return { ok: false, fileErrorCode: `${P}.fileEmpty` };

  const header = rows[0].map((cell) => String(cell ?? '').trim());
  const seatCol = header.indexOf(SEAT_HEADER);
  const nameCol = header.indexOf(NAME_HEADER);
  if (seatCol === -1) return { ok: false, fileErrorCode: `${P}.missingColumnSeat` };
  if (nameCol === -1) return { ok: false, fileErrorCode: `${P}.missingColumnName` };

  const students: ParsedStudent[] = [];
  const rowErrors: ImportRowError[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const rowNumber = i + 1;
    const seatRaw = String(row[seatCol] ?? '').trim();
    const nameRaw = String(row[nameCol] ?? '').trim();

    // 整列空白（尾端空列）直接略過，不視為錯誤
    if (seatRaw === '' && nameRaw === '') continue;

    let rowHasError = false;

    const seatNum = Number(seatRaw);
    if (seatRaw === '' || !Number.isInteger(seatNum)) {
      rowErrors.push({ rowNumber, field: 'seat', code: `${P}.seatNotNumber` });
      rowHasError = true;
    } else if (seatNum < 1 || seatNum > 99) {
      rowErrors.push({ rowNumber, field: 'seat', code: `${P}.seatOutOfRange` });
      rowHasError = true;
    }

    if (nameRaw === '') {
      rowErrors.push({ rowNumber, field: 'name', code: `${P}.nameRequired` });
      rowHasError = true;
    } else if (nameRaw.length > 50) {
      rowErrors.push({ rowNumber, field: 'name', code: `${P}.nameTooLong` });
      rowHasError = true;
    }

    if (!rowHasError) {
      students.push({ rowNumber, seatNumber: seatNum, name: nameRaw });
    }
  }

  // 檔案內部衝突：重複座號 / 重複姓名（只比對通過格式驗證的列）
  const seenSeat = new Map<number, number>();
  const seenName = new Map<string, number>();
  for (const student of students) {
    if (seenSeat.has(student.seatNumber)) {
      rowErrors.push({ rowNumber: student.rowNumber, field: 'seat', code: `${P}.seatDupInFile` });
    } else {
      seenSeat.set(student.seatNumber, student.rowNumber);
    }
    if (seenName.has(student.name)) {
      rowErrors.push({ rowNumber: student.rowNumber, field: 'name', code: `${P}.nameDupInFile` });
    } else {
      seenName.set(student.name, student.rowNumber);
    }
  }

  if (rowErrors.length > 0) {
    rowErrors.sort((a, b) => a.rowNumber - b.rowNumber);
    return { ok: false, rowErrors };
  }

  if (students.length === 0) return { ok: false, fileErrorCode: `${P}.noRows` };

  return { ok: true, students };
}
