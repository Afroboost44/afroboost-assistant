from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, BackgroundTasks, Request, Depends
from fastapi.responses import Response, RedirectResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import io
import base64
from openai import OpenAI
import resend
import openpyxl
import pandas as pd
import stripe
import bcrypt
import jwt
from whatsapp_service import WhatsAppService
from ai_memory_service import AIMemoryService


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize AI Memory Service
ai_memory = AIMemoryService(db)

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Security
security = HTTPBearer()


# ========================
# MODELS
# ========================

# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "user"  # "admin" or "user"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime
    last_login: Optional[datetime] = None

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

class PasswordResetToken(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    used: bool = False

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# Catalog & Reservations Models
class CatalogItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Coach/seller ID
    title: str
    description: str
    category: str  # course, event, product
    price: float
    currency: str = "CHF"
    image_url: Optional[str] = None
    stock_quantity: Optional[int] = None  # None = unlimited
    max_attendees: Optional[int] = None  # For events/courses
    current_attendees: int = 0
    
    # Event/Course specific fields
    event_date: Optional[datetime] = None
    event_duration: Optional[int] = None  # Duration in minutes
    location: Optional[str] = None
    
    # Status
    is_active: bool = True
    is_published: bool = True
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CatalogItemCreate(BaseModel):
    title: str
    description: str
    category: str
    price: float
    currency: str = "CHF"
    image_url: Optional[str] = None
    stock_quantity: Optional[int] = None
    max_attendees: Optional[int] = None
    event_date: Optional[str] = None
    event_duration: Optional[int] = None
    location: Optional[str] = None

class CatalogItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    max_attendees: Optional[int] = None
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None

class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    catalog_item_id: str
    user_id: str  # Coach/seller ID
    
    # Customer info
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    
    # Reservation details
    quantity: int = 1
    total_price: float
    currency: str = "CHF"
    
    # Payment info
    payment_method: Optional[str] = None  # stripe, twint, cash, bank_transfer
    payment_status: str = "pending"  # pending, completed, failed, refunded
    payment_intent_id: Optional[str] = None  # Stripe payment intent ID
    
    # Status
    status: str = "pending"  # pending, confirmed, cancelled, completed
    
    # Timestamps
    reservation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    notes: Optional[str] = None

class ReservationCreate(BaseModel):
    catalog_item_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    quantity: int = 1
    payment_method: str = "stripe"
    notes: Optional[str] = None

class AdminSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    openai_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_verify_token: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_name: Optional[str] = None
    bank_currency: str = "CHF"
    company_name: str = "Afroboost"
    sender_email: str = "contact@afroboost.com"
    sender_name: str = "Coach Bassi"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminSettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_verify_token: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_name: Optional[str] = None
    bank_currency: Optional[str] = None
    company_name: Optional[str] = None
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None  # Nouveau : numéro de téléphone
    tags: List[str] = []
    group: str = "general"
    active: bool = True
    
    # Nouveaux champs pour la gestion des membres
    subscription_status: str = "non-subscriber"  # non-subscriber, active, expired, trial
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    membership_type: Optional[str] = None  # standard, premium, vip, etc.
    
    # Historique simplifié
    total_courses_attended: int = 0
    total_payments: float = 0.0
    last_activity: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stats: Dict = {"emails_received": 0, "emails_opened": 0, "emails_clicked": 0}
    notes: Optional[str] = None  # Notes du coach

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    tags: List[str] = []
    group: str = "general"
    active: bool = True
    subscription_status: str = "non-subscriber"
    membership_type: Optional[str] = None
    notes: Optional[str] = None

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    tags: Optional[List[str]] = None
    group: Optional[str] = None
    active: Optional[bool] = None

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    content_html: str
    language: str = "fr"
    status: str = "draft"  # draft, scheduled, sending, sent, failed
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    target_groups: List[str] = []
    target_tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stats: Dict = {"sent": 0, "opened": 0, "clicked": 0, "failed": 0}

class CampaignCreate(BaseModel):
    title: str
    subject: str
    content_html: str
    language: str = "fr"
    scheduled_at: Optional[datetime] = None
    target_groups: List[str] = []
    target_tags: List[str] = []

class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    content_html: Optional[str] = None
    language: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    target_groups: Optional[List[str]] = None
    target_tags: Optional[List[str]] = None
    status: Optional[str] = None

class EmailLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    contact_id: str
    contact_email: str
    status: str  # sent, opened, clicked, failed, bounced
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    error_message: Optional[str] = None

class AIGenerateRequest(BaseModel):
    prompt: str
    language: str = "fr"
    tone: str = "professional"  # professional, friendly, energetic
    type: str = "email"  # email, subject, cta

class AIGenerateResponse(BaseModel):
    content: str
    language: str

# WhatsApp Models
class WhatsAppConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    phone_id: str
    access_token: str
    business_account_id: str
    phone_number: str
    display_name: Optional[str] = None
    is_configured: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WhatsAppCampaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message_content: str
    language: str = "fr"
    status: str = "draft"  # draft, scheduled, sending, sent, failed
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    target_groups: List[str] = []
    target_tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stats: Dict = {"sent": 0, "delivered": 0, "read": 0, "replied": 0, "failed": 0}

class WhatsAppCampaignCreate(BaseModel):
    title: str
    message_content: str
    language: str = "fr"
    scheduled_at: Optional[datetime] = None
    target_groups: List[str] = []
    target_tags: List[str] = []

class WhatsAppCampaignUpdate(BaseModel):
    title: Optional[str] = None
    message_content: Optional[str] = None
    language: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    target_groups: Optional[List[str]] = None
    target_tags: Optional[List[str]] = None
    status: Optional[str] = None

class WhatsAppMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: Optional[str] = None
    contact_id: str
    contact_phone: str
    direction: str  # inbound, outbound
    content: str
    status: str  # sent, delivered, read, failed
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    error_message: Optional[str] = None

class WhatsAppIncomingMessage(BaseModel):
    from_phone: str
    message_content: str
    message_id: str
    timestamp: datetime

class AIConversationRequest(BaseModel):
    contact_id: str
    contact_name: str
    contact_phone: str
    message: str
    campaign_context: Optional[str] = None
    language: str = "fr"

class AIConversationResponse(BaseModel):
    response: str
    context_used: str



# ========================
# AI ASSISTANT MODELS
# ========================

class AIAssistantMessage(BaseModel):
    """Message for AI Assistant chat"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    role: str  # user, assistant, system
    content: str
    context: Optional[Dict[str, Any]] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIAssistantRequest(BaseModel):
    """Request for AI Assistant"""
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = {}
    task_type: Optional[str] = "general"  # general, campaign, analysis, strategy

class AIAssistantResponse(BaseModel):
    """Response from AI Assistant"""
    response: str
    session_id: str
    suggestions: Optional[List[str]] = []
    context: Optional[Dict[str, Any]] = {}



# ========================
# ADVANCED WHATSAPP MODELS
# ========================

class InteractiveButton(BaseModel):
    """Button for WhatsApp interactive messages"""
    type: str  # reply, url, call
    text: str
    id: Optional[str] = None  # For reply buttons
    url: Optional[str] = None  # For URL buttons
    phone_number: Optional[str] = None  # For call buttons

class InteractiveList(BaseModel):
    """List item for WhatsApp interactive messages"""
    id: str
    title: str
    description: Optional[str] = None

class InteractiveSection(BaseModel):
    """Section containing list items"""
    title: str
    rows: List[InteractiveList]

class MessageTemplate(BaseModel):
    """Pre-defined message templates"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    category: str  # marketing, utility, transactional
    content: str
    variables: List[str] = []  # List of variables like {{nom}}, {{prenom}}
    language: str = "fr"
    buttons: List[InteractiveButton] = []
    has_media: bool = False
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # image, document, video
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageTemplateCreate(BaseModel):
    name: str
    category: str
    content: str
    variables: List[str] = []
    language: str = "fr"
    buttons: List[InteractiveButton] = []
    media_url: Optional[str] = None
    media_type: Optional[str] = None

class MessageTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[str]] = None
    buttons: Optional[List[InteractiveButton]] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None

class AdvancedWhatsAppCampaign(BaseModel):
    """Enhanced WhatsApp campaign with interactive elements"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    template_id: Optional[str] = None
    message_content: str
    language: str = "fr"
    
    # Interactive elements
    buttons: List[InteractiveButton] = []
    list_sections: List[InteractiveSection] = []
    
    # Media
    has_media: bool = False
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    
    # Targeting
    target_contacts: List[str] = []  # Specific contact IDs
    target_tags: List[str] = []  # Filter by tags
    target_status: Optional[str] = None  # Filter by member status
    
    # Personalization
    use_personalization: bool = False
    variables: Dict[str, str] = {}  # Variable mappings
    
    # Scheduling
    status: str = "draft"  # draft, scheduled, sending, sent, failed
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    
    # Payment links
    payment_links: List[Dict[str, str]] = []  # [{type: 'stripe', url: '...'}]
    
    # Analytics
    stats: Dict = {
        "sent": 0,
        "delivered": 0,
        "read": 0,
        "replied": 0,
        "failed": 0,
        "clicked": 0,
        "payments_completed": 0
    }
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdvancedWhatsAppCampaignCreate(BaseModel):
    title: str
    template_id: Optional[str] = None
    message_content: str
    language: str = "fr"
    buttons: List[InteractiveButton] = []
    list_sections: List[InteractiveSection] = []
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    target_contacts: List[str] = []
    target_tags: List[str] = []
    target_status: Optional[str] = None
    use_personalization: bool = False
    scheduled_at: Optional[str] = None
    payment_links: List[Dict[str, str]] = []

class CampaignAnalytics(BaseModel):
    """Detailed analytics for campaigns"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    contact_id: str
    contact_phone: str
    
    # Status tracking
    sent: bool = False
    delivered: bool = False
    read: bool = False
    replied: bool = False
    clicked: bool = False
    
    # Timestamps
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    
    # Response data
    reply_content: Optional[str] = None
    button_clicked: Optional[str] = None
    
    # Payment tracking
    payment_link_clicked: bool = False
    payment_completed: bool = False
    payment_amount: Optional[float] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentLinkCreate(BaseModel):
    """Create payment link for WhatsApp"""
    campaign_id: str
    amount: float
    currency: str = "CHF"
    description: str
    payment_method: str  # stripe, twint
    contact_email: Optional[str] = None


