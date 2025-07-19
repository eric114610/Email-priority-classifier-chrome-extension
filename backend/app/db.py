from pymongo import MongoClient
import os

from app.schemas import ThreadInput

STATS = 'stats'
MAILS = 'records'
SETTINGS = 'LLM_prompt'

# client = MongoClient(os.getenv("MONGO_URI"))
from dotenv import load_dotenv\nload_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))\nclient = MongoClient(os.getenv("MONGO_URI"))
db = client.smartreply

def get_user_db(UserEmail: str):
    # Create collections if they don't exist
    for col in [MAILS, STATS, SETTINGS]:
        collection_name = f"{UserEmail}.{col}"
        if collection_name not in db.list_collection_names():
            db.create_collection(collection_name)
            if col == MAILS:
                db[collection_name].create_index([("Name", "text"), ("Email", "text"), ("Subject", "text"), ("Preview", "text")])
            else:
                db[collection_name].create_index("Email")
    # Return a dict of collection handles
    return {
        MAILS: db[UserEmail][MAILS],
        STATS: db[UserEmail][STATS],
        SETTINGS: db[UserEmail][SETTINGS]
    }

def query_thread(input: ThreadInput, UserEmail: str):
    record = db[UserEmail][MAILS].find_one({"Name": input.Name, "Email": input.Email, "Subject": input.Subject, "Preview": input.Preview, "Date": input.Date})
    return record

def save_thread(input: ThreadInput, UserEmail: str, MailClass: str):
    db[UserEmail][MAILS].insert_one({"Name": input.Name, "Email": input.Email, "Subject": input.Subject, "Preview": input.Preview, "MailClass": MailClass, "Date": input.Date})
    update_stats(UserEmail, MailClass.strip())

def get_stats(UserEmail: str):
    stats = db[UserEmail][STATS].find_one({"Email": UserEmail})
    if not stats:
        stats = {"Email": UserEmail, "Total_records": 0, 
            'Optional': 0, 'Notable': 0, 'Important': 0, 'Urgent': 0, 'Critical': 0}
        db[UserEmail][STATS].insert_one(stats)
    return stats

def update_stats(UserEmail: str, category: str):
    stats = get_stats(UserEmail)
    stats[category] += 1
    print(f"Updating stats for {UserEmail}: {category} count is now {stats[category]}")
    stats['Total_records'] += 1
    db[UserEmail][STATS].update_one({"Email": UserEmail}, {"$set": stats})
    return stats

def reset_stats(UserEmail: str):
    stats = get_stats(UserEmail)
    stats['Total_records'] = 0
    stats['Optional'] = 0
    stats['Notable'] = 0
    stats['Important'] = 0
    stats['Urgent'] = 0
    stats['Critical'] = 0
    db[UserEmail][STATS].update_one({"Email": UserEmail}, {"$set": stats})
    print(f"Stats reset for {UserEmail}.")
    return stats

def get_prompt(UserEmail: str):
    prompt = db[UserEmail][SETTINGS].find_one({"Email": UserEmail})
    if not prompt:
        prompt = {"Email": UserEmail, "Prompt": ""}
        db[UserEmail][SETTINGS].insert_one(prompt)
    print(f"Retrieved prompt for {UserEmail}: {prompt['Prompt']}")
    return prompt['Prompt']

def save_prompt(UserEmail: str, prompt: str):
    db[UserEmail][SETTINGS].update_one({"Email": UserEmail}, {"$set": {"Prompt": prompt}})
    return prompt
