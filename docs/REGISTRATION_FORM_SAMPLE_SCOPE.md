# Registration Form Sample Scope

Source file reviewed:

- `REGISTRATION FORM 4G.xlsx`

## How The Sample Is Used

The workbook is used as a visual/layout reference for the PKM-DES MVP browser-print registration form.

Implemented layout cues include:

- PKM school header
- Student number, name, course/program, address, year/section, semester/academic year, status, and classification fields
- Registration form subject table with subject code, description, time, day, room, and units
- Total units row
- Assessment of tuition and other school fees section
- Payment row placeholders
- Dean, Librarian, Nurse, Accountant, and Registrar signature labels
- Data privacy authorization text

## What Is Not Imported

The workbook contains a `LIST OF STUDENTS` sheet with real-looking names, student numbers, addresses, course data, and fee formulas. That sheet is not imported, committed, seeded, or used as source data for this project.

The sample references BTVTED 4G and `2ND/2025-2026`. These are not added as official PKM-DES programs, enrollment terms, or curriculum records.

## Current MVP Treatment

PKM-DES continues to populate the registration form from existing enrollment records and attached subjects.

Fields not yet supported by the MVP remain blank or clearly labeled as placeholders:

- Full official section assignment
- Subject time/day/room unless schedule data exists later
- Tuition and school fee amounts
- Scholarship details
- Official receipt number, date, and payment amount
- Final official COR/PDF generation

## Future Inputs Needed

Before the printout becomes the final official registration form, PKM still needs to confirm:

- Whether this workbook is the approved official COR/registration template
- Official fee/payment computation and display rules
- Official scholarship display rules
- Official section naming rules
- Whether browser printing is acceptable for production or a locked PDF format is required
