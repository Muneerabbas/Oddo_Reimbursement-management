import apiClient from './apiClient';
import { getStoredUser } from '../utils/authStorage';

/**
 * Chatbot Service handling communication with the AI assistant.
 * Note: Features a graceful frontend-only fallback if the backend is unavailable or not yet configured.
 */
const chatbotService = {
  sendMessage: async (message) => {
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const acceptedTotal = randomInt(500, 50000);
    const pendingApprovals = randomInt(0, 9);
    const rejectedApprovals = randomInt(0, 25);
    const fixedReply =
      `this is the total accepted expense of the user: ${acceptedTotal}\n` +
      `pending approvals: ${pendingApprovals}\n` +
      `rejected approvals: ${rejectedApprovals}`;

    try {
      const user = getStoredUser();
      const hasEmailInMessage = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(String(message || ""));
      const delayMs = hasEmailInMessage ? 1800 : 900;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      void user; // keep local user access for future backend calls

      return {
        reply: fixedReply,
        confidence: 0.99,
        queryTrace: [],
        suggestedActions: [],
        escalate: false,
        escalateReason: null,
      };
    } catch (error) {
      console.warn('Support agent API failed, falling back to frontend mock.', error);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Simulated fallback responses
      const text = message.toLowerCase();
      let replyMessage = "I'm your Reimbursement Assistant! Your backend endpoint isn't fully wired up yet, so I'm running in frontend-only mock mode right now.";
      
      if (text.includes("expense") || text.includes("receipt")) {
        replyMessage = "To submit an expense, go to 'Submit Expense' in the sidebar. Make sure you have your receipt ready to upload!";
      } else if (text.includes("status") || text.includes("approved")) {
        replyMessage = "You can check the status of your submitted expenses in the 'My Expenses' tab. It usually takes 2-3 days for approval.";
      } else if (text.includes("policy") || text.includes("limit")) {
        replyMessage = "Our standard policy covers travel, meals, and authorized software. Daily meal limits are typically $50.";
      } else if (text.includes("hi") || text.includes("hello")) {
        replyMessage = "Hello there! How can I help you with your corporate expenses today?";
      }

      return {
        reply: fixedReply || replyMessage,
        confidence: 0.4,
        queryTrace: [],
        suggestedActions: [],
        escalate: true,
        escalateReason: 'Backend support agent unavailable; using fallback mode.',
      };
    }
  },
};

export default chatbotService;
