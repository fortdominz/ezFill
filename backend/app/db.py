import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME   = os.getenv("DB_NAME", "ezfill")

client: AsyncIOMotorClient = None

def get_db():
    return client[DB_NAME]

async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGO_URI)
    # Ping to confirm connection
    await client.admin.command("ping")
    print(f"[EzFill] Connected to MongoDB Atlas — db: {DB_NAME}")

async def close_db():
    global client
    if client:
        client.close()
        print("[EzFill] MongoDB connection closed")
