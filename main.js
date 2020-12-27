const { default: axios } = require("axios");
const prompt = require("prompt");
const Papa = require("papaparse");
const fs = require("fs");

require("dotenv").config();

const API_URL = "https://api.github.com";
const API_REPO_PROJECTS_URL = (owner, repo) =>
  `${API_URL}/repos/${owner}/${repo}/projects`;
const API_USER_OWNER_PROJECTS_URL = (orgOwner) =>
  `${API_URL}/users/${orgOwner}/projects`;
const API_ORG_OWNER_PROJECTS_URL = (userOwner) =>
  `${API_URL}/orgs/${userOwner}/projects`;
const API_PROJECT_COLUMNS_URL = (projectId) =>
  `${API_URL}/projects/${projectId}/columns`;
const API_COLUMN_CARDS_URL = (columnId) =>
  `${API_URL}/projects/columns/${columnId}/cards`;
const API_CARD_URL = (cardId) => `${API_URL}/projects/columns/cards/${cardId}`;

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

    const headers = {
      Accept: "application/vnd.github.inertia-preview+json",
      Authorization: `token ${token}`,
    };

    const projectsEndpoint = repo.length
      ? API_REPO_PROJECTS_URL(owner, repo)
      : isOwnerUser
      ? API_USER_OWNER_PROJECTS_URL(owner)
      : API_ORG_OWNER_PROJECTS_URL(owner);

    const projects = (
      await axios.get(projectsEndpoint, {
        headers,
      })
    ).data;

    const numProjects = projects?.length ?? 0;

    if (numProjects === 0) {
      console.log("No projects found!");
      return;
    }
    console.group("Available Projects:");
    projects.forEach((project, index) =>
      console.log(`[${index}] ${project.name}: ${project.html_url}`)
    );
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
    const projectId = projectToLookup.id;

    const columns = (
      await axios.get(API_PROJECT_COLUMNS_URL(projectId), {
        headers,
      })
    ).data;

    const exportData = [];

    for (column of columns) {
      const cards = (
        await axios.get(API_COLUMN_CARDS_URL(column.id), {
          headers,
        })
      ).data;
      for (card of cards) {
        const cardResponse = (
          await axios.get(API_CARD_URL(card.id), {
            headers,
          })
        ).data;

        exportData.push({
          column: column.name,
          note: cardResponse.content_url ?? cardResponse.note,
        });
      }
    }

    const { outputFilename } = await prompt.get({
      name: "outputFilename",
      default: "output/export.csv",
      description: "What file name to export to?",
      type: "string",
      required: true,
    });

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

    fs.writeFile(outputFilename, outputCSV, "utf8", () => {
      console.group(`Printed output to ${outputFilename}`);
      console.log(outputCSV);
      console.groupEnd();
    });
  } catch (err) {
    console.error(err);
  }
})();
