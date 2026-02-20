export type ScanResult = {
  documentNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  nationality?: string;
  confidence: number;
  rawText: string;
};

export function extractDocumentData(rawText: string, category: string, confidence: number): ScanResult | null {
  if (!rawText.trim()) return null;

  if (category === 'passport' || category === 'residence_permit') {
    return (
      parseMrz(rawText, confidence) ??
      parsePassportLikeText(rawText, confidence) ??
      parseCyrillicPassport(rawText, confidence) ??
      parseNumberAndName(rawText, confidence)
    );
  }

  if (category === 'tax_id' || category === 'company_document') {
    return parseNumberAndName(rawText, confidence);
  }

  return parseNumberAndName(rawText, confidence);
}

function parseMrz(rawText: string, confidence: number): ScanResult | null {
  const lines = rawText
    .toUpperCase()
    .replace(/[^A-Z0-9<\n]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 30);

  for (let index = 0; index < lines.length - 1; index += 1) {
    const line1 = lines[index];
    const line2 = lines[index + 1];

    if (!line1.startsWith('P<') && !line1.startsWith('I<') && !line1.startsWith('A<')) continue;
    if (line2.length < 30) continue;

    const normalizedLine1 = line1.padEnd(44, '<').slice(0, 44);
    const normalizedLine2 = line2.padEnd(44, '<').slice(0, 44);

    const documentNumber = normalizedLine2.slice(0, 9).replace(/</g, '').trim();
    const nationality = normalizedLine2.slice(10, 13).replace(/</g, '').trim();
    const birthRaw = normalizedLine2.slice(13, 19);
    const expiryRaw = normalizedLine2.slice(21, 27);
    const namesRaw = normalizedLine1.slice(5);

    const [surnameRaw, givenRaw] = namesRaw.split('<<');
    const surname = (surnameRaw ?? '').replace(/</g, ' ').trim();
    const givenNames = (givenRaw ?? '').replace(/</g, ' ').trim();
    const fullName = `${givenNames} ${surname}`.trim().replace(/\s+/g, ' ');

    if (!documentNumber) continue;

    return {
      documentNumber,
      fullName: fullName || undefined,
      dateOfBirth: parseMrzDate(birthRaw, 'birth'),
      expiryDate: parseMrzDate(expiryRaw, 'expiry'),
      nationality: nationality || undefined,
      confidence,
      rawText
    };
  }

  return null;
}

function parsePassportLikeText(rawText: string, confidence: number): ScanResult | null {
  const normalized = normalizeWhitespace(rawText);
  const upper = normalized.toUpperCase();

  const numberFromKeyword =
    upper.match(/(?:PASSPORT\s*NO|DOCUMENT\s*NO|NO\.?|№)\s*[:#]?\s*([A-Z0-9]{6,14})/)?.[1] ?? undefined;

  const genericNumber = normalized.match(/\b[A-Z0-9]{8,14}\b/g)?.sort((a, b) => b.length - a.length)?.[0];
  const documentNumber = numberFromKeyword ?? genericNumber;

  const birthMatch = normalized.match(/(\d{2}[./-]\d{2}[./-]\d{4})/g)?.[0];
  const expiryMatch = normalized.match(/(?:EXP|VALID\s*UNTIL)\s*[:]?\s*(\d{2}[./-]\d{2}[./-]\d{4})/i)?.[1];

  const latinName = findLikelyLatinName(normalized);
  const nationality = normalized.match(/\b[A-Z]{3}\b/g)?.find((code) => code !== 'PAS' && code !== 'DOC');

  if (!documentNumber && !latinName && !birthMatch) return null;

  return {
    documentNumber,
    fullName: latinName,
    dateOfBirth: birthMatch ? normalizeDate(birthMatch) : undefined,
    expiryDate: expiryMatch ? normalizeDate(expiryMatch) : undefined,
    nationality,
    confidence,
    rawText
  };
}

function parseCyrillicPassport(rawText: string, confidence: number): ScanResult | null {
  const normalized = normalizeWhitespace(rawText);
  const upper = normalized.toUpperCase();

  const numberCandidates: string[] = [];
  const patterns = [
    /(?:ПАСПОРТ|НОМЕР|№|NO|N)\s*[:]?\s*(\d{2}\s?\d{6,7})/g,
    /\b\d{2}\s?\d{7}\b/g,
    /\b\d{2}\s?\d{6}\b/g
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(upper)) !== null) {
      numberCandidates.push(match[1] ?? match[0]);
    }
  }

  const cleanedNumberCandidates = numberCandidates
    .map((value) => value.replace(/\s+/g, ''))
    .filter((value) => value.length >= 8)
    .sort((a, b) => b.length - a.length);

  const documentNumber = cleanedNumberCandidates[0];

  const dateCandidates = normalized.match(/\d{2}[./-]\d{2}[./-]\d{4}/g) ?? [];
  const normalizedDates = dateCandidates.map(normalizeDate).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  const dateOfBirth = pickBirthDate(normalized, normalizedDates);
  const expiryDate = pickExpiryDate(normalized, normalizedDates);

  const fullName = findLikelyCyrillicName(normalized) ?? findLikelyLatinName(normalized);

  const nationality =
    normalized.match(/(?:ГРАЖДАНСТВО|NATIONALITY)\s*[:]?\s*([A-ZА-ЯЁ]{2,})/i)?.[1] ??
    (upper.includes('RUS') ? 'RUS' : undefined);

  if (!documentNumber && !fullName && !dateOfBirth) return null;

  return {
    documentNumber,
    fullName,
    dateOfBirth,
    expiryDate,
    nationality,
    confidence,
    rawText
  };
}

