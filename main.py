from sklearn.ensemble import RandomForestClassifier
from fastapi import FastAPI, HTTPException,Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,Field
from joblib import load
import numpy as np
import pandas as pd
from typing import Literal,Annotated
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
import shap
from functools import lru_cache
from fastapi import Request
from fastapi.responses import JSONResponse

# Initialization of FastAPI
app= FastAPI(title="Dharma:Pediatric Appendicitis Model API")

# Root endpoint
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")
@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# CORS Middleware
origins=[]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Checking for data correctness
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

# Load the trained models
dharmaDiag = load("DharmaDiag.joblib")
dharmaComp = load("DharmaComp.joblib")


# Cache the SHAP explainers
@lru_cache(maxsize=1)
def explainer_diag():
    return shap.TreeExplainer(dharmaDiag)

@lru_cache(maxsize=1)
def explainer_comp():
    return shap.TreeExplainer(dharmaComp)

# Function for percentile based CI
def CI95(model,x_predict):
    
    tree_preds=np.array([tree.predict_proba(x_predict)[0, 1] for tree in model.estimators_]).flatten()
    mean_prob=np.mean(tree_preds)
    print("Mean Probability:", mean_prob)
    print("Standard Deviation of Probability:", np.std(tree_preds,ddof=1))
    std_prob=np.std(tree_preds,ddof=1)
    se=std_prob/np.sqrt(555)
    lower_ci=max(0,mean_prob-1.96*se)
    upper_ci=min(1,mean_prob+1.96*se)
    

  
   
    return(lower_ci,upper_ci)

# Prediction end-point
@app.post("/predict")
# async def predict(request: Request):
#     try:
#         data = await request.json()
#         print("🔵 Received Payload:", data)
#         df=pd.DataFrame([data])
#         print("🔵 DataFrame Created:", df)
    