# Stripe/Payment Models
class PricingPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_en: str
    name_de: str
    price: float
    currency: str = "CHF"
    interval: str = "month"  # month, year
    features_fr: List[str] = []
    features_en: List[str] = []
    features_de: List[str] = []
    limits: Dict = {
        "emails_per_month": 0,
        "whatsapp_per_month": 0,
        "contacts_max": 0,
        "ai_enabled": False,
        "whatsapp_enabled": False,
        "multi_user": False
    }
    active: bool = True
    highlighted: bool = False
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PricingPlanCreate(BaseModel):
    name: str
    name_en: str
    name_de: str
    price: float
    currency: str = "CHF"
    interval: str = "month"
    features_fr: List[str] = []
    features_en: List[str] = []
    features_de: List[str] = []
    limits: Dict = {}
    active: bool = True
    highlighted: bool = False
    order: int = 0

class PricingPlanUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_de: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    interval: Optional[str] = None
    features_fr: Optional[List[str]] = None
    features_en: Optional[List[str]] = None
    features_de: Optional[List[str]] = None
    limits: Optional[Dict] = None
    active: Optional[bool] = None
    highlighted: Optional[bool] = None
    order: Optional[int] = None

class SubscriptionPlan(BaseModel):
    name: str
    price: float
    currency: str = "CHF"
    interval: str = "month"  # month, year
    features: List[str] = []

class PaymentIntent(BaseModel):
    amount: int  # Amount in cents
    currency: str = "chf"
    customer_email: str
    description: str

class SubscriptionCreate(BaseModel):
    customer_email: str
    customer_name: str
    plan_id: str
    payment_method_id: str



# ========================
# HELPER FUNCTIONS
# ========================

async def get_settings():
    """Get admin settings from database"""
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = AdminSettings(
            openai_api_key=os.getenv('OPENAI_API_KEY', ''),
            resend_api_key=os.getenv('RESEND_API_KEY', '')
        )
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return default_settings
    
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return AdminSettings(**settings)

def get_openai_client(api_key: str):
    """Create OpenAI client with API key"""
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured")
    return OpenAI(api_key=api_key)

def get_resend_client(api_key: str):
    """Configure Resend with API key"""
    if not api_key:
        raise HTTPException(status_code=400, detail="Resend API key not configured")
    resend.api_key = api_key

