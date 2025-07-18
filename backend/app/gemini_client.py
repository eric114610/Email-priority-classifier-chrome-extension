import google.generativeai as genai
import os

from app.schemas import ThreadInput

# genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
from dotenv import load_dotenv\nload_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))\n
model = genai.GenerativeModel("gemini-2.0-flash")

def generate_mail_class(input: ThreadInput, userPrompt:str) -> str:
    # prompt = f"Summarize and generate a short professional reply:\n\n{text}"
    prompt = f"I'm going to give you informations from an email sent to user and the user's custom prompt.\
    Please read through the custom prompt and the email to consider the email's importancy and urgency to give me a 1 word only response,\
    which is in one of (Optional,Notable,Important,Urgent,Critical).\n\n\
    The user's custom prompt is top priority for classifying email's importancy and urgency.\n\
    But still remain common sense to classify other important emails\n\n\
    Here is the custom prompt:\n\
    {userPrompt}\n\n\
    Here is the email:\n\
    Email from {input.Name} ({input.Email}) with subject '{input.Subject}'.\n\n\
    Preview:\n\n\
    {input.Preview}\n\n."
    response = model.generate_content(prompt)
    print(response.text, prompt)
    return response.text
