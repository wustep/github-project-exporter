const { default: axios } = require("axios");
const prompt = require("prompt");
const Papa = require("papaparse");
const fs = require("fs-extra");
require("dotenv").config();

const { GitHubQuery } = require("./github");

(async () => {
  try {
    console.log("GitHub Project Exporter");
    console.log("-----------------------");

    prompt.start();
    const { owner, repo, token } = await prompt.get([
      {
        name: "owner",
        default: process.env.OWNER ?? undefined,
        description: "Owner (username or organization)",
        required: true,
      },
      {
        name: "repo",
        default: process.env.REPO ?? "",
        description: "Repo name (leave blank for user/org project)", // Prompt displayed to the user. If not supplied name will be used.
        type: "string",
      },
      {
        name: "token",
        default: process.env.TOKEN ?? undefined,
        description: "Personal access token",
        required: true,
        type: "string",
      },
    ]);

    const isOwnerUser =
      repo.length === 0
        ? (
            await prompt.get({
              name: "ownerIsUser",
              before: (v) => {
                return v[0] === "u";
              },
              default: "user",
              description: "Is the owner a user or org?",
              message: "Must be 'user' or 'org'",
              pattern: /(u|user|org|organization)$/,
              type: "string",
              required: true,
            })
          ).ownerIsUser
        : true;

    const GitHub = new GitHubQuery({ owner, repo, token, isOwnerUser });

    process.stdout.write("Getting projects...");

    const projects = await GitHub.getProjects();
    const numProjects = projects?.length ?? 0;

    process.stdout.clearLine();
    process.stdout.cursorTo(0);

    if (numProjects === 0) {
      console.log("\r\nNo projects found!");
      return;
    }
    console.group("\r\nAvailable Projects:");
    projects.forEach((project, index) =>
      console.log(`[${index}] ${project.name}: ${project.html_url}`)
    );
    console.log();
    console.groupEnd();

    const { projectIndex } = await prompt.get({
      name: "projectIndex",
      default: 0,
      description: "Which project to export?",
      minimum: 0,
      maximum: numProjects - 1,
      required: true,
      type: "integer",
    });

    process.stdout.write("Getting cards...");

    const projectId = projects[projectIndex].id;
    const columns = await GitHub.getProjectColumns(projectId);

    const exportData = [];

    /**
     * We use PapaParse for parsing to CSV, which uses the fields of the first object for the CSV headers,
     * unless we manually specify an array of headers (`columnHeaders`).
     * Since we might not need to have issue columns, if there's no issue-based cards, we only add them if needed.
     */
    let csvHeaders = [];
    let addedCardHeaders = false;
    let addedIssueHeaders = false;

    for (column of columns) {
      const cards = await GitHub.getColumnCards(column.id);
      column.numCards = cards.length;
      for (card of cards) {
        // For a regular note card, `card.note` is the card contents.
        // For an Issue card, `card.note` is null.
        let title = card.note;

        // If card is an issue, populate issue fields.
        let issueFields = {};
        if (card.content_url?.includes("issues")) {
          atleastOneIssue = true;
          const issue = await GitHub.get(card.content_url, {
            prependAPIURL: false,
          });
          title = issue.title;
          issueFields = {
            issue_state: issue.state,
            issue_labels: issue.labels.length
              ? issue.labels.reduce((labelString, label) => {
                  return labelString === null
                    ? label.name
                    : labelString + ", " + label.name;
                }, null)
              : undefined,
            issue_link: issue.html_url, // This is either the PR request (if exists) or issue
            issue_body: issue.body,
            issue_assignees: issue.assignees.length
              ? issue.assignees.reduce((assigneeString, assignee) => {
                  return assigneeString === null
                    ? assignee.login
                    : assigneeString + ", " + assignee.login;
                }, null)
              : undefined,
            issue_created_at: issue.created_at,
            issue_updated_at: issue.updated_at,
            issue_closed_at: issue.closed_at,
          };
        }

        const cardFields = {
          title: title,
          column: column.name,
          creator: card.creator.login,
          created_at: card.created_at,
          updated_at: card.updated_at,
        };

        if (!addedCardHeaders) {
          addedCardHeaders = true;
          csvHeaders = csvHeaders.concat(Object.keys(cardFields));
        }
        if (!addedIssueHeaders && Object.keys(issueFields).length) {
          addedIssueHeaders = true;
          csvHeaders = csvHeaders.concat(Object.keys(issueFields));
        }

        exportData.push({
          ...cardFields,
          ...issueFields,
        });
      }
    }

    process.stdout.clearLine();
    process.stdout.cursorTo(0);

    const { outputFilename } = await prompt.get({
      name: "outputFilename",
      default: "output/export.csv",
      description: "What file name to export to?",
      type: "string",
      required: true,
    });

    process.stdout.write("Writing to csv...");

    const outputCSV = Papa.unparse(exportData, {
      // These are all PapaParse defaults for now! Change as needed.
      // https://www.papaparse.com/docs#json-to-csv
      quotes: false,
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ",",
      header: true,
      newline: "\r\n",
      skipEmptyLines: false,
      // Custom values
      columns: csvHeaders,
    });

    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log();

    fs.outputFile(outputFilename, outputCSV, {encoding: "utf8"}, (err) => {
      if (err) {
        throw(err);
      }
      console.group(`Printed output to ${outputFilename}`);
      columns.forEach((column) =>
        console.log(`${column.name}: ${column.numCards}`)
      );
      console.groupEnd();
      console.log();
    });
  } catch (err) {
    let errorMessage;
    switch (err.response?.status) {
      case 404:
        errorMessage = "[error] The resource you requested was not found!";
        break;
      case 401:
        errorMessage =
          "[error] You are unauthorized to access that resource!\r\nYou might have an invalid access token or just not have permission to access that project.";
        break;
      default:
        errorMessage = err;
        break;
    }
    console.error(`\r\n\r\n${errorMessage}`);
  }
})();