async def get_contacts_by_filters(groups: List[str] = None, tags: List[str] = None, active_only: bool = True):
    """Get contacts filtered by groups and tags"""
    query = {}
    if active_only:
        query['active'] = True
    if groups:
        query['group'] = {'$in': groups}
    if tags:
        query['tags'] = {'$in': tags}
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(10000)
    for contact in contacts:
        if isinstance(contact.get('created_at'), str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    return [Contact(**c) for c in contacts]


# ========================
# AUTH UTILITIES
# ========================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    """Create a JWT token"""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = decode_token(token)
    
    # Fetch user from database
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

async def require_admin(current_user: Dict = Depends(get_current_user)) -> Dict:
    """Require admin role"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ========================
# ROUTES - AUTHENTICATION
# ========================

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    """Register a new user. First user becomes admin."""
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is the first user
    user_count = await db.users.count_documents({})
    role = "admin" if user_count == 0 else "user"
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=role
    )
    
    # Hash password and store separately
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_token(user.id, user.email, user.role)
    
    # Return response
    user_response = UserResponse(**user.model_dump())
    return AuthResponse(user=user_response, token=token)

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    """Login user"""
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Update last login
    await db.users.update_one(
        {"email": credentials.email},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create token
    token = create_token(user["id"], user["email"], user["role"])
    
    # Parse dates
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    if isinstance(user.get('last_login'), str):
        user['last_login'] = datetime.fromisoformat(user['last_login'])
    
    # Remove password from response
    user.pop("password", None)
    user_response = UserResponse(**user)
    
    return AuthResponse(user=user_response, token=token)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: Dict = Depends(get_current_user)):
    """Get current user info"""
    # Parse dates
    if isinstance(current_user.get('created_at'), str):
        current_user['created_at'] = datetime.fromisoformat(current_user['created_at'])
    if isinstance(current_user.get('last_login'), str):
        current_user['last_login'] = datetime.fromisoformat(current_user['last_login'])
    
    return UserResponse(**current_user)


# ========================
# ROUTES - SETTINGS
# ========================

@api_router.get("/settings", response_model=AdminSettings)
async def get_admin_settings():
    """Get admin settings"""
    return await get_settings()

@api_router.put("/settings", response_model=AdminSettings)
async def update_admin_settings(settings_update: AdminSettingsUpdate):
    """Update admin settings"""
    current_settings = await get_settings()
    update_data = settings_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current_settings, key, value)
    
    current_settings.updated_at = datetime.now(timezone.utc)
    
    doc = current_settings.model_dump()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.settings.update_one({}, {"$set": doc}, upsert=True)
    return current_settings


# ========================
# ROUTES - PASSWORD RESET
# ========================

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    # Check if user exists
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If your email is registered, you will receive a password reset link"}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Save token to database
    token_data = PasswordResetToken(
        email=request.email,
        token=reset_token,
        expires_at=expires_at
    )
    token_dict = token_data.model_dump()
    token_dict['expires_at'] = token_dict['expires_at'].isoformat()
    token_dict['created_at'] = token_dict['created_at'].isoformat()
    
    await db.password_reset_tokens.insert_one(token_dict)
    
    # Get frontend URL from environment or use default
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    # Send email using Resend
    resend_api_key = os.environ.get('RESEND_API_KEY')
    if resend_api_key:
        resend.api_key = resend_api_key
        
        try:
            email_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #D91CD2 0%, #8B5CF6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }}
                    .button {{ display: inline-block; padding: 15px 30px; background: #D91CD2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Réinitialisation de mot de passe</h1>
                    </div>
                    <div class="content">
                        <p>Bonjour,</p>
                        <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte Afroboost Mailer.</p>
                        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                        <p style="text-align: center;">
                            <a href="{reset_link}" class="button">Réinitialiser mon mot de passe</a>
                        </p>
                        <p><strong>Ce lien est valide pendant 1 heure.</strong></p>
                        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
                        <p>Cordialement,<br>L'équipe Afroboost</p>
                    </div>
                    <div class="footer">
                        <p>Afroboost Mailer - Marketing intelligent multicanal</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            resend.Emails.send({
                "from": "Afroboost Mailer <onboarding@resend.dev>",
                "to": request.email,
                "subject": "🔐 Réinitialisation de votre mot de passe",
                "html": email_html
            })
            
            logger.info(f"Password reset email sent to {request.email}")
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            # Don't fail the request if email fails
    else:
        logger.warning(f"RESEND_API_KEY not set. Reset link: {reset_link}")
    
    return {"message": "If your email is registered, you will receive a password reset link"}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with token"""
    # Find valid token
    token = await db.password_reset_tokens.find_one({
        "token": request.token,
        "used": False
    })
    
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token expired
    expires_at = datetime.fromisoformat(token['expires_at']) if isinstance(token['expires_at'], str) else token['expires_at']
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update user password
    new_password_hash = hash_password(request.new_password)
    await db.users.update_one(
        {"email": token['email']},
        {"$set": {"password": new_password_hash}}
    )
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    
    logger.info(f"Password reset successful for {token['email']}")
    
    return {"message": "Password reset successful"}


# ========================
# ROUTES - WHATSAPP
# ========================

@api_router.post("/whatsapp/config")
async def configure_whatsapp(
    phone_id: str,
    access_token: str,
    business_account_id: str,
    phone_number: str,
    display_name: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Configure WhatsApp credentials for user"""
    try:
        # Test credentials by creating client
        from whatsapp_client import WhatsAppClient
        client = WhatsAppClient(phone_id=phone_id, access_token=access_token)
        await client.close()
        
        # Save or update config
        existing_config = await db.whatsapp_configs.find_one({"user_id": current_user["id"]})
        
        config_data = {
            "user_id": current_user["id"],
            "phone_id": phone_id,
            "access_token": access_token,
            "business_account_id": business_account_id,
            "phone_number": phone_number,
            "display_name": display_name,
            "is_configured": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing_config:
            await db.whatsapp_configs.update_one(
                {"user_id": current_user["id"]},
                {"$set": config_data}
            )
        else:
            config_data["id"] = str(uuid.uuid4())
            config_data["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.whatsapp_configs.insert_one(config_data)
        
        return {"message": "WhatsApp configured successfully", "configured": True}
    except Exception as e:
        logger.error(f"Failed to configure WhatsApp: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid WhatsApp credentials: {str(e)}")

@api_router.get("/whatsapp/config")
async def get_whatsapp_config(current_user: Dict = Depends(get_current_user)):
    """Get WhatsApp configuration for user"""
    config = await db.whatsapp_configs.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0, "access_token": 0}  # Don't return access token
    )
    
    if not config:
        return {"configured": False}
    
    return {"configured": True, "config": config}


# ========================
# ROUTES - CONTACTS
# ========================

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(group: Optional[str] = None, active: Optional[bool] = None):
    """Get all contacts with optional filters"""
    query = {}
    if group:
        query['group'] = group
    if active is not None:
        query['active'] = active
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(10000)
    for contact in contacts:
        if isinstance(contact.get('created_at'), str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    return contacts

@api_router.get("/contacts/{contact_id}", response_model=Contact)
async def get_contact(contact_id: str):
    """Get a specific contact"""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if isinstance(contact.get('created_at'), str):
        contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    return contact

@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact_data: ContactCreate):
    """Create a new contact"""
    # Check if email already exists
    existing = await db.contacts.find_one({"email": contact_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    contact = Contact(**contact_data.model_dump())
    doc = contact.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.contacts.insert_one(doc)
    return contact

@api_router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: str, contact_update: ContactUpdate):
    """Update a contact"""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    if isinstance(contact.get('created_at'), str):
        contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    
    contact_obj = Contact(**contact)
    update_data = contact_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(contact_obj, key, value)
    
    doc = contact_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.contacts.update_one({"id": contact_id}, {"$set": doc})
    return contact_obj

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    """Delete a contact"""
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted successfully"}

@api_router.post("/contacts/import")
async def import_contacts(file: UploadFile = File(...)):
    """Import contacts from CSV/Excel file"""
    try:
        contents = await file.read()
        
        # Try to read as Excel first
        try:
            df = pd.read_excel(io.BytesIO(contents))
        except:
            # Fall back to CSV
            df = pd.read_csv(io.BytesIO(contents))
        
        # Validate required columns
        required_cols = ['name', 'email']
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {col}")
        
        imported = 0
        duplicates = 0
        errors = 0
        
        for _, row in df.iterrows():
            try:
                # Check if email exists
                existing = await db.contacts.find_one({"email": row['email']}, {"_id": 0})
                if existing:
                    duplicates += 1
                    continue
                
                contact = Contact(
                    name=str(row['name']),
                    email=str(row['email']),
                    tags=str(row.get('tags', '')).split(',') if pd.notna(row.get('tags')) else [],
                    group=str(row.get('group', 'general')),
                    active=bool(row.get('active', True))
                )
                
                doc = contact.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                
                await db.contacts.insert_one(doc)
                imported += 1
            except Exception as e:
                logger.error(f"Error importing contact: {e}")
                errors += 1
        
        return {
            "imported": imported,
            "duplicates": duplicates,
            "errors": errors,
            "total": len(df)
        }
    
    except Exception as e:
        logger.error(f"Error importing file: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@api_router.get("/contacts/export/csv")
async def export_contacts_csv():
    """Export contacts as CSV"""
    contacts = await db.contacts.find({}, {"_id": 0}).to_list(10000)
    
    if not contacts:
        raise HTTPException(status_code=404, detail="No contacts to export")
    
    df = pd.DataFrame(contacts)
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    
    return Response(
        content=csv_buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"}
    )


# Routes pour gestion avancée des membres
@api_router.patch("/contacts/{contact_id}/subscription")
async def update_contact_subscription(
    contact_id: str,
    subscription_status: str,
    subscription_start: Optional[str] = None,
    subscription_end: Optional[str] = None,
    membership_type: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update contact subscription status"""
    update_data = {
        "subscription_status": subscription_status,
        "membership_type": membership_type
    }
    
    if subscription_start:
        update_data["subscription_start"] = datetime.fromisoformat(subscription_start).isoformat()
    if subscription_end:
        update_data["subscription_end"] = datetime.fromisoformat(subscription_end).isoformat()
    
    result = await db.contacts.update_one(
        {"id": contact_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"message": "Subscription updated successfully"}

@api_router.get("/contacts/stats/summary")
async def get_contacts_summary(current_user: Dict = Depends(get_current_user)):
    """Get summary statistics of contacts"""
    total_contacts = await db.contacts.count_documents({})
    
    subscribers = await db.contacts.count_documents({"subscription_status": "active"})
    non_subscribers = await db.contacts.count_documents({"subscription_status": "non-subscriber"})
    trial_members = await db.contacts.count_documents({"subscription_status": "trial"})
    expired = await db.contacts.count_documents({"subscription_status": "expired"})
    
    return {
        "total": total_contacts,
        "subscribers": subscribers,
        "non_subscribers": non_subscribers,
        "trial": trial_members,
        "expired": expired
    }

@api_router.post("/contacts/bulk-message")
async def send_bulk_message(
    contact_ids: List[str],
    message: str,
    channel: str = "email",  # email or whatsapp
    current_user: Dict = Depends(get_current_user)
):
    """Send message to multiple contacts"""
    contacts = await db.contacts.find(
        {"id": {"$in": contact_ids}},
        {"_id": 0}
    ).to_list(length=None)
    
    if not contacts:
        raise HTTPException(status_code=404, detail="No contacts found")
    
    sent_count = 0
    failed_count = 0
    
    if channel == "email":
        # Send emails
        for contact in contacts:
            try:
                # TODO: Implement email sending logic
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send email to {contact['email']}: {e}")
                failed_count += 1
    
    elif channel == "whatsapp":
        # Send WhatsApp messages
        config = await db.whatsapp_configs.find_one({"user_id": current_user["id"]})
        if not config:
            raise HTTPException(status_code=400, detail="WhatsApp not configured")
        
        from whatsapp_client import WhatsAppClient
        client = WhatsAppClient(
            phone_id=config["phone_id"],
            access_token=config["access_token"]
        )
        
        for contact in contacts:
            phone = contact.get("phone") or contact.get("email")  # Fallback to email if no phone
            try:
                await client.send_text_message(
                    recipient_phone=phone,
                    message_text=message
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send WhatsApp to {phone}: {e}")
                failed_count += 1
        
        await client.close()
    
    return {
        "message": "Messages sent",
        "sent_count": sent_count,
        "failed_count": failed_count
    }


# ========================
# ROUTES - CAMPAIGNS
# ========================

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns():
    """Get all campaigns"""
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(1000)
    for campaign in campaigns:
        for date_field in ['created_at', 'scheduled_at', 'sent_at']:
            if campaign.get(date_field) and isinstance(campaign[date_field], str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    return campaigns

@api_router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str):
    """Get a specific campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    return campaign

@api_router.post("/campaigns", response_model=Campaign)
async def create_campaign(campaign_data: CampaignCreate):
    """Create a new campaign"""
    campaign = Campaign(**campaign_data.model_dump())
    if campaign_data.scheduled_at:
        campaign.status = "scheduled"
    
    doc = campaign.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('scheduled_at'):
        doc['scheduled_at'] = doc['scheduled_at'].isoformat()
    if doc.get('sent_at'):
        doc['sent_at'] = doc['sent_at'].isoformat()
    
    await db.campaigns.insert_one(doc)
    return campaign

@api_router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(campaign_id: str, campaign_update: CampaignUpdate):
    """Update a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    
    campaign_obj = Campaign(**campaign)
    update_data = campaign_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(campaign_obj, key, value)
    
    doc = campaign_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('scheduled_at'):
        doc['scheduled_at'] = doc['scheduled_at'].isoformat()
    if doc.get('sent_at'):
        doc['sent_at'] = doc['sent_at'].isoformat()
    
    await db.campaigns.update_one({"id": campaign_id}, {"$set": doc})
    return campaign_obj

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign"""
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted successfully"}

@api_router.post("/campaigns/{campaign_id}/send")
async def send_campaign(campaign_id: str, background_tasks: BackgroundTasks):
    """Send a campaign immediately"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    
    campaign_obj = Campaign(**campaign)
    
    if campaign_obj.status == "sent":
        raise HTTPException(status_code=400, detail="Campaign already sent")
    
    # Update status to sending
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "sending"}}
    )
    
    # Send emails in background
    background_tasks.add_task(send_campaign_emails, campaign_id)
    
    return {"message": "Campaign is being sent", "campaign_id": campaign_id}

async def send_campaign_emails(campaign_id: str):
    """Background task to send campaign emails"""
    try:
        campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
        if not campaign:
            return
        
        for date_field in ['created_at', 'scheduled_at', 'sent_at']:
            if campaign.get(date_field) and isinstance(campaign[date_field], str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
        
        campaign_obj = Campaign(**campaign)
        settings = await get_settings()
        
        # Get target contacts
        contacts = await get_contacts_by_filters(
            groups=campaign_obj.target_groups if campaign_obj.target_groups else None,
            tags=campaign_obj.target_tags if campaign_obj.target_tags else None
        )
        
        if not contacts:
            logger.warning(f"No contacts found for campaign {campaign_id}")
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "failed"}}
            )
            return
        
        get_resend_client(settings.resend_api_key)
        
        sent_count = 0
        failed_count = 0
        
        for contact in contacts:
            try:
                # Create tracking pixel
                tracking_pixel = f'<img src="{os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001")}/api/track/open/{campaign_id}/{contact.id}" width="1" height="1" />'
                
                # Add tracking to links
                content_with_tracking = campaign_obj.content_html.replace(
                    'href="',
                    f'href="{os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001")}/api/track/click/{campaign_id}/{contact.id}?url='
                )
                
                # Add tracking pixel
                content_with_tracking += tracking_pixel
                
                # Send email
                params = {
                    "from": f"{settings.sender_name} <{settings.sender_email}>",
                    "to": [contact.email],
                    "subject": campaign_obj.subject,
                    "html": content_with_tracking,
                }
                
                resend.Emails.send(params)
                
                # Log email
                email_log = EmailLog(
                    campaign_id=campaign_id,
                    contact_id=contact.id,
                    contact_email=contact.email,
                    status="sent"
                )
                log_doc = email_log.model_dump()
                log_doc['sent_at'] = log_doc['sent_at'].isoformat()
                await db.email_logs.insert_one(log_doc)
                
                # Update contact stats
                await db.contacts.update_one(
                    {"id": contact.id},
                    {"$inc": {"stats.emails_received": 1}}
                )
                
                sent_count += 1
                
            except Exception as e:
                logger.error(f"Error sending email to {contact.email}: {e}")
                failed_count += 1
                
                # Log failed email
                email_log = EmailLog(
                    campaign_id=campaign_id,
                    contact_id=contact.id,
                    contact_email=contact.email,
                    status="failed",
                    error_message=str(e)
                )
                log_doc = email_log.model_dump()
                log_doc['sent_at'] = log_doc['sent_at'].isoformat()
                await db.email_logs.insert_one(log_doc)
        
        # Update campaign
        await db.campaigns.update_one(
            {"id": campaign_id},
            {
                "$set": {
                    "status": "sent",
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "stats.sent": sent_count,
                    "stats.failed": failed_count
                }
            }
        )
        
        logger.info(f"Campaign {campaign_id} sent: {sent_count} sent, {failed_count} failed")
        
    except Exception as e:
        logger.error(f"Error sending campaign {campaign_id}: {e}")
        await db.campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "failed"}}
        )


