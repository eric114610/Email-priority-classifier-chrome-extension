from fastapi import APIRouter
from pydantic import BaseModel
import time
from backend.app.gemini_client import *
from backend.app.db import *
from backend.app.schemas import RecordInput, ThreadInput, UserData, PromptInput, DeleteInput, RecordsToProcessInput

router = APIRouter()

STATS = 'stats'
MAILS = 'records'
SETTINGS = 'LLM_prompt'

MAX_RECORDS = 100
DELETE_RECORDS = 5

@router.post("/get_mail_class")
async def get_mail_class(input: RecordInput):
    threads: list[ThreadInput] = []
    length = len(input.SenderEmail)

    MailClasses = []
    processCount = 0
    
    for i in range(length):
        thread = ThreadInput(
            Email=input.SenderEmail[i],
            Name=input.SenderName[i],
            Subject=input.SenderSubject[i],
            Preview=input.SenderPreview[i],
            Date=input.EmailDate[i],
            Index=i
        )

        record = query_thread(thread, input.UserEmail)
        if record:
            print("Record found in database, returning MailClass.", thread.Date)
            MailClasses.append((i, record["MailClass"]))
        else:
            print("No record found, generating summary.")
            threads.append(thread)
            processCount += 1

    if processCount > 0:

        recordCount = get_stats(input.UserEmail)["Total_records"]
        if recordCount+processCount > MAX_RECORDS:
            print(f"Record count {recordCount}+{processCount} exceeds limit, deleting oldest records.")
            deleteCount = delete_records_by_oldest(input.UserEmail, recordCount+processCount-MAX_RECORDS)
            print(f"Deleted {deleteCount} oldest records for {input.UserEmail}.")

        userPrompt = get_prompt(input.UserEmail)
        response = generate_mail_class(threads, userPrompt, processCount)

        responseCount = 0
        for line in response.split('\n'):
            if not line.strip():  # skip empty lines
                continue

            index_str, MailClass = line.split(':')
            index = int(index_str)
            MailClass = MailClass.strip()
            MailClasses.append((index, MailClass.strip()))
            save_thread(threads[responseCount], input.UserEmail, MailClass.strip())
            responseCount += 1

    print(MailClasses)
    return {"MailClass": MailClasses}


@router.post("/get_stats")
async def getStats(input: UserData):
    get_user_db(input.Email)

    UserStats = get_stats(input.Email)
    if "_id" in UserStats:
        del UserStats["_id"]

    records_to_process = get_records_to_process(input.Email)
    UserStats['Records_to_process'] = records_to_process

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

            threads: list[ThreadInput] = []
            processCount = 0
            for index, record in enumerate(records):  # start=1 so index starts at 1
                thread = ThreadInput(
                    Email=record['Email'],
                    Name=record['Name'],
                    Subject=record['Subject'],
                    Preview=record['Preview'],
                    Date=record['Date'],
                    Index=index
                )
                # print(f"Re-running mail: {threadInput.Name}")
                threads.append(thread)
                processCount += 1

            response = generate_mail_class(threads, input.CustomPrompt, processCount)
            responseCount = 0
            
            for line in response.split('\n'):
                if not line.strip():  # skip empty lines
                    continue

                index_str, MailClass = line.split(':')
                save_thread(threads[responseCount], input.UserEmail, MailClass)
                responseCount += 1

            print(f"Re-ran all stored mails for {input.UserEmail}.")
    else:
        print(f"No changes to custom prompt for {input.UserEmail}, skipping save.")


    return {"message": "Custom prompt applied successfully."}

@router.post("/delete_record")
async def delete_record(input: DeleteInput):
    delete_count = 0

    if input.DeleteCount == 0:
        delete_count = delete_records_by_category(input.UserEmail, input.DeleteCategory)
    else:
        delete_count = delete_records_by_oldest(input.UserEmail, input.DeleteCount)

    print(f"Deleted {delete_count} records for {input.UserEmail}.")
    return {"message": f"Deleted {delete_count} records successfully."}

@router.post("/apply_records_to_process")
async def apply_records_to_process(input: RecordsToProcessInput):
    set_records_to_process(input.UserEmail, input.RecordsToProcess)
    print(f"Records to process set to {input.RecordsToProcess} for {input.UserEmail}.")
    return {"message": "Records to process setting applied successfully."}

@router.get("/get_connection")
async def get_connection():
    if (get_collections() and get_gemini_connection()):
        return {"status": True}
    else:
        return {"status": False}
