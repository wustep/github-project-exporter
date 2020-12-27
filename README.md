# github-project-exporter

Export GitHub Project cards into CSV files for Notion or other apps!

I noticed there wasn't an easy way to export GitHub projects to other apps -- so I started building one!

## What this does

Given a GitHub project board:
![GitHub project board](photos/github-project.png)

Terminal output:
![Terminal output](photos/terminal-output.png)

CSV output:
![CSV output](photos/csv-excel-output.png)

Imported to notion:
_Minor processing: I swapped a few columns to be "Multi-Select", added some tag colors, and moved a few columns around._
![Imported to notion](photos/notion-import-list.png)

Notion kanba style (Group by "column"):
_Note that body text from Issues does not convert GitHub HTML to Notion's markdown._
![Notion as kanba board](photos/notion-import-kanba.png)

## How to use

Make sure you have `yarn` and `node` installed! Use `yarn install` in this directory to install dependencies, then `yarn start` to run the script.

Optionally, look at `env.example` and save a file called `.env` that follows the same structure to set up defaults for the script.

## Contributing

Feel free to submit a PR or issues and I'll try to respond within a week!

This script uses the [GitHub API](https://docs.github.com/en/free-pro-team@latest/rest/reference/projects) based on API calls from December 2020.

**Todos:**

- `issue_body` text is not imported very cleanly into Notion. (see screenshot above)
  - HTML should ideally be converted to Markdown
  - It should be the body text of the Page instead of a custom field
