import { create } from 'zustand';
import { 
  Inquiry, 
  InquiryCreate,
  InquiryUpdate,
  Response
} from '@/types';
import { 
  getInquiries, 
  getInquiry, 
  createInquiry, 
  updateInquiry,
  getResponsesForInquiry,
  createResponse,
  generateResponse
} from '@/services/api';

interface InquiryState {
  inquiries: Inquiry[];
  currentInquiry: Inquiry | null;
  responses: Response[];
  isLoading: boolean;
  error: string | null;
  
  // Inquiry actions
  fetchInquiries: (filters?: { status?: string; escalated?: boolean; type?: string }) => Promise<void>;
  fetchInquiry: (id: number) => Promise<void>;
  submitInquiry: (inquiry: InquiryCreate) => Promise<Inquiry | null>;
  updateInquiryStatus: (id: number, update: InquiryUpdate) => Promise<void>;
  
  // Response actions
  fetchResponses: (inquiryId: number) => Promise<void>;
  submitResponse: (response: { content: string; inquiryId: number; agentId?: number; isAutomated?: boolean }) => Promise<void>;
  generateAIResponse: (inquiryId: number) => Promise<void>;
  
  // Helper actions
  clearCurrentInquiry: () => void;
  clearError: () => void;
}

const useInquiryStore = create<InquiryState>()((set, get) => ({
  inquiries: [],
  currentInquiry: null,
  responses: [],
  isLoading: false,
  error: null,
  
  // Inquiry actions
  fetchInquiries: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const inquiries = await getInquiries(filters);
      set({ inquiries, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to fetch inquiries';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  fetchInquiry: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const inquiry = await getInquiry(id);
      set({ currentInquiry: inquiry, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to fetch inquiry #${id}`;
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  submitInquiry: async (inquiry) => {
    set({ isLoading: true, error: null });
    try {
      const newInquiry = await createInquiry(inquiry);
      set(state => ({ 
        inquiries: [newInquiry, ...state.inquiries],
        isLoading: false 
      }));
      return newInquiry;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to submit inquiry';
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },
  
  updateInquiryStatus: async (id, update) => {
    set({ isLoading: true, error: null });
    try {
      const updatedInquiry = await updateInquiry(id, update);
      set(state => ({
        // Update inquiries list
        inquiries: state.inquiries.map(inq => 
          inq.id === id ? updatedInquiry : inq
        ),
        // Update current inquiry if it's the one being modified
        currentInquiry: state.currentInquiry?.id === id 
          ? updatedInquiry 
          : state.currentInquiry,
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to update inquiry #${id}`;
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  // Response actions
  fetchResponses: async (inquiryId) => {
    set({ isLoading: true, error: null });
    try {
      const responses = await getResponsesForInquiry(inquiryId);
      set({ responses, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to fetch responses for inquiry #${inquiryId}`;
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  submitResponse: async ({ content, inquiryId, agentId, isAutomated = false }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await createResponse({
        content,
        inquiry_id: inquiryId,
        agent_id: agentId,
        is_automated: isAutomated
      });
      set(state => ({
        responses: [...state.responses, response],
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to submit response';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  generateAIResponse: async (inquiryId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateResponse(inquiryId);
      set(state => ({
        responses: [...state.responses, response],
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to generate AI response for inquiry #${inquiryId}`;
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  // Helper actions
  clearCurrentInquiry: () => {
    set({ currentInquiry: null, responses: [] });
  },
  
  clearError: () => {
    set({ error: null });
  }
}));

export default useInquiryStore;