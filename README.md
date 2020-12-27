# github-project-exporter

Export GitHub Project cards into CSV files (for Notion and other apps)

I noticed there wasn't an easy way to export GitHub projects to other apps -- so I started building one!

## What this does

Given a GitHub project board:
![GitHub project board](photos/github-project.png)

Terminal output:
![Terminal output](photos/terminal-output.png)

CSV output:
![CSV output](photos/csv-output.png)

## How to use

Make sure you have `yarn` and `node` installed! Use `yarn install` in this directory to install dependencies, then `yarn start` to run the script.

Optionally, look at `env.example` and save a file called `.env` that follows the same structure to set up defaults for the script.
