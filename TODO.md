# TODO: Modify Exam Registration Download to Match Template

## Tasks
- [ ] Modify downloadRegisteredPlayers function in CoachDashboard.tsx to match the template from "كشف إختبار حديث 2026.doc"
- [ ] Add logo to the document (using public/logo.png)
- [ ] Limit each document to 20 players max, create multiple files if more players
- [ ] Ensure the document structure matches the template (title, coach info, table, etc.)
- [ ] Test the functionality

## Information Gathered
- The template file "كشف إختبار حديث 2026.doc" contains the desired format for exam registration lists
- Each document should have a logo, title, coach information, and a table with player data
- Maximum 20 players per document; if more, create additional documents
- This is for exam registrations only

## Plan
1. Update the downloadRegisteredPlayers function to include logo and match template structure
2. Implement logic to split players into chunks of 20
3. Generate multiple documents if needed, with appropriate file names
4. Add necessary imports for image handling in docx

## Dependent Files
- src/pages/CoachDashboard.tsx (main file to edit)

## Followup Steps
- Test the download functionality
- Verify the generated documents match the template
- Ensure logo path is correct (public/logo.png)
