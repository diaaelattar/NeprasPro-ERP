/**
 * Frontend Classroom Formatter Utility
 * Formats classroom names for reports, rosters, printouts, and UI preview
 * according to Egyptian Ministry standards.
 */

export function formatClassroomLabel({
  classNumber,
  className,
  gradeNumber = 1,
  stageCode,
  stageName = '',
  sectionType = 'general',
  formatStyle
}) {
  const cNum = parseInt(classNumber, 10) || extractClassNumber(className) || 1;
  const gNum = parseInt(gradeNumber, 10) || 1;
  const sName = String(stageName || '').trim();
  const sCode = String(stageCode || '').trim();
  const sec = String(sectionType || '').toLowerCase();

  // 1. Languages & International Schools
  if (sec === 'languages' || sec === 'international' || formatStyle === 'english') {
    if (sName.includes('رياض') || sName.includes('حضانة') || sCode === 'kg') {
      return `KG${gNum}.C${cNum}`;
    }
    if (sName.includes('تمهيدي') || sCode === 'pre') {
      return `Pre-KG.C${cNum}`;
    }
    return `G${gNum}.C${cNum}`;
  }

  // 2. Egyptian Arabic Format:
  // - إعدادي: اختصارها "ع" -> "1 / 1 ع"
  // - ابتدائي: اختصارها "ب" -> "1 / 1 ب"
  // - ثانوي: اختصارها "ث" -> "1 / 1 ث"
  // - رياض أطفال / حضانة: اختصارها "ح" -> "1 / 1 ح"
  // - تمهيدي: "تمهيدي 1 / 1"

  if (sName.includes('إعدادي') || sName.includes('اعدادي')) {
    return `${gNum} / ${cNum} ع`.trim();
  }
  if (sName.includes('ابتدائي') || sName.includes('ابتدائى')) {
    return `${gNum} / ${cNum} ب`.trim();
  }
  if (sName.includes('ثانوي') || sName.includes('ثانوى')) {
    return `${gNum} / ${cNum} ث`.trim();
  }
  if (sName.includes('رياض') || sName.includes('حضانة')) {
    return `${gNum} / ${cNum} ح`.trim();
  }
  if (sName.includes('تمهيدي')) {
    return `تمهيدي ${gNum} / ${cNum}`;
  }

  // Fallback if stageName is empty: Check stageCode string if defined
  if (sCode === '4' || sCode === 'prep') return `${gNum} / ${cNum} ع`;
  if (sCode === '5' || sCode === 'sec')  return `${gNum} / ${cNum} ث`;
  if (sCode === '3' || sCode === 'pri')  return `${gNum} / ${cNum} ب`;
  if (sCode === '2' || sCode === 'kg')   return `${gNum} / ${cNum} ح`;

  return `${gNum} / ${cNum}`;
}

export function extractClassNumber(className, fallback = 1) {
  if (!className) return fallback;
  const str = String(className).trim();

  // Check pattern: "1 / 3" -> 3
  const slashMatch = str.match(/\/\s*(\d+)/);
  if (slashMatch) return parseInt(slashMatch[1], 10);

  // Check simple digit
  const numMatch = str.match(/(\d+)/);
  if (numMatch) return parseInt(numMatch[1], 10);

  return fallback;
}
