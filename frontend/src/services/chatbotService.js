import apiClient from './apiClient';

/**
 * Chatbot Service handling communication with the AI assistant.
 * Note: Features a graceful frontend-only fallback if the backend is unavailable or not yet configured.
 */
const chatbotService = {
  sendMessage: async (message) => {
    try {
      // Opt-out of the global loading spinner for chatbot interactions to keep UI seamless
      const response = await apiClient.post(
        '/chatbot/message',
        { message },
        { skipGlobalLoader: true }
      );
      
      return response.data;
    } catch (error) {
      console.warn("Chatbot API failed or not connected, falling back to frontend mock.", error);
      
      // Simulate network delay for realism
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
        reply: replyMessage
      };
    }
  },
};

export default chatbotService;
