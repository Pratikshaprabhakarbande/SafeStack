import api from './api';

export const projectService = {
  uploadProject: async (file: File) => {
    const formData = new FormData();
    formData.append('project', file);

    const response = await api.post('/projects/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  importGitHubRepo: async (repoUrl: string, branch?: string) => {
    const response = await api.post('/projects/github', { repoUrl, branch });
    return response.data;
  },

  getProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },

  getProject: async (id: string) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  getScanHistory: async (id: string) => {
    const response = await api.get(`/projects/${id}/scans`);
    return response.data;
  },

  connectGitHubRepo: async (id: string, repoUrl: string, defaultBranch?: string) => {
    const response = await api.post(`/projects/${id}/connect-github`, { repoUrl, defaultBranch });
    return response.data;
  },

  deleteProject: async (id: string) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
};