# ========================
# ROUTES - TRACKING
# ========================

@api_router.get("/track/open/{campaign_id}/{contact_id}")
async def track_email_open(campaign_id: str, contact_id: str):
    """Track email open via pixel"""
    try:
        # Update email log
        await db.email_logs.update_one(
            {"campaign_id": campaign_id, "contact_id": contact_id, "status": "sent"},
            {
                "$set": {
                    "status": "opened",
                    "opened_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Update campaign stats
        await db.campaigns.update_one(
            {"id": campaign_id},
            {"$inc": {"stats.opened": 1}}
        )
        
        # Update contact stats
        await db.contacts.update_one(
            {"id": contact_id},
            {"$inc": {"stats.emails_opened": 1}}
        )
        
    except Exception as e:
        logger.error(f"Error tracking open: {e}")
    
    # Return 1x1 transparent pixel
    pixel = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
    return Response(content=pixel, media_type="image/gif")

@api_router.get("/track/click/{campaign_id}/{contact_id}")
async def track_email_click(campaign_id: str, contact_id: str, url: str):
    """Track email click via redirect"""
    try:
        # Update email log
        log = await db.email_logs.find_one(
            {"campaign_id": campaign_id, "contact_id": contact_id},
            {"_id": 0}
        )
        
        if log and log['status'] != 'clicked':
            await db.email_logs.update_one(
                {"campaign_id": campaign_id, "contact_id": contact_id},
                {
                    "$set": {
                        "status": "clicked",
                        "clicked_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Update campaign stats
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$inc": {"stats.clicked": 1}}
            )
            
            # Update contact stats
            await db.contacts.update_one(
                {"id": contact_id},
                {"$inc": {"stats.emails_clicked": 1}}
            )
    
    except Exception as e:
        logger.error(f"Error tracking click: {e}")
    
    return RedirectResponse(url=url)


# ========================
# ROUTES - ANALYTICS
# ========================

@api_router.get("/analytics/overview")
async def get_analytics_overview():
    """Get overall analytics"""
    total_contacts = await db.contacts.count_documents({})
    active_contacts = await db.contacts.count_documents({"active": True})
    total_campaigns = await db.campaigns.count_documents({})
    sent_campaigns = await db.campaigns.count_documents({"status": "sent"})
    total_emails_sent = await db.email_logs.count_documents({"status": {"$in": ["sent", "opened", "clicked"]}})
    total_emails_opened = await db.email_logs.count_documents({"status": {"$in": ["opened", "clicked"]}})
    total_emails_clicked = await db.email_logs.count_documents({"status": "clicked"})
    
    open_rate = (total_emails_opened / total_emails_sent * 100) if total_emails_sent > 0 else 0
    click_rate = (total_emails_clicked / total_emails_sent * 100) if total_emails_sent > 0 else 0
    
    return {
        "total_contacts": total_contacts,
        "active_contacts": active_contacts,
        "total_campaigns": total_campaigns,
        "sent_campaigns": sent_campaigns,
        "total_emails_sent": total_emails_sent,
        "total_emails_opened": total_emails_opened,
        "total_emails_clicked": total_emails_clicked,
        "open_rate": round(open_rate, 2),
        "click_rate": round(click_rate, 2)
    }

@api_router.get("/analytics/campaigns")
async def get_campaign_analytics():
    """Get campaign performance analytics"""
    campaigns = await db.campaigns.find({"status": "sent"}, {"_id": 0}).to_list(1000)
    
    analytics = []
    for campaign in campaigns:
        sent = campaign['stats'].get('sent', 0)
        opened = campaign['stats'].get('opened', 0)
        clicked = campaign['stats'].get('clicked', 0)
        
        open_rate = (opened / sent * 100) if sent > 0 else 0
        click_rate = (clicked / sent * 100) if sent > 0 else 0
        
        analytics.append({
            "campaign_id": campaign['id'],
            "title": campaign['title'],
            "sent": sent,
            "opened": opened,
            "clicked": clicked,
            "open_rate": round(open_rate, 2),
            "click_rate": round(click_rate, 2),
            "sent_at": campaign.get('sent_at')
        })
    
    return analytics


# ========================
# ROUTES - AI
# ========================

@api_router.post("/ai/generate", response_model=AIGenerateResponse)
async def generate_ai_content(request: AIGenerateRequest):
    """Generate email content using AI"""
    settings = await get_settings()
    
    try:
        client = get_openai_client(settings.openai_api_key)
        
        # Build prompt based on type
        if request.type == "subject":
            system_prompt = f"You are an expert email marketer. Generate a compelling email subject line in {request.language}. Be concise and engaging."
            user_prompt = f"Create an email subject line for: {request.prompt}\nTone: {request.tone}\nLanguage: {request.language}"
        elif request.type == "cta":
            system_prompt = f"You are an expert copywriter. Generate a compelling call-to-action button text in {request.language}."
            user_prompt = f"Create a CTA for: {request.prompt}\nTone: {request.tone}\nLanguage: {request.language}"
        else:  # email
            system_prompt = f"You are an expert email marketer for Afroboost, a dance and fitness company. Generate professional HTML email content in {request.language}. Include proper formatting with paragraphs, bold text where appropriate, and a clear structure."
            user_prompt = f"Create an email about: {request.prompt}\nTone: {request.tone}\nLanguage: {request.language}\n\nFormat the response as clean HTML (use <p>, <strong>, <br> tags). Do not include <html>, <body> or <head> tags, just the content."
        
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        content = response.choices[0].message.content
        
        return AIGenerateResponse(
            content=content,
            language=request.language
        )
        
    except Exception as e:
        logger.error(f"Error generating AI content: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating content: {str(e)}")



# ========================
# ROUTES - WHATSAPP CAMPAIGNS
# ========================

@api_router.get("/whatsapp/campaigns", response_model=List[WhatsAppCampaign])
async def get_whatsapp_campaigns():
    """Get all WhatsApp campaigns"""
    campaigns = await db.whatsapp_campaigns.find({}, {"_id": 0}).to_list(1000)
    for campaign in campaigns:
        for date_field in ['created_at', 'scheduled_at', 'sent_at']:
            if campaign.get(date_field) and isinstance(campaign[date_field], str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    return campaigns

@api_router.post("/whatsapp/campaigns", response_model=WhatsAppCampaign)
async def create_whatsapp_campaign(campaign_data: WhatsAppCampaignCreate):
    """Create a new WhatsApp campaign"""
    campaign = WhatsAppCampaign(**campaign_data.model_dump())
    if campaign_data.scheduled_at:
        campaign.status = "scheduled"
    
    doc = campaign.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('scheduled_at'):
        doc['scheduled_at'] = doc['scheduled_at'].isoformat()
    if doc.get('sent_at'):
        doc['sent_at'] = doc['sent_at'].isoformat()
    
    await db.whatsapp_campaigns.insert_one(doc)
    return campaign

@api_router.put("/whatsapp/campaigns/{campaign_id}", response_model=WhatsAppCampaign)
async def update_whatsapp_campaign(campaign_id: str, campaign_update: WhatsAppCampaignUpdate):
    """Update a WhatsApp campaign"""
    campaign = await db.whatsapp_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    
    campaign_obj = WhatsAppCampaign(**campaign)
    update_data = campaign_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(campaign_obj, key, value)
    
    doc = campaign_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('scheduled_at'):
        doc['scheduled_at'] = doc['scheduled_at'].isoformat()
    if doc.get('sent_at'):
        doc['sent_at'] = doc['sent_at'].isoformat()
    
    await db.whatsapp_campaigns.update_one({"id": campaign_id}, {"$set": doc})
    return campaign_obj

@api_router.post("/whatsapp/campaigns/{campaign_id}/send")
async def send_whatsapp_campaign(campaign_id: str, background_tasks: BackgroundTasks):
    """Send a WhatsApp campaign immediately"""
    campaign = await db.whatsapp_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    
    campaign_obj = WhatsAppCampaign(**campaign)
    
    if campaign_obj.status == "sent":
        raise HTTPException(status_code=400, detail="Campaign already sent")
    
    # Update status to sending
    await db.whatsapp_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "sending"}}
    )
    
    # Send messages in background
    background_tasks.add_task(send_whatsapp_campaign_messages, campaign_id)
    
    return {"message": "WhatsApp campaign is being sent", "campaign_id": campaign_id}

async def send_whatsapp_campaign_messages(campaign_id: str):
    """Background task to send WhatsApp campaign messages"""
    try:
        campaign = await db.whatsapp_campaigns.find_one({"id": campaign_id}, {"_id": 0})
        if not campaign:
            return
        
        for date_field in ['created_at', 'scheduled_at', 'sent_at']:
            if campaign.get(date_field) and isinstance(campaign[date_field], str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
        
        campaign_obj = WhatsAppCampaign(**campaign)
        settings = await get_settings()
        
        # Check WhatsApp credentials
        if not settings.whatsapp_access_token or not settings.whatsapp_phone_number_id:
            logger.error("WhatsApp credentials not configured")
            await db.whatsapp_campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "failed"}}
            )
            return
        
        # Initialize WhatsApp service
        whatsapp = WhatsAppService(
            access_token=settings.whatsapp_access_token,
            phone_number_id=settings.whatsapp_phone_number_id
        )
        
        # Get target contacts
        contacts = await get_contacts_by_filters(
            groups=campaign_obj.target_groups if campaign_obj.target_groups else None,
            tags=campaign_obj.target_tags if campaign_obj.target_tags else None
        )
        
        if not contacts:
            logger.warning(f"No contacts found for WhatsApp campaign {campaign_id}")
            await db.whatsapp_campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "failed"}}
            )
            return
        
        sent_count = 0
        failed_count = 0
        
        for contact in contacts:
            try:
                # Assume phone stored in tags or add phone field to Contact model
                phone = getattr(contact, 'phone', None)
                if not phone:
                    # Try to extract from tags
                    phone_tags = [t for t in contact.tags if t.startswith('phone:')]
                    if phone_tags:
                        phone = phone_tags[0].replace('phone:', '')
                
                if not phone:
                    logger.warning(f"No phone number for contact {contact.id}")
                    failed_count += 1
                    continue
                
                # Send WhatsApp message
                result = whatsapp.send_text_message(
                    to=phone,
                    message=campaign_obj.message_content
                )
                
                # Log message
                whatsapp_msg = WhatsAppMessage(
                    campaign_id=campaign_id,
                    contact_id=contact.id,
                    contact_phone=phone,
                    direction="outbound",
                    content=campaign_obj.message_content,
                    status="sent"
                )
                msg_doc = whatsapp_msg.model_dump()
                msg_doc['timestamp'] = msg_doc['timestamp'].isoformat()
                await db.whatsapp_messages.insert_one(msg_doc)
                
                sent_count += 1
                
            except Exception as e:
                logger.error(f"Error sending WhatsApp to contact {contact.id}: {e}")
                failed_count += 1
                
                # Log failed message
                whatsapp_msg = WhatsAppMessage(
                    campaign_id=campaign_id,
                    contact_id=contact.id,
                    contact_phone=phone if phone else "unknown",
                    direction="outbound",
                    content=campaign_obj.message_content,
                    status="failed",
                    error_message=str(e)
                )
                msg_doc = whatsapp_msg.model_dump()
                msg_doc['timestamp'] = msg_doc['timestamp'].isoformat()
                await db.whatsapp_messages.insert_one(msg_doc)
        
        # Update campaign
        await db.whatsapp_campaigns.update_one(
            {"id": campaign_id},
            {
                "$set": {
                    "status": "sent",
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "stats.sent": sent_count,
                    "stats.failed": failed_count
                }
            }
        )
        
        logger.info(f"WhatsApp campaign {campaign_id} sent: {sent_count} sent, {failed_count} failed")
        
    except Exception as e:
        logger.error(f"Error sending WhatsApp campaign {campaign_id}: {e}")
        await db.whatsapp_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "failed"}}
        )


