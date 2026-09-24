import api from './api';

export const scanService = {
  createScan: async (projectId: string) => {
    const response = await api.post('/scans', { projectId });
    return response.data;
  },

  getScanStatus: async (scanId: string) => {
    const response = await api.get(`/scans/${scanId}`);
    return response.data;
  },

  getScanResults: async (scanId: string) => {
    const response = await api.get(`/scans/${scanId}/results`);
    return response.data;
  },
};
