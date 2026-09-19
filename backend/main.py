import os
import io
import json

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from google import genai
from pydantic import BaseModel
from typing import List
from google.genai import types
class Party(BaseModel):
    name: str
    role: str


class Obligation(BaseModel):
    party: str
    obligation: str
    evidence: str


class Risk(BaseModel):
    severity: str
    title: str
    risk: str
    evidence: str


class ImportantDate(BaseModel):
    event: str
    date: str


class PaymentDetails(BaseModel):
    status: str
    amount: str
    currency: str
    frequency: str
    due_date: str
    payment_terms: str


class ContractAnalysis(BaseModel):
    summary: str
    contract_type: str
    company: str
    job_role: str
    parties: List[Party]
    obligations: List[Obligation]
    risks: List[Risk]
    important_dates: List[ImportantDate]
    payment_details: PaymentDetails

# ============================================================
# APP SETUP
# ============================================================

app = FastAPI(title="ContractLens API")


# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://contractlens-tau.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# GEMINI SETUP
# ============================================================

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not set.")

client = genai.Client(api_key=api_key)


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "ContractLens AI is running 🚀"
    }


# ============================================================
# UPLOAD + ANALYZE CONTRACT
# ============================================================

@app.post("/upload-contract")
async def upload_contract(file: UploadFile = File(...)):

    # --------------------------------------------------------
    # CHECK FILE
    # --------------------------------------------------------

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file."
        )

    try:

        # ----------------------------------------------------
        # READ PDF
        # ----------------------------------------------------

        file_content = await file.read()

        pdf = PdfReader(io.BytesIO(file_content))

        text = ""

        for page in pdf.pages:
            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from this PDF."
            )

        # ----------------------------------------------------
        prompt = f"""
You are ContractLens, an AI business contract analysis agent.

Analyze ONLY the contract text provided below.

Your job is to extract accurate factual information from the contract and organize it into the required structured format.

STRICT RULES:

1. NEVER invent information.
2. NEVER guess a company, person, job role, date, amount, obligation, or risk.
3. If information is not explicitly stated, return "Not specified".
4. Preserve names, company names, dates, amounts, and contract wording accurately.
5. The job_role MUST come directly from the contract.
6. If the contract only says "internship position" and gives no specific title, return exactly "Internship position".
7. Do NOT change a generic internship into "Software Developer", "AI Engineer", "Web Developer", or any other invented role.
8. Do NOT confuse a person's name with a company or organization.
9. Identify every party and their actual role or capacity in the contract.
10. Every obligation MUST be assigned to the correct party.
11. Every obligation MUST include short evidence from the contract.
12. Every risk MUST be based on an actual clause, term, or condition in the contract.
13. Do NOT create a risk simply because something is unusual.
14. Every risk MUST include evidence from the contract.
15. Extract ALL explicitly stated important dates.
16. Extract payment information only when it is stated in the contract.
17. If the contract is unpaid, set payment status to "Unpaid".
18. If payment information is absent, use "Not specified".
19. Do not use Markdown.
20. Return information matching the required structured schema.
21. Identify the type of contract based only on the contract text.
22. Examples include Internship Agreement, Employment Agreement, NDA, Service Agreement, Vendor Agreement, Consulting Agreement, Lease Agreement, or other clearly stated contract types.
23. If the contract type cannot be determined from the text, return "Not specified".
24. Never invent a contract type.

CONTRACT TYPE:

Identify what type of agreement or contract this document is.

Use the clearest type supported by the contract.
For example:
- Internship Agreement
- Employment Agreement
- Non-Disclosure Agreement
- Service Agreement
- Vendor Agreement
- Consulting Agreement

If the type is not clear from the contract, return "Not specified".

JOB ROLE:

Look specifically for:
- job title
- position
- role
- internship position
- designation
- employee position
- consultant role
- contractor role

Use the role actually stated in the contract.

OBLIGATIONS:

For every obligation provide:
- party responsible
- specific obligation
- short evidence from the contract

RISKS:

For every genuine contract risk provide:
- severity
- short title
- explanation of the risk
- evidence from the contract

Do not automatically mark every contract term as HIGH risk.

IMPORTANT DATES:

Extract dates such as:
- signing date
- start date
- end date
- deadline
- payment due date
- renewal date
- termination notice date
- expiry date

PAYMENT:

Analyze the contract carefully for compensation, salary, fees, stipend, wages, reimbursements, or other monetary payments.

Return:
- status
- amount
- currency
- frequency
- due_date
- payment_terms

PAYMENT RULES:

1. If the contract explicitly says the work/internship is unpaid or that no financial compensation will be provided:
   - status = "Unpaid"
   - amount = "Not applicable"
   - currency = "Not applicable"
   - frequency = "Not applicable"
   - due_date = "Not applicable"
   - payment_terms = "No financial compensation stated"

2. If the contract specifies a payment:
   - status = "Paid"
   - extract the exact amount
   - extract the currency
   - extract the payment frequency
   - extract the due date if stated
   - extract the payment terms if stated

3. If the contract contains no payment information at all:
   - status = "Not specified"
   - amount = "Not specified"
   - currency = "Not specified"
   - frequency = "Not specified"
   - due_date = "Not specified"
   - payment_terms = "Not specified"

4. NEVER invent a payment amount, currency, frequency, or due date.

5. Do not treat an unpaid contract as a paid contract.

Use the exact information stated in the contract.

CONTRACT TEXT:

{text[:20000]}
"""

        # ----------------------------------------------------
        # GEMINI AI CALL
        # ----------------------------------------------------

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ContractAnalysis,
                temperature=0.1
            )
        )

        # ----------------------------------------------------
        # CONVERT STRUCTURED GEMINI RESPONSE
        analysis = ContractAnalysis.model_validate_json(response.text)

        # RETURN RESULT
        return {
            "analysis": analysis.model_dump()
        }

    except HTTPException:
        raise

    except Exception as e:

        print("ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Contract analysis failed: {str(e)}"
        )