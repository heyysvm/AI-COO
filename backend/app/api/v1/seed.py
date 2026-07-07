from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from groq import Groq
import json
import httpx

from app.core.database import get_database
from app.core.security import get_current_user
from app.services.seed_service import seed_demo_data
from app.core.config import settings

router = APIRouter()


@router.post("/", status_code=status.HTTP_200_OK)
async def seed_data(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated. Please register a business first.",
        )

    try:
        await seed_demo_data(db, business_id)
        return {"status": "success", "message": "Demo data successfully seeded for your business!"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database seeding failed: {str(e)}",
        )


@router.post("/scan")
async def scan_business_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Groq API Key is not configured in backend settings.",
        )

    try:
        # Read file bytes
        contents = await file.read()
        
        # 1. Extract text using free OCR.space API
        async with httpx.AsyncClient(timeout=30.0) as client:
            files_payload = {
                "file": (file.filename, contents, file.content_type)
            }
            data_payload = {
                "apikey": "helloworld",
                "language": "eng",
                "isOverlayRequired": False
            }
            
            ocr_res = await client.post(
                "https://api.ocr.space/parse/image",
                data=data_payload,
                files=files_payload
            )
            
            if ocr_res.status_code != 200:
                raise Exception(f"OCR service returned status {ocr_res.status_code}")
                
            ocr_data = ocr_res.json()
            if ocr_data.get("IsErroredOnProcessing"):
                raise Exception(ocr_data.get("ErrorMessage"))
                
            parsed_text = ocr_data.get("ParsedResults", [{}])[0].get("ParsedText")
            if not parsed_text or not parsed_text.strip():
                raise Exception("No text could be extracted from this document image.")
        
        # 2. Classify and structure the raw text using Groq Llama-3.3-70b
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
        
        prompt = (
            "You are a business document OCR analyzer. Classify the following raw OCR text extracted from a business document (receipt, invoice, product tag, expense voucher, customer list).\n\n"
            f"RAW OCR TEXT:\n{parsed_text}\n\n"
            "Identify whether this document contains data for a: 'product', 'customer', 'order', or 'expense'.\n"
            "Respond ONLY with a JSON object containing two keys: 'type' and 'data'. Do not output any markdown formatting, tags, or explanation.\n\n"
            "Follow these schemas for the 'data' field depending on the identified 'type':\n"
            "1. If type is 'product':\n"
            "   { \"name\": \"string\", \"sku\": \"string\", \"category\": \"string (e.g. Electronics, Clothing, Home & Garden, etc)\", \"price\": float, \"cost\": float, \"quantity\": int }\n\n"
            "2. If type is 'customer':\n"
            "   { \"name\": \"string\", \"email\": \"string\", \"phone\": \"string\", \"segment\": \"string (VIP, Regular, New, At Risk)\" }\n\n"
            "3. If type is 'expense':\n"
            "   { \"category\": \"string (e.g. Rent, Salaries, Marketing, Utilities, Supplies, Technology, Travel, Insurance, Miscellaneous)\", \"amount\": float, \"description\": \"string\", \"date\": \"string (YYYY-MM-DD)\" }\n\n"
            "4. If type is 'order':\n"
            "   { \"customer_name\": \"string\", \"products\": [ { \"product_name\": \"string\", \"quantity\": int, \"price\": float } ], \"total_amount\": float }\n\n"
            "If some fields are missing, supply a reasonable fallback based on context. Return ONLY valid JSON."
        )
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        # Parse the JSON response
        json_output = response.choices[0].message.content.strip()
        parsed_data = json.loads(json_output)
        return parsed_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to scan document: {str(e)}",
        )