# ========================
# ROUTES - WHATSAPP WEBHOOK & MESSAGING
# ========================

@api_router.get("/whatsapp/webhook")
async def verify_whatsapp_webhook(request: Request):
    """Verify WhatsApp webhook"""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.token")
    challenge = request.query_params.get("hub.challenge")
    
    settings = await get_settings()
    verify_token = settings.whatsapp_verify_token or "afroboost_verify_token"
    
    result = WhatsAppService.verify_webhook(mode, token, challenge, verify_token)
    
    if result:
        return JSONResponse(content=int(result))
    else:
        raise HTTPException(status_code=403, detail="Verification failed")

@api_router.post("/whatsapp/webhook")
async def handle_whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle incoming WhatsApp messages"""
    try:
        body = await request.json()
        
        # Process webhook
        if body.get("object") == "whatsapp_business_account":
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    
                    # Handle incoming messages
                    if "messages" in value:
                        for message in value["messages"]:
                            background_tasks.add_task(
                                handle_incoming_whatsapp_message,
                                message,
                                value.get("contacts", [{}])[0]
                            )
                    
                    # Handle message status updates
                    if "statuses" in value:
                        for status in value["statuses"]:
                            background_tasks.add_task(
                                update_whatsapp_message_status,
                                status
                            )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}")
        return {"status": "error"}

async def handle_incoming_whatsapp_message(message: Dict, contact_info: Dict):
    """Handle incoming WhatsApp message with AI response"""
    try:
        from_phone = message.get("from")
        message_content = message.get("text", {}).get("body", "")
        message_id = message.get("id")
        
        if not message_content:
            return
        
        # Find or create contact
        contact = await db.contacts.find_one({"tags": f"phone:{from_phone}"}, {"_id": 0})
        
        if not contact:
            # Create new contact
            contact_name = contact_info.get("profile", {}).get("name", "Unknown")
            new_contact = Contact(
                name=contact_name,
                email=f"{from_phone}@whatsapp.temp",
                tags=[f"phone:{from_phone}", "whatsapp"],
                group="whatsapp",
                active=True
            )
            contact_doc = new_contact.model_dump()
            contact_doc['created_at'] = contact_doc['created_at'].isoformat()
            await db.contacts.insert_one(contact_doc)
            contact = contact_doc
        
        contact_obj = Contact(**contact) if isinstance(contact, dict) else contact
        
        # Log incoming message
        incoming_msg = WhatsAppMessage(
            contact_id=contact_obj.id,
            contact_phone=from_phone,
            direction="inbound",
            content=message_content,
            status="received"
        )
        msg_doc = incoming_msg.model_dump()
        msg_doc['timestamp'] = msg_doc['timestamp'].isoformat()
        await db.whatsapp_messages.insert_one(msg_doc)
        
        # Add to AI memory
        await ai_memory.add_message(
            contact_id=contact_obj.id,
            role="user",
            content=message_content,
            channel="whatsapp"
        )
        
        # Generate AI response
        settings = await get_settings()
        client = get_openai_client(settings.openai_api_key)
        
        # Get conversation context
        context = await ai_memory.get_context_for_ai(
            contact_id=contact_obj.id,
            contact_name=contact_obj.name,
            campaign_context="Message WhatsApp Afroboost"
        )
        
        system_prompt = f"""Tu es l'assistant IA d'Afroboost, une entreprise de danse et fitness.
Tu réponds aux messages WhatsApp de manière professionnelle, amicale et énergique.
Tu peux répondre aux questions sur les cours, les tarifs et l'inscription.

Plans Afroboost:
- Starter: Gratuit, jusqu'à 100 emails/mois
- Pro Coach: 49 CHF/mois, jusqu'à 5000 emails/mois, IA intégrée
- Business: 149 CHF/mois, illimité

