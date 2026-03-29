const MOCK_DELAY = 550;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => JSON.parse(JSON.stringify(value));

let storedRuleConfig = {
  steps: [
    { id: 'step-1', approverId: 'APR-101' },
    { id: 'step-2', approverId: 'APR-102' },
    { id: 'step-3', approverId: 'APR-103' },
  ],
  percentageThreshold: 65,
  specificApproverId: 'APR-104',
  isHybridRuleEnabled: true,
};

const approvalRuleService = {
  getApprovalRuleConfig: async () => {
    await wait(MOCK_DELAY);
    return clone(storedRuleConfig);
  },

  saveApprovalRuleConfig: async (payload) => {
    await wait(MOCK_DELAY);
    storedRuleConfig = clone(payload);
    return { success: true };
  },
};

export default approvalRuleService;
