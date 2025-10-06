from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from typing import Optional
from utils.helper import shap_explanation, CI95
from utils.notes import interpret

app = FastAPI(title="DharmaAPI")

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# CORS settings
origins = [
    "http://localhost",
    "http://localhost:8000",
    "https://dharma-ai.org",  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input schema
class PatientData(BaseModel):
    Nausea: int
    Loss_of_Appetite: int
    Peritonitis: int
    WBC_Count: float
    Neutrophil_Percentage: float
    CRP: Optional[float] = None
    Ketones_in_Urine: Optional[float] = None
    Appendix_Diameter: Optional[float] = None
    Free_Fluids: Optional[int] = None
    Body_Temperature: float


# Load models
Dharma = joblib.load("models/model_Dharma.joblib")
model_comp = joblib.load("models/dharma_comp.joblib")
imputer = joblib.load("models/imputer_model.joblib")


@app.post("/predict")
async def predict(data: PatientData):
    try:
        # Convert input into DataFrame
        df = pd.DataFrame([data.dict()])
        df = df.replace({None: np.nan})
        
        columns= ['Nausea', 'Loss_of_Appetite', 'Peritonitis', 'WBC_Count', 'Neutrophil_Percentage', 'CRP', 'Ketones_in_Urine', 'Appendix_Diameter', 'Free_Fluids', 'Body_Temperature','Appendix_Diameter_flag']

        # Extract steps from pipeline
        model_diag = Dharma.named_steps['model']

        # Impute missing values
        x_imputed = imputer.transform(df)

        # Create imputed DataFrame with original column names
        x_imputed_df = pd.DataFrame(x_imputed, columns=columns)

        # Subsets for diagnosis and complication models
        x_imputed_diag_df = x_imputed_df[model_diag.feature_names_in_]
        x_imputed_comp_df = x_imputed_df[model_comp.feature_names_in_]

        # Predictions
        pred_diag = model_diag.predict_proba(x_imputed_diag_df)[0][1]
        pred_comp = model_comp.predict_proba(x_imputed_comp_df)[0][1]

        # SHAP explanations
        shap_diag, base_diag = shap_explanation(model_diag, x_imputed_diag_df)
        shap_comp, base_comp = shap_explanation(model_comp, x_imputed_comp_df)

        # Confidence intervals
        upper_ci_diag, lower_ci_diag = CI95(model_diag, x_imputed_diag_df)
        upper_ci_comp, lower_ci_comp = CI95(model_comp, x_imputed_comp_df)

        # Interpret results
        flag = x_imputed_diag_df['Appendix_Diameter_flag'].values[0]
        result_diag, note_diag = interpret(flag, upper_ci_diag, lower_ci_diag, task='diagnosis')
        result_comp, note_comp = interpret(flag, upper_ci_comp, lower_ci_comp, task='complication')

        # Return formatted result
        return {
            "diagnosis": {
                "probability": round(pred_diag * 100, 2),
                "confidence_interval": [
                    round(lower_ci_diag * 100, 2),
                    round(upper_ci_diag * 100, 2),
                ],
                "result": result_diag,
                "note": note_diag,
                "shap_values": shap_diag.round(4).tolist(),
                "base_value": round(base_diag, 4),
            },
            "complication": {
                "probability": round(pred_comp * 100, 2),
                "confidence_interval": [
                    round(lower_ci_comp * 100, 2),
                    round(upper_ci_comp * 100, 2),
                ],
                "result": result_comp,
                "note": note_comp,
                "shap_values": shap_comp.round(4).tolist(),
                "base_value": round(base_comp, 4),
            },
        }

    except Exception as e:
        print("Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
