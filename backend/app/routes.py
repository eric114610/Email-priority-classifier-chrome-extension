from fastapi import APIRouter
from pydantic import BaseModel
from app.gemini_client import generate_mail_class
from app.db import save_thread, query_thread, get_stats, get_user_db, get_prompt, save_prompt, reset_stats
from app.schemas import BackendInput, ThreadInput, UserData, PromptInput

router = APIRouter()

STATS = 'stats'
MAILS = 'records'
SETTINGS = 'LLM_prompt'



@router.post("/get_mail_class")
async def get_mail_class(input: BackendInput):
    threadInput = ThreadInput(
        Email=input.SenderEmail,
        Name=input.SenderName,
        Subject=input.SenderSubject,
        Preview=input.SenderPreview
    )
    record = query_thread(threadInput, input.UserEmail)
    if record:
        print("Record found in database, returning MailClass.", input.SenderEmail, input.SenderSubject, input.SenderPreview)
        return {"MailClass": record["MailClass"]}
    
    print("No record found, generating summary.")

    userPrompt = get_prompt(input.UserEmail)
    MailClass = generate_mail_class(threadInput, userPrompt)
    save_thread(threadInput, input.UserEmail, MailClass)
    return {"MailClass": MailClass}


@router.post("/get_stats")
async def getStats(input: UserData):
    get_user_db(input.Email)

    UserStats = get_stats(input.Email)
    if "_id" in UserStats:
        del UserStats["_id"]
    print("User stats retrieved:", UserStats)
    return UserStats

@router.post("/apply_custom_prompt")
async def apply_custom_prompt(input: PromptInput):
    """
    Apply a custom prompt to the user's settings.
    """

    print(f"Custom prompt applied for {input.UserEmail}: {input.CustomPrompt}")
    userPrompt = get_prompt(input.UserEmail)
    if userPrompt != input.CustomPrompt:
        save_prompt(input.UserEmail, input.CustomPrompt)
        print(f"Custom prompt saved for {input.UserEmail}.")

        if input.reRun:
            user_db = get_user_db(input.UserEmail)
            # records = user_db[MAILS].find({})
            records = list(user_db[MAILS].find({}))
            if len(records) != 0:
                user_db[MAILS].delete_many({})
                print(f"Deleted all stored mails for {input.UserEmail} before re-running.")
                reset_stats(input.UserEmail)

            for record in records:
                threadInput = ThreadInput(
                    Email=record['Email'],
                    Name=record['Name'],
                    Subject=record['Subject'],
                    Preview=record['Preview']
                )
                print(f"Re-running mail: {threadInput.Name}")
                MailClass = generate_mail_class(threadInput, input.CustomPrompt)
                save_thread(threadInput, input.UserEmail, MailClass)
            print(f"Re-ran all stored mails for {input.UserEmail}.")
    else:
        print(f"No changes to custom prompt for {input.UserEmail}, skipping save.")


    return {"message": "Custom prompt applied successfully."}