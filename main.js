const { default: axios } = require("axios");
const prompt = require("prompt");
const Papa = require("papaparse");
const fs = require("fs");
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

    const projectToLookup =
      projects[
        numProjects === 0
          ? projects.data[0]
          : (
              await prompt.get({
                name: "projectToLookup",
                default: 0,
                description: "Which project to export?",
                minimum: 0,
                maximum: numProjects - 1,
                required: true,
                type: "integer",
              })
            ).projectToLookup
      ];

    process.stdout.write("Getting cards...");

    const projectId = projectToLookup.id;

    const columns = await GitHub.getProjectColumns(projectId);

    const exportData = [];

    for (column of columns) {
      const cards = await GitHub.getColumnCards(column.id);
      for (card of cards) {
        exportData.push({
          column: column.name,
          note: card.content_url ?? card.note,
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

    // https://www.papaparse.com/docs#json-to-csv
    const outputCSV = Papa.unparse(exportData, {
      // These are all defaults for now! Change as needed.
      quotes: false,
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ",",
      header: true,
      newline: "\r\n",
      skipEmptyLines: false,
      columns: null,
    });

    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log();

    fs.writeFile(outputFilename, outputCSV, "utf8", () => {
      console.group(`Printed output to ${outputFilename}`);
      console.log(outputCSV);
      console.groupEnd();
      console.log();
    });
  } catch (err) {
    console.error(err);
  }
})();
