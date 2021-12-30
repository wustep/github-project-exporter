const axios = require("axios");

const API_URL = "https://api.github.com";

class GitHubQuery {
  constructor({ owner, repo, token, isOwnerUser }) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.isOwnerUser = isOwnerUser;
  }

  get = async (url, { prependAPIURL = true } = {}) => {
    return (
      await axios.get(prependAPIURL ? `${API_URL}/${url}` : url, {
        headers: {
          Accept: "application/vnd.github.inertia-preview+json",
          Authorization: `token ${this.token}`,
        },
      })
    ).data;
  };

  getProjects = async () => {
    return await this.get(
      this.repo.length
        ? `repos/${this.owner}/${this.repo}/projects`
        : `${this.isOwnerUser ? "users" : "orgs"}/${this.owner}/projects`
    );
  };

  getProjectColumns = async (projectId) => {
    return await this.get(`projects/${projectId}/columns`);
  };

  getColumnCards = async (columnId) => {
    let result = [];
    let page = 1;
    let limit = 100;
    do {
      const res = await this.get(`projects/columns/${columnId}/cards?per_page=${limit}&page=${page}`);
      result = [...result, ...res]
      page++;
    } while (result.length >= limit * (page - 1));

    return result;
  };
}

module.exports = { GitHubQuery };
