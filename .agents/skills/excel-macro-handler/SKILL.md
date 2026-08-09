---
name: excel-macro-handler
description: Guidelines and procedures for handling Egyptian Ministry of Education Excel templates (.xltm) and exporting macro-enabled spreadsheets (.xlsm) in NeprasPro.
---

# Excel Macro Handler Guidelines & Template Export Standards

## 1. Native Direct Template Export Rules
- Official Ministry templates use `.xltm` or `.xlsm` extensions.
- **VBA Macro Integrity**: Never parse or rebuild `xl/vbaProject.bin`. Copy all un-modified zip entries as raw binary bytes.
- **Inline String Injection (`t="inlineStr"`)**:
  - Inject text directly using `<c r="REF" s="STYLE" t="inlineStr"><is><t xml:space="preserve">TEXT</t></is></c>`.
  - Clean previous `t="..."` attributes before appending `t="inlineStr"` to avoid duplicate XML attributes error.
- **ContentType Transformation**:
  - Replace `application/vnd.ms-excel.template.macroEnabled.main+xml` with `application/vnd.ms-excel.sheet.macroEnabled.main+xml` inside `[Content_Types].xml`.
  - Ensures Excel opens the generated file directly as an active `.xlsm` spreadsheet with data and macros ready to run.

## 2. Batch Processing & PDF Standard
- Support single-class export (`.xlsm`) and batch exports (`.zip` containing individual `.xlsm` files per class).
- Provide optional PDF rendering using Puppeteer for fast A4 printing.

## 3. Node.js Export Routine Safety
- Ensure binary buffer preservation when streaming `.xlsm` output to client endpoints.
- Set header `Content-Type: application/vnd.ms-excel.sheet.macroEnabled.12`.
