
import sys
import os
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import pandas as pd
from utils.imputer import Dharma_Imputer
import joblib


df = pd.read_excel('dataset_combined.xlsx')
columns= ['Nausea', 'Loss_of_Appetite', 'Peritonitis', 'WBC_Count', 'Neutrophil_Percentage', 'CRP', 'Ketones_in_Urine', 'Appendix_Diameter', 'Free_Fluids', 'Body_Temperature']

df = df[columns]

imputer = Dharma_Imputer()

imputer.fit(df)

joblib.dump(imputer, '../models/imputer_model.joblib')




# x_imputed = imputer.transform(df)

# x_imputed.to_excel('imputed_dataset.xlsx', index=False)