# NEET Prep Pro

Create a professional personal NEET 2027 CBT Practice Website for my personal use only.



The website should closely resemble the official NTA NEET CBT examination interface with a clean, modern and responsive design.



Use React, TypeScript, Tailwind CSS and Supabase.



Create a single Admin account.



The Admin Dashboard must allow:



- Add Questions

- Edit Questions

- Delete Questions



Each question must include:



- Subject (Physics, Chemistry, Botany, Zoology)

- Chapter

- Major Topic

- Difficulty (Easy / Medium / Hard)

- PYQ (Yes / No)

- Question

- Optional Image

- Option A

- Option B

- Option C

- Option D

- Correct Answer

- Explanation



All questions must be stored in Supabase.



Questions added from any phone or computer using the same admin account should automatically sync across all devices.



Create the Home Page with these options:



- Subject-wise Practice

- Chapter-wise Practice

- Major Topic-wise Practice

- Difficulty-wise Practice

- PYQ Practice

- Full Mock Test



Create Custom Practice where I can select:



- Subject

- Chapter

- Major Topic

- Difficulty

- Number of Questions

- Custom Timer



Then generate the practice test.

Create a Full Mock Test mode.



The CBT Exam screen should look and behave like the official NTA NEET CBT interface.



Include:



- NEET Header

- Subject Tabs

- Countdown Timer

- Question Number

- Question

- Optional Image

- Four Options



Buttons:



- Save & Next

- Save & Mark for Review

- Mark for Review & Next

- Clear Response

- Previous

- Next

- Submit Test



Create a Question Palette showing all question numbers.



Use NTA color coding:



Grey = Not Visited



Red = Not Answered



Green = Answered



Purple = Marked for Review



Purple with Green = Answered & Marked for Review



Show live counters for all question statuses.



Allow direct navigation by clicking any question number.



Update question colors instantly whenever the status changes.



Before submitting show a confirmation popup.



After submission show:



- Total Questions

- Correct Answers

- Wrong Answers

- Unanswered Questions

- Final Score

- NEET Marking (+4 / -1)

- Percentage

- Total Time Taken

- Time Spent on Every Question



Create an Answer Review page.



For every question show:



- Question

- Your Answer

- Correct Answer

- Correct / Wrong / Skipped

- Explanation

- Time Spent on that Question



Allow Previous and Next navigation during answer review.



The code should be modular, scalable and production-ready with a professional NTA-style UI.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mockmate-neet.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1b29db61-1f27-44fd-9a87-d2b222533730).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
