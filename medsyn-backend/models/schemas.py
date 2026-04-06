from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class StepType(str, Enum):
    STEP = "step"
    TOOL = "tool"
    DATA = "data"
    SECTION = "section"
    DONE = "done"
    ERROR = "error"

class SSEEvent(BaseModel):
    type: StepType
    message: str
    data: Optional[dict] = None

class Diagnosis(BaseModel):
    rank: int
    name: str
    confidence: float
    orpha_code: Optional[str] = None
    orphanet_url: Optional[str] = None
    icd11_code: Optional[str] = None
    reasoning: str
    regional_prevalence: Optional[str] = None

class Evidence(BaseModel):
    pmid: str
    title: str
    authors: str
    journal: str
    year: int
    url: str
    relevance_note: str = ""

class ActionPlan(BaseModel):
    tests_to_order: List[str]
    specialists_to_consult: List[str]
    hypotheses_to_rule_out: List[str]

class ClinicalReport(BaseModel):
    patient_summary: str
    detected_language: str
    differentials: List[Diagnosis]
    evidence: List[Evidence]
    action_plan: ActionPlan
    who_context: Optional[str] = None
    disclaimer: str = "This report is clinical decision support only. Final diagnosis must be made by a licensed physician."
