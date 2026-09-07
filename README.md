# StudySync

> A browser-based student productivity workspace for managing deadlines, daily tasks, focused study time, and weekly plans.

[Live Demo](https://study-sync-7a9f.vercel.app/#/app) · [Report a Bug](../../issues) · [Request a Feature](../../issues)

<img width="1582" height="945" alt="image" src="https://github.com/user-attachments/assets/c27ee4e0-9a60-4b16-bbcd-2df0c9073479" />


## Why StudySync?

Keeping track of assignments, study sessions, and deadlines can become stressful when they live in different places. StudySync brings them into one simple workspace, helping students plan their work and stay focused.

## Features

- **Assignment deadlines** — add assignments with course, due date, estimated effort, status, and reminder preferences.
- **Daily checklist** — capture quick tasks, mark them complete, and clear completed items.
- **Weekly timetable** — plan study sessions by day, time, and focus area.
- **Pomodoro timer** — use customizable focus and break intervals, with a session counter.
- **Deadline sharing** — export deadlines as an ICS calendar file or create a share code for classmates to import.
- **Progress tracker** — see assignment progress in one place.
- **Study planner** — generate balanced study blocks from upcoming deadlines and estimated effort.
- **Planning assistant** — generate a task plan and add it to the checklist or planner.
- **Authentication prototype** — sign up, sign in, or continue as a guest.
- **Admin and issue reporting** — submit issue reports and review prototype data in an admin area.
- **Responsive navigation** — use a mobile-friendly drawer on smaller screens.

<img width="3164" height="1890" alt="image" src="https://github.com/user-attachments/assets/8fb39860-722c-4678-9d16-aa0b2beec94c" />

<img width="3164" height="1890" alt="image" src="https://github.com/user-attachments/assets/f4db65c2-76a9-4fdc-b914-2bf023da278d" />

## Built With

- **HTML** — page structure and forms
- **CSS** — layout, responsive styling, and visual design
- **Vanilla JavaScript** — application logic, navigation, timers, planning, and browser interactions
- **Web Storage API** — locally stores prototype user and study data
- **Web Notifications API** — requests permission for browser notifications
- **Vercel** — deployment

## How It Works

1. Create an account, sign in, or continue as a guest.
2. Add assignment deadlines with their estimated effort.
3. Turn work into smaller tasks, study sessions, or planned focus blocks.
4. Use the timer and progress view to keep moving toward the deadline.
5. Export or share deadline information when working with classmates.

## Run Locally

This is a static web project, so no build process is required.

```bash
git clone https://github.com/Purvit30/StudySync.git
cd StudySync
```

Open `index.html` in a browser. For the most reliable behaviour, run it with a local development server such as VS Code Live Server.

## Project Structure

```text
StudySync/
├── index.html   # App layout, screens, forms, and navigation
├── styles.css   # Responsive styles
└── app.js       # Features, browser storage, timers, planner, and UI logic
```

## Current Scope

StudySync is a frontend prototype. Its users, authentication data, assignments, and reports are stored in the browser using `localStorage`. This keeps the project simple for learning and demonstration, but it is not a production authentication system.

## Future Improvements

- Add a secure backend and database for cross-device data sync
- Use server-side authentication and role management
- Add real calendar integrations
- Add automated tests and improved validation
- Allow collaboration through accounts rather than browser-only share codes
- Improve accessibility and support more notification settings

## Author

Built by [Purvit Shah](https://github.com/Purvit30).

## License

This project is currently for learning and portfolio purposes. Add a license before reusing it publicly.
