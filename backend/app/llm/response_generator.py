from langchain_core.prompts import PromptTemplate

from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI

from langchain_community.memory import ConversationBufferMemory
from app.core.config import settings
from app.db.models import InquiryType, Response

# Define the response template
response_template = """
You are a helpful customer support AI agent for our company. Your goal is to provide accurate, helpful, and empathetic responses to customer inquiries.

Customer Information:
- Name: {customer_name}
- Email: {customer_email}
- Inquiry Type: {inquiry_type}

Previous conversation history:
{conversation_history}

Current Inquiry: {inquiry_text}

Please provide a helpful, professional response addressing the customer's needs. If there are any policies or limitations that might affect your answer, please mention them. If you need more information to fully address their inquiry, politely ask for the details you need.

Your response should:
1. Be friendly and empathetic
2. Directly address their question/concern
3. Provide clear next steps if applicable
4. Thank them for reaching out

Your response:
"""

class ResponseGenerator:
    def __init__(self):
        # Initialize OpenAI LLM
        self.llm = ChatOpenAI(
            temperature=0.7,  # Some creativity is good for responses
            model_name=settings.LLM_MODEL,
            openai_api_key=settings.OPENAI_API_KEY
        )
        
        # Initialize memory
        self.memory = ConversationBufferMemory(
            input_key="inquiry_text",
            memory_key="conversation_history"
        )
        
        # Create the prompt template
        self.prompt = PromptTemplate(
            input_variables=[
                "customer_name",
                "customer_email",
                "inquiry_type",
                "conversation_history",
                "inquiry_text"
            ],
            template=response_template
        )
        
        # Create the response chain
        self.chain = LLMChain(
            llm=self.llm,
            prompt=self.prompt,
            memory=self.memory
        )
    
    def _format_conversation_history(self, previous_responses):
        """Format previous responses into a readable conversation history"""
        history = ""
        for resp in previous_responses:
            prefix = "Customer Support" if resp.is_automated else f"Agent ({resp.agent.name})"
            history += f"{prefix}: {resp.content}\n\n"
        return history
    
    def generate_response(self, inquiry, previous_responses=None):
        """
        Generate a response to the customer inquiry
        
        Args:
            inquiry: The Inquiry object with customer details and text
            previous_responses: List of previous Response objects for this inquiry
            
        Returns:
            str: The generated response text
        """
        # Format conversation history if available
        conversation_history = ""
        if previous_responses:
            conversation_history = self._format_conversation_history(previous_responses)
        
        # Get customer information
        customer_name = inquiry.customer.name if inquiry.customer else "Valued Customer"
        customer_email = inquiry.customer.email if inquiry.customer else "Unknown"
        
        # Run the chain to generate a response
        response_text = self.chain.run(
            customer_name=customer_name,
            customer_email=customer_email,
            inquiry_type=inquiry.inquiry_type.value if inquiry.inquiry_type else "general",
            conversation_history=conversation_history,
            inquiry_text=inquiry.content
        )
        
        return response_text.strip()