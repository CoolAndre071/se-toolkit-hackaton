# Task 5 Presentation Draft (5 Slides)

Use this content directly in Google Slides / PowerPoint.
Replace placeholders before final submission.

## Slide 1 - Title

- Product title: Deadline Coach
- Name: <YOUR_NAME>
- University email: <YOUR_EMAIL>
- Group: <YOUR_GROUP>

## Slide 2 - Context

- End user: University students who track multiple course assignments and personal study tasks.
- Problem: Students miss deadlines because they do not have one clear daily list of what to do first.
- Product idea: Deadline Coach is a web app that collects student tasks and shows a clear do-next plan.

## Slide 3 - Implementation

- Stack: FastAPI backend, SQLite database, static web client, uv for dependency and run workflow.
- Version 1:
  - create tasks
  - mark tasks done
  - today plan generation
  - all tasks list
- Version 2:
  - task editing (title, course, deadline, effort)
  - multi-user isolation by X-User-Id
  - all-tasks filter (open only / all)
  - today plan focused on overdue + due-today tasks
- TA feedback addressed:
  - keep core flow simple and practical
  - avoid unnecessary complexity in prioritization
  - clarify effort as user-entered input

## Slide 4 - Demo

- Insert your pre-recorded video (max 2:00) showing Version 2.
- Recommended flow:
  - set active user
  - create several tasks
  - show Today Plan
  - edit a task and save
  - mark task done
  - switch All Tasks filter
  - switch user to prove isolation

## Slide 5 - Links

- GitHub repo: https://github.com/CoolAndre071/se-toolkit-hackaton
- Deployed product: <DEPLOYED_PRODUCT_URL>
- Add QR for each link (repo + deployed app).
- Put both clickable links and QR images on the slide.
