---
name: nepraspro-guidelines
description: Core guidelines and standards for developing, designing, and maintaining the Egypt Smart School ERP (NeprasPro). Use this skill whenever planning, building, or modifying features, control modules, database migrations, or Excel macro reports.
---

# NeprasPro Guidelines & Best Practices

## 1. General Rules Overview
When developing any module or component for NeprasPro, always adhere to the core principles defined in `AGENTS.md` and `architecture-rules.md`:

- **Database Safety**: Never change the DB path from `%USERPROFILE%/.nepraspro/nepraspro.db`.
- **Cumulative Migrations**: Write safe SQL migrations with checks (`PRAGMA table_info`, `IF NOT EXISTS`).
- **5-Question Rule**: Ask 5 specific clarifying questions before making any changes in control or core modules.
- **Designer-Driven Rules**: Grade boundaries and evaluation controls are defined per designer/user input upon request.
- **EMIS Visual Identity**: Use `#1a3c6e` headers, `#f0f2f5` background, `#ffffff` cards, and `Cairo` font.
- **Excel Macro Preservation**: Export templates as `.xlsm` preserving macros intact.

## 2. Checklist for New Feature Development
1. Read `CONTEXT.md` to confirm the latest state.
2. Ask 5 clarifying questions if working on control/core modules.
3. Use code-based queries (`codes` instead of Arabic strings).
4. Verify National ID (14 digits) and date inputs.
5. Update `CONTEXT.md` upon completion.
