/**
 * Central Classroom Formatter Utility
 * Formats classroom names for reports, rosters, printouts, and control registers.
 * Standard format: Clean numeric sequence (1, 2, 3, 4, 5, 6...)
 */

function formatClassroomLabel({
  classNumber,
  className,
  gradeNumber = 1,
  stageCode,
  stageName = '',
  sectionType = 'general',
  formatStyle
}) {
  const cNum = parseInt(classNumber, 10) || extractClassNumber(className) || 1;
  return String(cNum);
}

function extractClassNumber(className, fallback = 1) {
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

module.exports = {
  formatClassroomLabel,
  extractClassNumber
};
