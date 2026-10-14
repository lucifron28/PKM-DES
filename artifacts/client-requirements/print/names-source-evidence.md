# Registration signer name evidence

Names below were read from `C:\Users\Ron\Downloads\REG FORM WATERMARK-FRONT (1).docx`, specifically `word/document.xml` text nodes. The malformed HTML export is not used as page-layout evidence. Role placement follows the native Word page render `word-native-registration-reference-page-1.png`; DrawingML anchors corroborate the horizontal lanes.

| Role in source | Exact source name | Representative anchor X (pt from margin) | Evidence / print fixture use |
| --- | --- | ---: | --- |
| Acting Municipal Accountant | Atty. Romela D. Devera | 153.91; label 150.79 | Native Word render confirms left lane, fourth row; used for the Accountant fixture slot. |
| Librarian | Mary May P. Lanceta | 178.60; label 178.55 | Native Word render confirms left lane, third row; used for the Librarian fixture slot. |
| Nurse | Danella Joyce P. Urgelles, RN | 378.30; label 392.39 | Native Word render confirms right lane, third row; used for the School Nurse fixture slot. |
| Dean | Justiniano L. Santos, CPA, MBA | 368.00; label 390.05 | Native Word render confirms right lane, second row; used for the Dean fixture slot. |
| Program Chair | Ronel E. Caagbay, CPA, MBA | 379.65; label 391.80 | Native Word render confirms right lane, first row; used for the Program Chair fixture slot. |
| Registrar | Shaira Mae E. Pajares | 358.00; label 394.25 | Native Word render confirms right lane, fourth row; recorded here, not inserted into the Program Chair slot. |

The X values are representative OOXML `wp:posOffset` values divided by 12,700 EMU per point. The matching labels are `ACTING MUNICIPAL ACCOUNTANT`, `LIBRARIAN`, `NURSE`, `DEAN`, `PROGRAM CHAIR`, and `REGISTRAR`. X anchors document the lanes but are not used alone to infer a role. DrawingML Y offsets are `relativeFrom="paragraph"`, so they are not absolute page coordinates. Repeated copies contain repeated anchors; these are representative source anchors.

## Native Word layout authority

The native Word render is an 816 × 1056 px Letter page. Names sit above thin blue signature lines; role captions sit below, with no electronic-signature timestamps. The observed line anchors are Program Chair at right y=733, Dean at right y=789, Nurse at right y=843, Registrar at right y=901, Librarian at left y=844, and Acting Municipal Accountant at left y=901. The student line is near the lower-right (x≈496..773, y≈1012), and the copy label is at the lower-left. The photo/HTML rendering is not used to override this Word layout.

The six roles map to Word as follows: the four right-lane slots are Program Chair, Dean, Nurse, and Registrar from top to bottom; the left lane holds Librarian above Acting Municipal Accountant. Program Chair remains associated with its existing `PROGRAM_CLEARANCE` signature snapshot and is not presented as Registrar.

Registrar's line is populated from the backend `registrar_approval` projection (`name`, `approved_at`), derived from the recorded reviewer profile and approval timestamp. It has a blank image/signature area; no ink is synthesized. An absent approval leaves the name/date blank. `Shaira Mae E. Pajares` appears in the current QA fixture as reviewer metadata, not as a replacement signer snapshot. No official profile, stored signature, historical snapshot, or database row was changed. All new fixture e-signature images are synthetic and visibly marked `QA SYNTHETIC`.
