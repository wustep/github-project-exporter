const { default: axios } = require("axios");
const prompt = require("prompt");

require("dotenv").config();

const API_URL = "https://api.github.com";
const API_REPO_PROJECTS_URL = (owner, repo) =>
  `${API_URL}/repos/${owner}/${repo}/projects`;
const API_USER_OWNER_PROJECTS_URL = (orgOwner) =>
  `${API_URL}/users/${orgOwner}/projects`;
const API_ORG_OWNER_PROJECTS_URL = (userOwner) =>
  `${API_URL}/orgs/${userOwner}/projects`;

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

    const projects = await axios.get(projectsEndpoint, {
      headers,
    });

    const numProjects = projects?.data?.length ?? 0;

    if (numProjects === 0) {
      console.log("No projects found!");
      return;
    }
    console.group("Available Projects:");
    projects.data.forEach((project, index) =>
      console.log(`[${index}] ${project.name}: ${project.html_url}`)
    );

    const projectToLookup =
      projects.data[
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

    console.log(projectToLookup);
  } catch (err) {
    console.error(err);
  }
})();
