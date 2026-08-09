---
name: egyptian-id-validator
description: Standard logic and verification rules for 14-digit Egyptian National IDs and birth dates in NeprasPro.
---

# Egyptian National ID Validation Guidelines

## 1. 14-Digit Structure Breakdown
An Egyptian National ID consists of 14 numerical digits: `C YY MM DD SS GGG K`
- **C** (Digit 1): Century indicator (2 = 1900-1999, 3 = 2000-2099).
- **YY MM DD** (Digits 2-7): Birth Date (Year, Month, Day).
- **SS** (Digits 8-9): Governorate Code (e.g. 01 Cairo, 02 Alexandria, 03 Port Said, 12 Daqahlia, 15 Gharbia, 21 Giza, etc.).
- **GGG** (Digits 10-12): Sequence number.
- **G** (Digit 13): Gender indicator (Odd = Male, Even = Female).
- **K** (Digit 14): Check digit.

## 2. Validation Checklist
1. Must contain exactly 14 numeric characters (`/^[23]\d{13}$/`).
2. Extract full birth date:
   - If `C == 2`, year is `1900 + YY`.
   - If `C == 3`, year is `2000 + YY`.
3. Validate Gregorian calendar date validity (month 01-12, valid days for the month).
4. Prevent future dates (Birth Date <= Current Date).
5. Cross-check calculated birth date with student's entered DOB input on both frontend and backend.
6. Enforce DB unique constraint on `national_id`.
