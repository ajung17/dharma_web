from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from utils.helper import shap_explanation, CI95

app= FastAPI(title="DharmaAPI")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")
@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

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

class PatientData(BaseModel):
    Nausea:int
    Loss_of_Appetite: int
    Peritonitis: int
    WBC_Count: float 
    Neutrophil_Percentage: float 
    CRP: float 
    Ketones_in_Urine: int
    Appendix_Diameter: float 
    Free_Fluids: int
    Body_Temperature: float 


Dharma = joblib.load("model_Dharma.joblib")
model_comp = joblib.load("dharma_comp.joblib")

@app.post("/predict")

async def predict(data: PatientData):
    try:

        df = pd.DataFrame([data.dict()])
        x = df.iloc[[0]].to_numpy()

        imputer = Dharma.named_steps['imputer']
        model_diag = Dharma.named_steps['model']

        x_imputed = imputer.transform(x)

        x_imputed_df = pd.DataFrame(x_imputed, columns=df.columns)

        x_imputed_diag = x_imputed_df[model_diag.feature_names_in_]
        x_imputed_comp = x_imputed_df[model_comp.feature_names_in_]

        pred_diag = model_diag.predict_proba(x_imputed_diag)[0][1]
        pred_comp = model_comp.predict_proba(x_imputed_comp)[0][1]

        shap_diag, base_diag = shap_explanation(model_diag, x_imputed_diag)
        shap_comp, base_comp = shap_explanation(model_comp, x_imputed_comp)

        upper_ci_diag, lower_ci_diag = CI95(model_diag, x_imputed_diag)
        upper_ci_comp, lower_ci_comp = CI95(model_comp, x_imputed_comp)

        return {
            "diagnosis": {
                "probability": round(pred_diag * 100, 2),
                "confidence_interval": [round(lower_ci_diag * 100, 2), round(upper_ci_diag * 100, 2)],
                "shap_values": shap_diag.round(4).tolist(),
                "base_value": round(base_diag, 4)
            },
            "complication": {
                "probability": round(pred_comp * 100, 2),
                "confidence_interval": [round(lower_ci_comp * 100, 2), round(upper_ci_comp * 100, 2)],
                "shap_values": shap_comp.round(4).tolist(),
                "base_value": round(base_comp, 4)
            }
        }


    except Exception as e:
        print("Error:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")
    



