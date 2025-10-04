
import sys
import os
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import pandas as pd
from utils.imputer import Dharma_Imputer

df = pd.read_excel('dataset_combined.xlsx')
imputer = Dharma_Imputer()

imputer.fit(df)

x_imputed = imputer.transform(df)

x_imputed.to_excel('imputed_dataset.xlsx', index=False)