function parseNumberAndName(rawText: string, confidence: number): ScanResult | null {
  const normalized = normalizeWhitespace(rawText);
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const numberCandidates = normalized.match(/[A-Z0-9]{8,20}/g) ?? [];
  const documentNumber = numberCandidates.sort((a, b) => b.length - a.length)[0];

  const nameLine =
    lines.find((line) => /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(line)) ??
    lines.find((line) => /[А-ЯЁ]{2,}\s+[А-ЯЁ]{2,}/i.test(line));
  const fullName = nameLine?.replace(/\s+/g, ' ').trim();

  const birthMatch = normalized.match(/(\d{2}[./-]\d{2}[./-]\d{4})/);

  if (!documentNumber && !fullName && !birthMatch) return null;

  return {
    documentNumber,
    fullName,
    dateOfBirth: birthMatch ? normalizeDate(birthMatch[1]) : undefined,
    confidence,
    rawText
  };
}

function findLikelyLatinName(text: string): string | undefined {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.length >= 4)
    .filter((line) => /^[A-Za-z\s'-]+$/.test(line));

  for (let i = 0; i < lines.length - 1; i += 1) {
    const combined = `${lines[i]} ${lines[i + 1]}`.replace(/\s+/g, ' ').trim();
    if (combined.split(' ').length >= 2) return titleCaseWords(combined);
  }

  return lines[0] ? titleCaseWords(lines[0]) : undefined;
}

function findLikelyCyrillicName(text: string): string | undefined {
  const skipWords = ['РОССИЙСКАЯ', 'ФЕДЕРАЦИЯ', 'ПАСПОРТ', 'СЕРИЯ', 'НОМЕР', 'RUSSIAN', 'FEDERATION'];

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /[А-ЯЁ]/i.test(line))
    .filter((line) => !skipWords.some((word) => line.toUpperCase().includes(word)));

  const nameParts: string[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/[^А-ЯЁA-Z\s'-]/gi, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    if (cleaned.length < 3) continue;
    if (cleaned.split(' ').length > 5) continue;
    nameParts.push(cleaned);
    if (nameParts.length >= 3) break;
  }

  if (nameParts.length === 0) return undefined;
  return titleCaseWords(nameParts.join(' '));
}

function pickBirthDate(text: string, dates: string[]): string | undefined {
  const keyword = text.toLowerCase();
  if (keyword.includes('дата рождения') || keyword.includes('date of birth')) {
    return dates[0];
  }

  const now = new Date().toISOString().slice(0, 10);
  const plausible = dates.filter((date) => date <= now && Number(date.slice(0, 4)) >= 1930);
  return plausible[0] ?? dates[0];
}

function pickExpiryDate(text: string, dates: string[]): string | undefined {
  const keyword = text.toLowerCase();
  if (!(keyword.includes('действител') || keyword.includes('valid'))) return undefined;

  const now = new Date().toISOString().slice(0, 10);
  const future = dates.filter((date) => date >= now);
  return future[0] ?? undefined;
}

function parseMrzDate(value: string, mode: 'birth' | 'expiry'): string | undefined {
  if (!/^\d{6}$/.test(value)) return undefined;

  const year = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));

  const nowYear = new Date().getFullYear() % 100;

  let fullYear = 2000 + year;
  if (mode === 'birth' && year > nowYear) fullYear = 1900 + year;
  if (mode === 'expiry' && year < nowYear - 10) fullYear = 2100 + year;

  return `${fullYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}

function normalizeDate(value: string): string {
  const parts = value.split(/[./-]/);
  if (parts.length !== 3) return value;
  const [day, month, year] = parts;
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r/g, '').replace(/\t/g, ' ').replace(/\u00A0/g, ' ').replace(/ +/g, ' ').trim();
}

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