{context}"""
        
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message_content}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        ai_response = response.choices[0].message.content
        
        # Add AI response to memory
        await ai_memory.add_message(
            contact_id=contact_obj.id,
            role="assistant",
            content=ai_response,
            channel="whatsapp"
        )
        
        # Send AI response via WhatsApp
        whatsapp = WhatsAppService(
            access_token=settings.whatsapp_access_token,
            phone_number_id=settings.whatsapp_phone_number_id
        )
        
        whatsapp.send_text_message(to=from_phone, message=ai_response)
        
        # Log outgoing response
        outgoing_msg = WhatsAppMessage(
            contact_id=contact_obj.id,
            contact_phone=from_phone,
            direction="outbound",
            content=ai_response,
            status="sent"
        )
        out_doc = outgoing_msg.model_dump()
        out_doc['timestamp'] = out_doc['timestamp'].isoformat()
        await db.whatsapp_messages.insert_one(out_doc)
        
        # Mark original message as read
        whatsapp.mark_message_read(message_id)
        
        logger.info(f"AI responded to WhatsApp message from {from_phone}")
        
    except Exception as e:
        logger.error(f"Error handling incoming WhatsApp message: {e}")

async def update_whatsapp_message_status(status: Dict):
    """Update WhatsApp message status (delivered, read, etc.)"""
    try:
        message_id = status.get("id")
        new_status = status.get("status")
        
        # Update in database
        await db.whatsapp_messages.update_one(
            {"id": message_id},
            {"$set": {"status": new_status}}
        )
        
        # Update campaign stats if applicable
        message = await db.whatsapp_messages.find_one({"id": message_id}, {"_id": 0})
        if message and message.get("campaign_id"):
            stat_field = f"stats.{new_status}"
            await db.whatsapp_campaigns.update_one(
                {"id": message["campaign_id"]},
                {"$inc": {stat_field: 1}}
            )
        
    except Exception as e:
        logger.error(f"Error updating WhatsApp message status: {e}")


# ========================
# ROUTES - AI CONVERSATION
# ========================

@api_router.post("/ai/conversation", response_model=AIConversationResponse)
async def ai_conversation(request: AIConversationRequest):
    """AI conversational response with memory"""
    try:
        settings = await get_settings()
        client = get_openai_client(settings.openai_api_key)
        
        # Add user message to memory
        await ai_memory.add_message(
            contact_id=request.contact_id,
            role="user",
            content=request.message
        )
        
        # Get conversation context
        context = await ai_memory.get_context_for_ai(
            contact_id=request.contact_id,
            contact_name=request.contact_name,
            campaign_context=request.campaign_context
        )
        
        system_prompt = f"""Tu es l'assistant IA d'Afroboost, une entreprise de danse et fitness.
Tu réponds aux messages de manière professionnelle, amicale et énergique en {request.language}.

Contexte de la conversation:
{context}

Réponds de manière naturelle et personnalisée."""

        # Generate AI response
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ]
        )
        
        ai_response = response.choices[0].message.content
        
        # Add AI response to memory
        await ai_memory.add_message(
            contact_id=request.contact_id,
            role="assistant",
            content=ai_response
        )
        
        return AIConversationResponse(
            response=ai_response,
            context_used=context
        )
        
    except Exception as e:
        logger.error(f"Error in AI conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# ROUTES - ADVANCED WHATSAPP (TEMPLATES & CAMPAIGNS)
# ========================

@api_router.get("/whatsapp/templates", response_model=List[MessageTemplate])
async def get_message_templates(current_user: Dict = Depends(get_current_user)):
    """Get all message templates for the user"""
    templates = await db.message_templates.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(length=None)
    
    # Parse dates
    for template in templates:
        if isinstance(template.get('created_at'), str):
            template['created_at'] = datetime.fromisoformat(template['created_at'])
        if isinstance(template.get('updated_at'), str):
            template['updated_at'] = datetime.fromisoformat(template['updated_at'])
    
    return templates

@api_router.post("/whatsapp/templates", response_model=MessageTemplate)
async def create_message_template(
    template_data: MessageTemplateCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new message template"""
    template = MessageTemplate(
        user_id=current_user["id"],
        **template_data.model_dump(),
        has_media=bool(template_data.media_url)
    )
    
    template_dict = template.model_dump()
    template_dict["created_at"] = template_dict["created_at"].isoformat()
    template_dict["updated_at"] = template_dict["updated_at"].isoformat()
    
    await db.message_templates.insert_one(template_dict)
    
    return template

