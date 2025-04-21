from datetime import datetime, timedelta
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.chat_models import ChatOpenAI
from app.core.config import settings
from app.db.models import InquiryStatus

# Define follow-up template
followup_template = """
You are a customer support follow-up system. Your task is to create an appropriate follow-up message based on a previous customer inquiry and our response(s).

Customer Information:
- Name: {customer_name}
- Inquiry Type: {inquiry_type}
- Current Status: {current_status}
- Days Since Last Interaction: {days_since_interaction}

Original Inquiry: {original_inquiry}

Our Last Response: {last_response}

Please generate an appropriate follow-up message that:
1. References their original inquiry
2. Checks if our previous response resolved their issue
3. Offers additional assistance if needed
4. Maintains a professional and helpful tone

Your follow-up message:
"""

class FollowUpGenerator:
    def __init__(self):
        # Initialize OpenAI LLM
        self.llm = ChatOpenAI(
            temperature=0.5,
            model_name=settings.LLM_MODEL,
            openai_api_key=settings.OPENAI_API_KEY
        )
        
        # Create the prompt template
        self.prompt = PromptTemplate(
            input_variables=[
                "customer_name",
                "inquiry_type", 
                "current_status",
                "days_since_interaction",
                "original_inquiry",
                "last_response"
            ],
            template=followup_template
        )
        
        # Create the follow-up chain
        self.chain = LLMChain(llm=self.llm, prompt=self.prompt)
    
    def should_generate_followup(self, inquiry, responses):
        """
        Determine if a follow-up should be generated
        
        Args:
            inquiry: The Inquiry object
            responses: List of Response objects for this inquiry
            
        Returns:
            bool: True if follow-up should be generated
        """
        # Don't follow up on resolved or closed inquiries
        if inquiry.status in [InquiryStatus.RESOLVED, InquiryStatus.CLOSED]:
            return False
        
        # Don't follow up if there are no responses yet
        if not responses:
            return False
            
        # Check if we've waited long enough since the last response
        last_response_date = max(r.created_at for r in responses)
        days_since_response = (datetime.now() - last_response_date).days
        
        return days_since_response >= settings.FOLLOWUP_DAYS
    
    def generate_followup(self, inquiry, responses):
        """
        Generate a follow-up message for the customer
        
        Args:
            inquiry: The Inquiry object
            responses: List of Response objects for this inquiry
            
        Returns:
            dict: Follow-up details including text and scheduled time
        """
        # Get customer name
        customer_name = inquiry.customer.name if inquiry.customer else "Valued Customer"
        
        # Get the original inquiry and latest response
        original_inquiry = inquiry.content
        last_response = responses[-1].content
        
        # Calculate days since last interaction
        last_response_date = responses[-1].created_at
        days_since_interaction = (datetime.now() - last_response_date).days
        
        # Generate the follow-up message
        followup_text = self.chain.run(
            customer_name=customer_name,
            inquiry_type=inquiry.inquiry_type.value if inquiry.inquiry_type else "general",
            current_status=inquiry.status.value,
            days_since_interaction=days_since_interaction,
            original_inquiry=original_inquiry,
            last_response=last_response
        )
        
        # Calculate the scheduled time (usually now + a small buffer)
        scheduled_time = datetime.now() + timedelta(minutes=30)
        
        return {
            "content": followup_text.strip(),
            "scheduled_at": scheduled_time,
            "inquiry_id": inquiry.id
        }