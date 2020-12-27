const axios = require("axios");

const API_URL = "https://api.github.com";

class GitHubQuery {
  constructor({ owner, repo, token, isOwnerUser }) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.isOwnerUser = isOwnerUser;
  }

  _get = async (url) => {
    return (
      await axios.get(url, {
        headers: {
          Accept: "application/vnd.github.inertia-preview+json",
          Authorization: `token ${this.token}`,
        },
      })
    ).data;
  };

  getProjects = async () => {
    return await this._get(
      this.repo.length
        ? `${API_URL}/repos/${this.owner}/${this.repo}/projects`
        : `${API_URL}/${this.isOwnerUser ? "users" : "orgs"}/${
            this.owner
          }/projects`
    );
  };

  getProjectColumns = async (projectId) => {
    return await this._get(`${API_URL}/projects/${projectId}/columns`);
  };

  getColumnCards = async (columnId) => {
    return await this._get(`${API_URL}/projects/columns/${columnId}/cards`);
  };

  getCard = async (cardId) => {
    return await this._get(`${API_URL}/projects/columns/cards/${cardId}`);
  };
}

module.exports = { GitHubQuery };