@api_router.put("/whatsapp/templates/{template_id}", response_model=MessageTemplate)
async def update_message_template(
    template_id: str,
    template_data: MessageTemplateUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update a message template"""
    update_data = {k: v for k, v in template_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "media_url" in update_data:
        update_data["has_media"] = bool(update_data["media_url"])
    
    result = await db.message_templates.update_one(
        {"id": template_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = await db.message_templates.find_one(
        {"id": template_id},
        {"_id": 0}
    )
    
    # Parse dates
    if isinstance(template.get('created_at'), str):
        template['created_at'] = datetime.fromisoformat(template['created_at'])
    if isinstance(template.get('updated_at'), str):
        template['updated_at'] = datetime.fromisoformat(template['updated_at'])
    
    return MessageTemplate(**template)

@api_router.delete("/whatsapp/templates/{template_id}")
async def delete_message_template(
    template_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a message template"""
    result = await db.message_templates.delete_one(
        {"id": template_id, "user_id": current_user["id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted successfully"}

@api_router.get("/whatsapp/advanced-campaigns", response_model=List[AdvancedWhatsAppCampaign])
async def get_advanced_campaigns(current_user: Dict = Depends(get_current_user)):
    """Get all advanced WhatsApp campaigns for the user"""
    campaigns = await db.advanced_whatsapp_campaigns.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(length=None)
    
    # Parse dates
    for campaign in campaigns:
        for date_field in ['created_at', 'updated_at', 'scheduled_at', 'sent_at']:
            if isinstance(campaign.get(date_field), str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    
    return campaigns

@api_router.post("/whatsapp/advanced-campaigns", response_model=AdvancedWhatsAppCampaign)
async def create_advanced_campaign(
    campaign_data: AdvancedWhatsAppCampaignCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new advanced WhatsApp campaign"""
    # Parse scheduled_at if provided
    scheduled_at = None
    if campaign_data.scheduled_at:
        try:
            scheduled_at = datetime.fromisoformat(campaign_data.scheduled_at)
        except:
            pass
    
    campaign = AdvancedWhatsAppCampaign(
        user_id=current_user["id"],
        title=campaign_data.title,
        template_id=campaign_data.template_id,
        message_content=campaign_data.message_content,
        language=campaign_data.language,
        buttons=campaign_data.buttons,
        list_sections=campaign_data.list_sections,
        has_media=bool(campaign_data.media_url),
        media_url=campaign_data.media_url,
        media_type=campaign_data.media_type,
        target_contacts=campaign_data.target_contacts,
        target_tags=campaign_data.target_tags,
        target_status=campaign_data.target_status,
        use_personalization=campaign_data.use_personalization,
        scheduled_at=scheduled_at,
        payment_links=campaign_data.payment_links
    )
    
    campaign_dict = campaign.model_dump()
    campaign_dict["created_at"] = campaign_dict["created_at"].isoformat()
    campaign_dict["updated_at"] = campaign_dict["updated_at"].isoformat()
    if campaign_dict.get("scheduled_at"):
        campaign_dict["scheduled_at"] = campaign_dict["scheduled_at"].isoformat()
    
    await db.advanced_whatsapp_campaigns.insert_one(campaign_dict)
    
    return campaign

@api_router.post("/whatsapp/advanced-campaigns/{campaign_id}/send")
async def send_advanced_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user)
):
    """Send an advanced WhatsApp campaign (SIMULATION MODE)"""
    campaign = await db.advanced_whatsapp_campaigns.find_one(
        {"id": campaign_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get target contacts
    query = {}
    if campaign.get("target_contacts"):
        query["id"] = {"$in": campaign["target_contacts"]}
    if campaign.get("target_tags"):
        query["tags"] = {"$in": campaign["target_tags"]}
    if campaign.get("target_status"):
        query["status"] = campaign["target_status"]
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(length=None)
    
    if not contacts:
        raise HTTPException(status_code=400, detail="No contacts match the targeting criteria")
    
    # SIMULATION MODE - Just log and update stats
    logger.info(f"[SIMULATION] Sending campaign {campaign_id} to {len(contacts)} contacts")
    
    # Update campaign status
    await db.advanced_whatsapp_campaigns.update_one(
        {"id": campaign_id},
        {
            "$set": {
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "stats.sent": len(contacts),
                "stats.delivered": len(contacts),  # Simulate all delivered
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create analytics records (simulation)
    for contact in contacts:
        analytics = CampaignAnalytics(
            campaign_id=campaign_id,
            contact_id=contact["id"],
            contact_phone=contact.get("phone_number", "Unknown"),
            sent=True,
            delivered=True,  # Simulate delivery
            sent_at=datetime.now(timezone.utc),
            delivered_at=datetime.now(timezone.utc)
        )
        
        analytics_dict = analytics.model_dump()
        analytics_dict["created_at"] = analytics_dict["created_at"].isoformat()
        if analytics_dict.get("sent_at"):
            analytics_dict["sent_at"] = analytics_dict["sent_at"].isoformat()
        if analytics_dict.get("delivered_at"):
            analytics_dict["delivered_at"] = analytics_dict["delivered_at"].isoformat()
        
        await db.campaign_analytics.insert_one(analytics_dict)
    
    return {
        "message": "Campaign sent successfully (SIMULATION MODE)",
        "contacts_targeted": len(contacts),
        "status": "sent"
    }

@api_router.get("/whatsapp/campaigns/{campaign_id}/analytics")
async def get_campaign_analytics(
    campaign_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get detailed analytics for a campaign"""
    # Verify campaign belongs to user
    campaign = await db.advanced_whatsapp_campaigns.find_one(
        {"id": campaign_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get analytics
    analytics = await db.campaign_analytics.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(length=None)
    
    # Calculate summary
    summary = {
        "total": len(analytics),
        "sent": sum(1 for a in analytics if a.get("sent")),
        "delivered": sum(1 for a in analytics if a.get("delivered")),
        "read": sum(1 for a in analytics if a.get("read")),
        "replied": sum(1 for a in analytics if a.get("replied")),
        "clicked": sum(1 for a in analytics if a.get("clicked")),
        "payment_completed": sum(1 for a in analytics if a.get("payment_completed"))
    }
    
    return {
        "campaign": campaign,
        "summary": summary,
        "details": analytics
    }

@api_router.post("/whatsapp/payment-link")
async def create_payment_link(
    payment_data: PaymentLinkCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a payment link for WhatsApp (SIMULATION MODE)"""
    # SIMULATION - Generate a dummy link
    payment_id = str(uuid.uuid4())[:8]
    
    if payment_data.payment_method == "stripe":
        # In real implementation, create Stripe payment link here
        link = f"https://pay.stripe.com/simulation/{payment_id}"
    elif payment_data.payment_method == "twint":
        # In real implementation, create Twint payment link here
        link = f"https://pay.twint.ch/simulation/{payment_id}"
    else:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    
    logger.info(f"[SIMULATION] Created payment link: {link}")
    
    return {
        "payment_link": link,
        "payment_id": payment_id,
        "amount": payment_data.amount,
        "currency": payment_data.currency,
        "description": payment_data.description,
        "method": payment_data.payment_method,
        "note": "SIMULATION MODE - This is a test link"
    }


@api_router.get("/ai/conversation/{contact_id}/history")
async def get_conversation_history(contact_id: str):
    """Get conversation history for a contact"""
    try:
        history = await ai_memory.get_conversation_history(contact_id)
        summary = await ai_memory.get_conversation_summary(contact_id)
        
        return {
            "contact_id": contact_id,
            "history": history,
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/ai/conversation/{contact_id}")
async def clear_conversation_history(contact_id: str):
    """Clear conversation history for a contact"""
    try:
        await ai_memory.clear_conversation(contact_id)
        return {"message": "Conversation history cleared"}
    except Exception as e:
        logger.error(f"Error clearing conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# ROUTES - STRIPE PAYMENTS
# ========================

@api_router.post("/stripe/create-payment-intent")
async def create_payment_intent(payment_data: PaymentIntent):
    """Create a Stripe payment intent"""
    try:
        settings = await get_settings()
        if not settings.stripe_secret_key:
            raise HTTPException(status_code=400, detail="Stripe not configured")
        
        stripe.api_key = settings.stripe_secret_key
        
        intent = stripe.PaymentIntent.create(
            amount=payment_data.amount,
            currency=payment_data.currency,
            receipt_email=payment_data.customer_email,
            description=payment_data.description,
            automatic_payment_methods={"enabled": True}
        )
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id
        }
    except Exception as e:
        logger.error(f"Error creating payment intent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stripe/create-subscription")
async def create_subscription(subscription_data: SubscriptionCreate):
    """Create a Stripe subscription"""
    try:
        settings = await get_settings()
        if not settings.stripe_secret_key:
            raise HTTPException(status_code=400, detail="Stripe not configured")
        
        stripe.api_key = settings.stripe_secret_key
        
        # Create customer
        customer = stripe.Customer.create(
            email=subscription_data.customer_email,
            name=subscription_data.customer_name,
            payment_method=subscription_data.payment_method_id,
            invoice_settings={"default_payment_method": subscription_data.payment_method_id}
        )
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{"price": subscription_data.plan_id}],
            expand=["latest_invoice.payment_intent"]
        )
        
        return {
            "subscription_id": subscription.id,
            "customer_id": customer.id,
            "status": subscription.status,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret
        }
    except Exception as e:
        logger.error(f"Error creating subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stripe/webhook")
async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        settings = await get_settings()
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        # Verify webhook signature (configure webhook secret in settings)
        # event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        
        # For now, just parse the payload
        event = await request.json()
        
        event_type = event.get("type")
        
        if event_type == "payment_intent.succeeded":
            payment_intent = event["data"]["object"]
            logger.info(f"Payment succeeded: {payment_intent['id']}")
            # Handle successful payment (create user account, send email, etc.)
        
        elif event_type == "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            subscription_id = invoice.get("subscription")
            logger.info(f"Subscription payment succeeded: {subscription_id}")
            # Update subscription status
        
        elif event_type == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            logger.info(f"Subscription cancelled: {subscription['id']}")
            # Handle subscription cancellation
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing Stripe webhook: {e}")
        return {"status": "error"}

@api_router.get("/stripe/config")
async def get_stripe_config():
    """Get Stripe publishable key"""
    settings = await get_settings()
    if not settings.stripe_publishable_key:
        raise HTTPException(status_code=400, detail="Stripe not configured")
    
    return {"publishable_key": settings.stripe_publishable_key}



# ========================
# RESERVATION EMAIL HELPER
# ========================

async def send_reservation_confirmation_email(
    customer_name: str,
    customer_email: str,
    item_title: str,
    item_category: str,
    quantity: int,
    total_price: float,
    currency: str,
    event_date: Optional[str] = None,
    location: Optional[str] = None,
    reservation_id: str = ""
):
    """Send reservation confirmation email via Resend"""
    resend_api_key = os.environ.get('RESEND_API_KEY')
    
    if not resend_api_key:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return
    
    resend.api_key = resend_api_key
    
    # Format event date
    event_date_formatted = ""
    if event_date:
        try:
            dt = datetime.fromisoformat(event_date) if isinstance(event_date, str) else event_date
            event_date_formatted = dt.strftime("%d %B %Y à %H:%M")
        except:
            event_date_formatted = str(event_date)
    
    # Build email content
    category_label = {
        'course': 'Cours',
        'event': 'Événement',
        'product': 'Produit'
    }.get(item_category, 'Article')
    
    # Simple text email (avoiding HTML complexity issues)
    price_formatted = f"{total_price:.2f} {currency}"
    res_id_short = reservation_id[:8]
    
    text_content = f"""
Bonjour {customer_name},

Nous avons le plaisir de confirmer votre reservation pour: {item_title}

Details:
- Type: {category_label}
- Quantite: {quantity}
- Prix total: {price_formatted}
"""
    
    if event_date_formatted:
        text_content += f"- Date: {event_date_formatted}\n"
    if location:
        text_content += f"- Lieu: {location}\n"
    
    text_content += f"""
Numero de reservation: {res_id_short}

Si vous avez des questions ou souhaitez modifier votre reservation, contactez-nous.

Merci de votre confiance!
Lequipe Afroboost
"""
    
    try:
        resend.Emails.send({
            "from": "Afroboost <onboarding@resend.dev>",
            "to": [customer_email],
            "subject": f"Confirmation de reservation - {item_title}",
            "text": text_content
        })
        logger.info(f"Confirmation email sent to {customer_email}")
    except Exception as e:
        logger.error(f"Error sending confirmation email: {str(e)}")
        raise


# ========================
# ROUTES - CATALOG & RESERVATIONS
# ========================

@api_router.post("/catalog")
async def create_catalog_item(
    item_data: CatalogItemCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new catalog item (product/course/event)"""
    item = CatalogItem(
        user_id=current_user["id"],
        **item_data.model_dump(exclude={'event_date'})
    )
    
    # Parse event date if provided
    if item_data.event_date:
        item.event_date = datetime.fromisoformat(item_data.event_date)
    
    item_dict = item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    item_dict["updated_at"] = item_dict["updated_at"].isoformat()
    if item_dict.get("event_date"):
        item_dict["event_date"] = item_dict["event_date"].isoformat()
    
    await db.catalog_items.insert_one(item_dict)
    
    return {"message": "Catalog item created", "id": item.id}

@api_router.get("/catalog")
async def get_catalog_items(
    category: Optional[str] = None,
    user_id: Optional[str] = None,
    published_only: bool = True
):
    """Get catalog items (public or filtered by user)"""
    query = {}
    
    if published_only:
        query["is_published"] = True
        query["is_active"] = True
    
    if category:
        query["category"] = category
    
    if user_id:
        query["user_id"] = user_id
    
    items = await db.catalog_items.find(query, {"_id": 0}).to_list(length=None)
    
    # Parse dates
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        if isinstance(item.get('updated_at'), str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'])
        if isinstance(item.get('event_date'), str):
            item['event_date'] = datetime.fromisoformat(item['event_date'])
    
    return items

@api_router.get("/catalog/{item_id}")
async def get_catalog_item(item_id: str):
    """Get a single catalog item (public)"""
    item = await db.catalog_items.find_one({"id": item_id}, {"_id": 0})
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Parse dates
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('updated_at'), str):
        item['updated_at'] = datetime.fromisoformat(item['updated_at'])
    if isinstance(item.get('event_date'), str):
        item['event_date'] = datetime.fromisoformat(item['event_date'])
    
    return item

@api_router.put("/catalog/{item_id}")
async def update_catalog_item(
    item_id: str,
    update_data: CatalogItemUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update a catalog item"""
    # Check ownership
    item = await db.catalog_items.find_one({"id": item_id, "user_id": current_user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")
    
    # Update
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.catalog_items.update_one(
        {"id": item_id},
        {"$set": update_dict}
    )
    
    return {"message": "Item updated successfully"}

@api_router.delete("/catalog/{item_id}")
async def delete_catalog_item(
    item_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a catalog item"""
    result = await db.catalog_items.delete_one({"id": item_id, "user_id": current_user["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")
    
    return {"message": "Item deleted successfully"}

@api_router.post("/reservations")
async def create_reservation(reservation_data: ReservationCreate):
    """Create a new reservation (public endpoint)"""
    # Get catalog item
    item = await db.catalog_items.find_one({"id": reservation_data.catalog_item_id})
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if not item.get("is_active") or not item.get("is_published"):
        raise HTTPException(status_code=400, detail="Item is not available")
    
    # Check availability
    if item.get("max_attendees"):
        if item.get("current_attendees", 0) + reservation_data.quantity > item["max_attendees"]:
            raise HTTPException(status_code=400, detail="Not enough places available")
    
    if item.get("stock_quantity") is not None:
        if item.get("stock_quantity", 0) < reservation_data.quantity:
            raise HTTPException(status_code=400, detail="Not enough stock available")
    
    # Calculate total
    total_price = item["price"] * reservation_data.quantity
    
    # Create reservation
    reservation = Reservation(
        catalog_item_id=reservation_data.catalog_item_id,
        user_id=item["user_id"],
        customer_name=reservation_data.customer_name,
        customer_email=reservation_data.customer_email,
        customer_phone=reservation_data.customer_phone,
        quantity=reservation_data.quantity,
        total_price=total_price,
        currency=item.get("currency", "CHF"),
        payment_method=reservation_data.payment_method,
        notes=reservation_data.notes
    )
    
    res_dict = reservation.model_dump()
    res_dict["reservation_date"] = res_dict["reservation_date"].isoformat()
    res_dict["created_at"] = res_dict["created_at"].isoformat()
    res_dict["updated_at"] = res_dict["updated_at"].isoformat()
    
    await db.reservations.insert_one(res_dict)
    
    # Update item availability
    if item.get("max_attendees"):
        await db.catalog_items.update_one(
            {"id": reservation_data.catalog_item_id},
            {"$inc": {"current_attendees": reservation_data.quantity}}
        )
    
    if item.get("stock_quantity") is not None:
        await db.catalog_items.update_one(
            {"id": reservation_data.catalog_item_id},
            {"$inc": {"stock_quantity": -reservation_data.quantity}}
        )
    
    # Send confirmation email
    try:
        await send_reservation_confirmation_email(
            customer_name=reservation.customer_name,
            customer_email=reservation.customer_email,
            item_title=item["title"],
            item_category=item["category"],
            quantity=reservation.quantity,
            total_price=total_price,
            currency=reservation.currency,
            event_date=item.get("event_date"),
            location=item.get("location"),
            reservation_id=reservation.id
        )
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {str(e)}")
        # Continue even if email fails
    
    # TODO: Create payment intent if payment_method is stripe
    
    return {
        "message": "Reservation created successfully",
        "reservation_id": reservation.id,
        "total_price": total_price,
        "currency": reservation.currency
    }

@api_router.get("/reservations")
async def get_reservations(current_user: Dict = Depends(get_current_user)):
    """Get all reservations for the coach"""
    reservations = await db.reservations.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(length=None)
    
    # Parse dates
    for res in reservations:
        if isinstance(res.get('reservation_date'), str):
            res['reservation_date'] = datetime.fromisoformat(res['reservation_date'])
        if isinstance(res.get('created_at'), str):
            res['created_at'] = datetime.fromisoformat(res['created_at'])
        if isinstance(res.get('updated_at'), str):
            res['updated_at'] = datetime.fromisoformat(res['updated_at'])
    
    return reservations

@api_router.patch("/reservations/{reservation_id}/status")
async def update_reservation_status(
    reservation_id: str,
    status: str,
    payment_status: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update reservation status"""
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if payment_status:
        update_data["payment_status"] = payment_status
    
    result = await db.reservations.update_one(
        {"id": reservation_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    return {"message": "Reservation updated successfully"}


# ========================
# ROUTES - PRICING PLANS (ADMIN)
# ========================

@api_router.get("/pricing-plans", response_model=List[PricingPlan])
async def get_pricing_plans(active_only: bool = False):
    """Get all pricing plans"""
    query = {"active": True} if active_only else {}
    plans = await db.pricing_plans.find(query, {"_id": 0}).to_list(100)
    
    for plan in plans:
        if isinstance(plan.get('created_at'), str):
            plan['created_at'] = datetime.fromisoformat(plan['created_at'])
    
    # Sort by order
    plans.sort(key=lambda x: x.get('order', 0))
    return plans

@api_router.get("/pricing-plans/{plan_id}", response_model=PricingPlan)
async def get_pricing_plan(plan_id: str):
    """Get a specific pricing plan"""
    plan = await db.pricing_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")
    
    if isinstance(plan.get('created_at'), str):
        plan['created_at'] = datetime.fromisoformat(plan['created_at'])
    
    return plan

@api_router.post("/pricing-plans", response_model=PricingPlan)
async def create_pricing_plan(plan_data: PricingPlanCreate):
    """Create a new pricing plan"""
    plan = PricingPlan(**plan_data.model_dump())
    
    doc = plan.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.pricing_plans.insert_one(doc)
    return plan

@api_router.put("/pricing-plans/{plan_id}", response_model=PricingPlan)
async def update_pricing_plan(plan_id: str, plan_update: PricingPlanUpdate):
    """Update a pricing plan"""
    plan = await db.pricing_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")
    
    if isinstance(plan.get('created_at'), str):
        plan['created_at'] = datetime.fromisoformat(plan['created_at'])
    
    plan_obj = PricingPlan(**plan)
    update_data = plan_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(plan_obj, key, value)
    
    doc = plan_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.pricing_plans.update_one({"id": plan_id}, {"$set": doc})
    return plan_obj

@api_router.delete("/pricing-plans/{plan_id}")
async def delete_pricing_plan(plan_id: str):
    """Delete a pricing plan"""
    result = await db.pricing_plans.delete_one({"id": plan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pricing plan not found")
    return {"message": "Pricing plan deleted successfully"}

@api_router.post("/pricing-plans/initialize")
async def initialize_default_plans():
    """Initialize default pricing plans (run once)"""
    # Check if plans already exist
    existing = await db.pricing_plans.count_documents({})
    if existing > 0:
        raise HTTPException(status_code=400, detail="Pricing plans already initialized")
    
    default_plans = [
        PricingPlan(
            name="Starter",
            name_en="Starter",
            name_de="Starter",
            price=0,
            currency="CHF",
            interval="month",
            features_fr=[
                "Jusqu'à 100 emails/mois",
                "1 utilisateur",
                "Templates simples",
                "Support par email"
            ],
            features_en=[
                "Up to 100 emails/month",
                "1 user",
                "Basic templates",
                "Email support"
            ],
            features_de=[
                "Bis zu 100 E-Mails/Monat",
                "1 Benutzer",
                "Einfache Vorlagen",
                "E-Mail-Support"
            ],
            limits={
                "emails_per_month": 100,
                "whatsapp_per_month": 0,
                "contacts_max": 500,
                "ai_enabled": False,
                "whatsapp_enabled": False,
                "multi_user": False
            },
            active=True,
            highlighted=False,
            order=1
        ),
        PricingPlan(
            name="Pro Coach",
            name_en="Pro Coach",
            name_de="Pro Coach",
            price=49,
            currency="CHF",
            interval="month",
            features_fr=[
                "Jusqu'à 5000 emails/mois",
                "IA Afroboost intégrée",
                "Relances automatiques",
                "Tableau de bord complet",
                "Support prioritaire"
            ],
            features_en=[
                "Up to 5000 emails/month",
                "Afroboost AI integrated",
                "Automatic follow-ups",
                "Complete dashboard",
                "Priority support"
            ],
            features_de=[
                "Bis zu 5000 E-Mails/Monat",
                "Afroboost KI integriert",
                "Automatische Nachverfolgung",
                "Vollständiges Dashboard",
                "Prioritätssupport"
            ],
            limits={
                "emails_per_month": 5000,
                "whatsapp_per_month": 1000,
                "contacts_max": 10000,
                "ai_enabled": True,
                "whatsapp_enabled": True,
                "multi_user": False
            },
            active=True,
            highlighted=True,
            order=2
        ),
        PricingPlan(
            name="Business",
            name_en="Business",
            name_de="Business",
            price=149,
            currency="CHF",
            interval="month",
            features_fr=[
                "Emails illimités",
                "Multi-utilisateurs",
                "IA avancée",
                "Intégration WhatsApp",
                "Branding personnalisé",
                "Support dédié 24/7"
            ],
            features_en=[
                "Unlimited emails",
                "Multi-user access",
                "Advanced AI",
                "WhatsApp integration",
                "Custom branding",
                "24/7 dedicated support"
            ],
            features_de=[
                "Unbegrenzte E-Mails",
                "Multi-Benutzer-Zugriff",
                "Erweiterte KI",
                "WhatsApp-Integration",
                "Individuelles Branding",
                "24/7 dedizierter Support"
            ],
            limits={
                "emails_per_month": -1,  # -1 = unlimited
                "whatsapp_per_month": -1,
                "contacts_max": -1,
                "ai_enabled": True,
                "whatsapp_enabled": True,
                "multi_user": True
            },
            active=True,
            highlighted=False,
            order=3
        )
    ]
    
    for plan in default_plans:
        doc = plan.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.pricing_plans.insert_one(doc)
    
    return {"message": "Default pricing plans initialized successfully", "count": len(default_plans)}


# ========================
# BASE ROUTES
# ========================

@api_router.get("/")
async def root():
    return {"message": "Afroboost Mailer API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
