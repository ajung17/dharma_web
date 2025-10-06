
import pandas as pd
from sklearn.experimental import enable_iterative_imputer 
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.impute import IterativeImputer
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.impute import SimpleImputer
import logging

logging.basicConfig(
    level=logging.INFO,  
    format="%(asctime)s — %(levelname)s — %(message)s"
)

class Dharma_Imputer(BaseEstimator, TransformerMixin):
    def __init__(self):

        self.placeholder = -1
        self.feat_flag = ['Appendix_Diameter'] 
        self.feat_continuous = ['WBC_Count', 'Neutrophil_Percentage', 'CRP', 'Body_Temperature']
        self.feat_categorical = ['Nausea', 'Loss_of_Appetite', 'Peritonitis',
                             'Ketones_in_Urine', 'Free_Fluids']
        self.feat_model = ['Nausea', 'Loss_of_Appetite', 'Peritonitis', 'WBC_Count', 'Neutrophil_Percentage', 'CRP', 'Ketones_in_Urine', 'Appendix_Diameter', 'Free_Fluids', 'Body_Temperature']
        self.dtc={}
        
        self.imputer_continuous = IterativeImputer(
            max_iter=55,
            random_state=17,
            estimator=DecisionTreeRegressor(max_depth=7),
            skip_complete=True,
            initial_strategy='mean'             
        )   

        self.imputer_categorical = DecisionTreeClassifier(max_depth=7, random_state=17) 

    def fit(self, x, y=None):

        x_copy = x.copy().reindex(columns=self.feat_model)

        x_copy['Appendix_Diameter_flag'] = x_copy['Appendix_Diameter'].isna().astype(int)
        x_copy['Appendix_Diameter'] = x_copy['Appendix_Diameter'].fillna(self.placeholder)

        self.imputer_continuous.fit(x_copy[self.feat_continuous])
        x_copy[self.feat_continuous] = self.imputer_continuous.transform(x_copy[self.feat_continuous])

        for col in self.feat_categorical:
            x_train = x_copy[x_copy[col].notna()].drop(columns=[col])
            y_train = x_copy.loc[x_copy[col].notna(), col]

            model_simple=SimpleImputer(strategy='most_frequent')
            model = DecisionTreeClassifier(max_depth=7, random_state=17)

            x_train = pd.DataFrame(model_simple.fit_transform(x_train), columns=x_train.columns)

            model.fit(x_train, y_train)
            self.dtc[col] = model

        return self
               
    def transform(self, x, y=None):
        x_copy = x.copy().reindex(columns=self.feat_model)
        x_copy[self.feat_continuous] = self.imputer_continuous.transform(x_copy[self.feat_continuous])

        x_copy['Appendix_Diameter_flag'] = x_copy['Appendix_Diameter'].isna().astype(int)
        x_copy['Appendix_Diameter'] = x_copy['Appendix_Diameter'].fillna(self.placeholder)

        for col in self.feat_categorical:
            model = self.dtc[col]
            missing_mask = x_copy[col].isna()
            if missing_mask.any():
                to_predict = x_copy.loc[missing_mask].drop(columns=[col])
                x_copy.loc[missing_mask, col] = model.predict(to_predict)
        
        
        return x_copy
