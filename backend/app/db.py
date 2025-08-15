from pymongo import MongoClient
import os

from backend.app.schemas import ThreadInput

STATS = 'stats'
MAILS = 'records'
SETTINGS = 'settings'

if not os.getenv("MONGO_URI"):
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

client = MongoClient(os.getenv("MONGO_URI"))
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
    update_stats(UserEmail, MailClass.strip(), 1)

def get_stats(UserEmail: str):
    stats = db[UserEmail][STATS].find_one({"Email": UserEmail})
    if not stats:
        stats = {"Email": UserEmail, "Total_records": 0, 
            'Optional': 0, 'Notable': 0, 'Important': 0, 'Urgent': 0, 'Critical': 0}
        db[UserEmail][STATS].insert_one(stats)
    return stats

def update_stats(UserEmail: str, category: str, count: int):
    stats = get_stats(UserEmail)
    stats[category] += count
    print(f"Updating stats for {UserEmail}: {category} count is now {stats[category]}")
    stats['Total_records'] += count
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
        prompt = {"Email": UserEmail, "Prompt": "", "Records_to_process": 10}
        db[UserEmail][SETTINGS].insert_one(prompt)
    print(f"Retrieved prompt for {UserEmail}: {prompt['Prompt']}")
    return prompt['Prompt']

def save_prompt(UserEmail: str, prompt: str):
    db[UserEmail][SETTINGS].update_one({"Email": UserEmail}, {"$set": {"Prompt": prompt}})
    return prompt

def delete_records_by_oldest(UserEmail: str, count: int):
    user_db = get_user_db(UserEmail)
    records = list(user_db[MAILS].find({}).sort("Date", 1).limit(count))
    delete_count = 0
    if records:
        for record in records:
            user_db[MAILS].delete_one({"_id": record["_id"]})
            print(f"Deleted record: {record}")
            delete_count += 1
            update_stats(UserEmail, record["MailClass"].strip(), -1)
    
    return delete_count

def delete_records_by_category(UserEmail: str, category: str):
    user_db = get_user_db(UserEmail)
    result = user_db[MAILS].delete_many({"MailClass": category})
    update_stats(UserEmail, category, -result.deleted_count)
    return result.deleted_count

def get_records_to_process(UserEmail: str):
    settings = db[UserEmail][SETTINGS].find_one({"Email": UserEmail})
    if not settings:
        settings = {"Email": UserEmail, "Prompt": "", "Records_to_process": 10}
        db[UserEmail][SETTINGS].insert_one(settings)

    return settings["Records_to_process"]

def set_records_to_process(UserEmail: str, count: int):
    db[UserEmail][SETTINGS].update_one({"Email": UserEmail}, {"$set": {"Records_to_process": count}})
    return count
