# PKM-DES Preview User Guide

This guide explains how to demonstrate the PKM-DES website to a Registrar and a student.

The demonstration always starts with the Registrar. The Registrar first enters the student's information. The student then creates an account, submits an enrollment request, and waits for the Registrar's decision.

> This website is for demonstration and review. Use fictional student information only. Do not enter real student records into the preview.

## What You Need Before Starting

- Open the deployed PKM-DES website: [pkm-des.vercel.app](https://pkm-des.vercel.app/)
- Have the private Registrar login details ready.

Do not place passwords or private email addresses in screenshots, presentations, or shared documents.

## Part 1: Registrar Starts The Process

### 1. Sign in as Registrar

1. Open the deployed website.
2. Select **Login**.
3. Enter the private Registrar email and password.
4. Select **Login**.

The Registrar should arrive at the **Admin Dashboard**.

![Registrar dashboard](assets/06-admin-dashboard.png)

*The Registrar dashboard shows enrollment requests. It does not count students who have only been entered into the student records list.*

### 2. Add the student's information

1. Select **Student Records** from the left menu.
2. Select **Add Official Record**.
3. Enter the student's information.
4. Choose the student's program, year level, and student type.
5. Select **Save Official Record**.

For the demonstration, use:

| Information | Example |
| --- | --- |
| First Name | John |
| Last Name | Doe |
| Student ID Number | `99-90001` |
| Email Address | `john.doe@example.com` |
| Program | Select the program being demonstrated |
| Year Level | Select the student's year level |
| Student Type | Select the student's type |

![Official student record form](assets/08-admin-official-record-form.png)

*The Student Records page is where the Registrar prepares the student's information before account creation.*

Saving this information does **not** enroll the student. It only prepares the student to create an account.

## Part 2: Student Creates An Account

### 3. Open Create Student Account

1. Sign out of the Registrar account, or open the website in a separate browser window.
2. Select **Create Student Account**.
3. Choose the student type.
4. Enter the same email address and Student ID that the Registrar entered.
5. Select **Find My Record**.

The student must enter both the email address and Student ID. The name, program, and year level come from the information entered by the Registrar.

![Create Student Account](assets/04-create-account.png)

*The student first finds the information prepared by the Registrar.*

![Filled account form](assets/05-account-claim-filled.png)

*Example using John Doe. This is a sample only and must not be submitted unless the same fictional information was entered by the Registrar.*

### 4. Check the information

When the information is found:

1. Check that the displayed name, program, and year level are correct.
2. Continue with the password or email setup instructions shown on the screen.
3. Finish creating the account.

If the information cannot be found, check the email address, Student ID, and student type. If the problem continues, the Registrar should check the Student Records page.

## Part 3: Student Submits Enrollment

### 5. Sign in as the student

1. Return to the **Login** page.
2. Enter the student's email and password.
3. Select **Login**.
4. Open **Student Dashboard**.

The dashboard shows the student's information and current enrollment status.

### 6. Review the Subject List

1. Select **Subject List** from the left menu.
2. Choose a program.
3. Choose a year level.
4. Review the subjects shown for each year and semester.

The Subject List is for viewing. Students do not choose individual subjects in this demonstration.

The website contains several programs and course offerings. Some programs may have more complete subject information than others. If a subject load is unavailable, contact the Registrar instead of guessing which subjects to take.

### 7. Submit the enrollment request

1. Select **Online Enrollment**.
2. Review the displayed student information.
3. Review the program, year level, student type, academic year, and semester.
4. Check **I certify that the information provided is correct**.
5. Select **Submit Enrollment**.

The student should see a confirmation that the request is waiting for Registrar review.

Submitting the form is **not** the same as being officially enrolled. The Registrar must still review the request.

### 8. View the request status

Open **Enrollment Status** to see the result:

- **Pending:** The Registrar has not finished reviewing the request.
- **Enrolled:** The Registrar approved the request.
- **Rejected:** The Registrar did not approve the request. Read the note shown on the page, if one was provided.

## Part 4: Registrar Reviews The Request

### 9. Open Pending Enrollments

1. Sign out of the student account.
2. Sign in again using the private Registrar account.
3. Select **Pending Enrollments**.
4. Select **Review request** for the fictional student.
5. Review the student information, attached subjects, and status-only requirement information in the modal.
6. Select **Approve** or **Reject**.
7. If rejecting the request, enter a short explanation when requested, then confirm the rejection.

Only submitted enrollment requests appear here. A student who has not submitted the Online Enrollment form will not appear in this list.

### 10. Check the results

After approval or rejection:

1. Open **Enrollment Masterlist** to view the enrollment records.
2. Open **Enrollment Reports** to view counts and filtered records.
3. Use the filters to narrow the displayed information.
4. Select the browser's print command when a paper copy is needed.

The Masterlist and Reports pages show enrollment requests, not every student record entered by the Registrar.

The decision is saved before any optional email delivery is attempted. In the research preview, email delivery is normally disabled. If the registration-form view shows a failed student notification and the approved delivery setup is available, the Registrar can select **Retry student notification**. Email messages do not include rejection remarks; students view those remarks in the portal.

## Part 5: Print The Registration Form

The student or Registrar can open the registration form from the enrollment result or review page.

1. Open the approved enrollment.
2. Select **View or Print Registration Form**.
3. Select the browser's **Print** command.
4. Choose a printer or **Save as PDF**.

The current form is a draft demonstration output based on the supplied sample. It is not yet the official PKM Certificate of Registration. It does not include electronic signatures, payment processing, or digital clearance.

## Public Pages

These pages are useful for introducing the project, but they are not the first step in the enrollment demonstration.

### Home

The Home page introduces PKM-DES and provides the Login and Create Student Account buttons.

![Home page](assets/01-home.png)

### About Us

The About Us page presents PKM's identity, vision, mission, goals, contact information, and public links.

![About Us page](assets/02-about.png)

### Login

The Login page is used by both students and the Registrar.

![Login page](assets/03-login.png)

## Pages Not Available Yet

The following pages are visible as part of the proposed website but do not contain final institutional information yet:

- Grades
- Class Schedule
- Balances
- Official Certificate of Registration generation
- Electronic signatures and clearance routing
- Payment or assessment processing
- Email delivery confirmation in the public demonstration

Do not present these pages as completed institutional services.

## Common Problems

### The student cannot find the record

Check that:

- the email is exactly the same as the one entered by the Registrar;
- the Student ID is exactly the same;
- the selected student type is correct.

If it still does not work, the Registrar should review the Student Records page.

### The student is not in Pending Enrollments

Entering a student into Student Records does not create an enrollment request. The student must create an account, sign in, and submit Online Enrollment first.

### The dashboard count is zero

The dashboard counts submitted enrollment requests. It does not count official student records that have not been submitted for enrollment.

### Online Enrollment is unavailable

The selected program or student type may need Registrar assistance, or the needed subjects may not be available for the selected year and semester. Contact the Registrar rather than selecting a different program or year level.

## Short Presentation Checklist

- [ ] Open the deployed website.
- [ ] Sign in as Registrar.
- [ ] Add John Doe as a fictional official student record.
- [ ] Sign out and create the student's account.
- [ ] Sign in as the student.
- [ ] Show the dashboard and Subject List.
- [ ] Submit Online Enrollment.
- [ ] Sign back in as Registrar.
- [ ] Approve or reject the fictional request.
- [ ] Show Enrollment Status, Masterlist, and Reports.
- [ ] Print the draft registration form.
- [ ] Explain that the form is a demonstration draft, not the official PKM Certificate of Registration.
