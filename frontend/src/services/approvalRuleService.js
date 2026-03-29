import apiClient from './apiClient';
import loadingService from './loadingService';

function pickMessage(error) {
  const data = error.response?.data;
  if (data && typeof data.message === 'string') return data.message;
  if (Array.isArray(data?.errors) && data.errors[0]?.message) return data.errors[0].message;
  return error.message || 'Request failed';
}

function toHttpError(error) {
  return Object.assign(new Error(pickMessage(error)), {
    response: error.response,
    code: error.code,
  });
}

async function request(fn) {
  try {
    return await fn();
  } catch (error) {
    throw toHttpError(error);
  }
}

const approvalRuleService = {
  getApprovalRuleConfig: async () => request(async () => {
    const { data } = await apiClient.get('/approval-rules');
    return {
      rules: Array.isArray(data.rules) ? data.rules : [],
    };
  }),

  saveApprovalRuleConfig: async (payload) => (
    loadingService.withGlobalLoading(() => request(async () => {
      const { data } = await apiClient.put('/approval-rules', payload);
      return data;
    }))
  ),
};

export default approvalRuleService;
