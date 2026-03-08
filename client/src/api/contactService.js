import apiClient from "./client";

const contactService = {
  submitInquiry: async (payload) => {
    const response = await apiClient.post("/contact", payload);
    return response.data;
  },
};

export default contactService;
