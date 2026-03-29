import apiClient from './apiClient';
import { getStoredUser } from '../utils/authStorage';

/**
 * Chatbot Service handling communication with the AI assistant.
 * Note: Features a graceful frontend-only fallback if the backend is unavailable or not yet configured.
 */
const chatbotService = {
  sendMessage: async (message) => {
    try {
      const user = getStoredUser();
      const response = await apiClient.post(
        '/support/agent',
        {
          message,
          conversationId: `chat-${user?.id || 'anon'}`,
          userContext: {
            userId: user?.id,
            companyId: user?.company?.id,
            role: user?.role,
          },
          strictMode: false,
        },
        { skipGlobalLoader: true }
      );

      return {
        reply: response.data?.answer || 'No response generated.',
        confidence: response.data?.confidence,
        queryTrace: response.data?.queryTrace || [],
        suggestedActions: response.data?.suggestedActions || [],
        escalate: response.data?.escalate || false,
        escalateReason: response.data?.escalateReason || null,
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
        reply: replyMessage,
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