async def predict(data: PatientData):
    try:
       # Conversion of input to DataFrame
        df = pd.DataFrame([data.dict()])
        print("🔵 Received Payload:", df)

        # Defining of feature sets
        features_diag = ['Nausea', 'Loss_of_Appetite', 'Peritonitis', 'WBC_Count', 
                         'Neutrophil_Percentage', 'CRP', 'Ketones_in_Urine', 
                         'Appendix_Diameter', 'Free_Fluids']
        features_comp = ['Nausea', 'Loss_of_Appetite', 'Peritonitis', 'Ketones_in_Urine', 
                         'Free_Fluids', 'CRP', 'WBC_Count', 'Body_Temperature', 
                         'Appendix_Diameter']

        # Feature extraction
        df_diag = df[features_diag]
        df_comp = df[features_comp]
        x_diag = df_diag.iloc[[0]].to_numpy()
        x_comp = df_comp.iloc[[0]].to_numpy()
        print("df_diag shape:", df_diag)
        print("df_comp shape:", df_comp.shape)
        print("x_diag shape:", x_diag)
        print(f"dharmaDiag estimators: {len(dharmaDiag.estimators_)}")
        print(f"dharmaComp estimators: {len(dharmaComp.estimators_)}")


        # Threshold determination
        appendix_diameter = df['Appendix_Diameter'].iloc[0]
        threshold_diag = 0.64 if appendix_diameter != 0 else 0.3
        threshold_comp = 0.52  # 52% for complication prediction

        # Predictions
        prob_diag = dharmaDiag.predict_proba(df_diag)[0, 1]  # Probability of appendicitis
        prob_comp = dharmaComp.predict_proba(df_comp)[0, 1]  # Probability of complication
      
        # Calculation of 95% confidence intervals
        lower_ci_diag, upper_ci_diag = CI95(dharmaDiag, x_diag)
        lower_ci_comp, upper_ci_comp = CI95(dharmaComp, x_comp)

        

        # Certainty assessment based on CI width
        ci_width_diag = upper_ci_diag - lower_ci_diag
        

        # Diagnostic certainty based on CI
        diag_note = ""
        comp_note=""
        if appendix_diameter !=0:
            if lower_ci_diag >= 0.64:
                diag_certainty = "High confidence"
                pred_diag="High likelihood of acute appendicitis."
                diag_note="Manage in line with appendicitis protocol." 
            # Check if the lower CI is close to the threshold
                if lower_ci_diag - 0.64 < 0.01:  
                    diag_note = "Close to threshold, consider clinical correlation."
        # Check if the upper CI is close to the threshold
            elif upper_ci_diag < 0.64:
                diag_certainty = "High confidence"
                pred_diag="Low likelihood of acute appendicitis."
                diag_note="Explore alternative diagnoses."
                # Check if the upper CI is close to the threshold
                if 0.64 - upper_ci_diag < 0.01:  
                    diag_note = "Close to threshold, consider clinical correlation."
        # Check if the CI width is small
            elif ci_width_diag <= 0.1:
                diag_certainty = "Stable prediction"
                pred_diag="Possible acute appendicitis."
                diag_note="Consider clinical correlation."
        # If the CI width is large
            elif ci_width_diag>0.1:
                pred_diag="Possible acute appendicitis."
                diag_certainty = "Unstable prediction"
                diag_note="Consider CECT/MRI-Abdomen for confirmation."
        # If appendix diameter is zero        
        else:
            if lower_ci_diag >= 0.47:
                diag_certainty = "High confidence"
                pred_diag="High likelihood of acute appendicitis."
                diag_note="Manage in line with appendicitis protocol." 
                if lower_ci_diag - 0.47 < 0.01:  
                    diag_note = "Close to threshold, consider clinical correlation."
            elif upper_ci_diag <0.3:
                diag_certainty = "High confidence"
                pred_diag="Low likelihood of acute appendicitis."
                diag_note="Explore alternative diagnoses."
                if 0.3 - upper_ci_diag < 0.01:  
                    diag_note = "Close to threshold, consider clinical correlation."
            elif lower_ci_diag >=0.37:
                diag_certainty = "Moderate confidence"
                pred_diag="Probable acute appendicitis."
                diag_note="Consider pediatric surgery evalutation and serial physical examinations."
            else:
                diag_certainty = "Low confidence"
                pred_diag="Uncertain diagnosis, further evaluation needed."
                diag_note="If ultrasound is inconclusive, consider CECT/MRI for further evaluation."
        # Prognostic certainty based on CI
        comp_note = ""
        if lower_ci_comp >= threshold_comp:
            comp_note = "High Risk of Complications"
        elif upper_ci_comp <= threshold_comp:
            comp_note = "Low Risk of Complications"
        else:
            comp_note = "Moderate Uncertainty, Anticipate possible complications."
          # Construct response
        response = {
            "diagnosis": {
                "dharma_score": round(prob_diag * 100, 2),
                "confidence_interval": [round(lower_ci_diag * 100, 2), round(upper_ci_diag * 100, 2)],
                "prediction": pred_diag,
                "threshold_used": round(threshold_diag * 100, 2),
                "diagnostic_certainty": diag_certainty,
                "note": diag_note
            },
            "complication": {
                "probability": round(prob_comp * 100, 2),
                "confidence_interval": [round(lower_ci_comp * 100, 2), round(upper_ci_comp * 100, 2)],
                "note": comp_note,
                "threshold": threshold_comp
            }
        }

        return response
    except Exception as e:
        print("Error:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
# SHAP values endpoint
@app.post("/explanation")
# async def get_explanation(request: Request):
#     print("🔵 SHAP values endpoint called")
#     # Your logic here
#     return {"message": "Explanation generated"}
async def explanation(data: PatientData):
    try:
        # Conversion of input to DataFrame
        df = pd.DataFrame([data.dict()])

        # Defining of feature sets
        features_diag = ['Nausea', 'Loss_of_Appetite', 'Peritonitis', 'WBC_Count', 
                         'Neutrophil_Percentage', 'CRP', 'Ketones_in_Urine', 
                         'Appendix_Diameter', 'Free_Fluids']
        features_comp = ['Nausea', 'Loss_of_Appetite', 'Peritonitis', 'Ketones_in_Urine', 
                         'Free_Fluids', 'CRP', 'WBC_Count', 'Body_Temperature', 
                         'Appendix_Diameter']

        # Feature extraction
        df_diag = df[features_diag]
        df_comp = df[features_comp]

        # SHAP values calculation
        shap_values_diag = explainer_diag().shap_values(df_diag)
        shap_values_comp = explainer_comp().shap_values(df_comp)
       
        shap_diag_positive = shap_values_diag[0, :, 1] 
        shap_comp_positive = shap_values_comp[0, :, 1]
  
        base_value_diag = explainer_diag().expected_value[1]
        base_value_comp = explainer_comp().expected_value[1]

        # Convert SHAP values to DataFrame for better readability
        shap_df_diag = pd.DataFrame(shap_diag_positive, index=features_diag, columns=['SHAP value'])
        shap_df_comp = pd.DataFrame(shap_comp_positive, index=features_comp, columns=['SHAP value'])    
        shap_df_diag = shap_df_diag.sort_values("SHAP value", ascending=False)
        shap_df_comp = shap_df_comp.sort_values("SHAP value", ascending=False)
        # Add base values to the DataFrame
        shap_df_diag.loc["Base Value"] = [base_value_diag]
        shap_df_comp.loc["Base Value"] = [base_value_comp]
        shap_df_diag.loc['Result']= [shap_df_diag["SHAP value"].sum()]
        shap_df_comp.loc['Result']= [shap_df_comp["SHAP value"].sum()]
        shap_df_diag['Feature'] = shap_df_diag.index
        shap_df_comp['Feature'] = shap_df_comp.index

        shap_df_diag = shap_df_diag.reset_index(drop=True)
        shap_df_comp = shap_df_comp.reset_index(drop=True)
        shap_df_diag = shap_df_diag[['Feature', 'SHAP value']]
        shap_df_comp = shap_df_comp[['Feature', 'SHAP value']]
        json_diag = shap_df_diag.to_dict(orient="records")
        json_comp = shap_df_comp.to_dict(orient="records")
        

        return {
            "shap_values": {
                "diagnosis": json_diag,
                "complication": json_comp
                
            }
        }
    except Exception as e:
        print("Error:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")
