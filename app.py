from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import joblib
import math

app = Flask(__name__)
CORS(app)

# Load the trained model
modelDiag = joblib.load('dharmaDiag.joblib')
modelComp = joblib.load('dharmaComp.joblib')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get data from the frontend
        data = request.get_json()
        print("Received data:", data)
        df = pd.DataFrame(data, index=[0])
        print("DataFrame:", df)

        features_d = ['Nausea', 'Loss_of_Appetite', 'Peritonitis', 'WBC_Count', 'Neutrophil_Percentage', 'CRP', 'Ketones_in_Urine', 'Appendix_Diameter', 'Free_Fluids']
        features_c = ['Nausea', 'Loss_of_Appetite', 'Peritonitis', 'Ketones_in_Urine', 'Free_Fluids', 'CRP', 'WBC_Count', 'Body_Temperature', 'Appendix_Diameter']

        df_diag = df[features_d]
        df_comp = df[features_c]

        # Get the value for Appendix Diameter to set threshold
        appendix_diameter = df['Appendix_Diameter'].iloc[0]
        threshold_d = 64
        threshold_c = 55

        # Prediction for diagnosis
        prediction_prob_diag = modelDiag.predict_proba(df_diag)[:, 1]
        prob_diag = prediction_prob_diag[0]

        # Confidence interval for diagnosis
        n_diag = 624
        margin_of_error_diag = 1 / math.sqrt(n_diag)
        lower_d = max(0.0, prob_diag - margin_of_error_diag)
        upper_d = min(1.0, prob_diag + margin_of_error_diag)

        lower_d_percent = int(lower_d * 100)
        upper_d_percent = int(upper_d * 100)

        # Diagnosis prediction
        prediction_d = int(upper_d_percent >= threshold_d)

        if prediction_d == 1:
            prediction_prob_comp = modelComp.predict_proba(df_comp)[:, 1]
            prob_comp = prediction_prob_comp[0]

            # Confidence interval for complication
            n_comp = 538
            margin_of_error_comp = 1 / math.sqrt(n_comp)
            lower_c = max(0.0, prob_comp - margin_of_error_comp)
            upper_c = min(1.0, prob_comp + margin_of_error_comp)

            lower_c_percent = int(lower_c * 100)
            upper_c_percent = int(upper_c * 100)

            prediction_c = int(upper_c_percent >= threshold_c)

            return jsonify({
                'Dharma_Score': f'{lower_d_percent}% - {upper_d_percent}%',
                'probability_diag': round(prob_diag, 3),
                'probability_comp': round(prob_comp, 3),
                'messageDiag': 'High Likelihood of Acute appendicitis',
                'messageComp': 'High Risk of Complications' if prediction_c else 'Low Risk of Complications',
                'upper_c': upper_c_percent,
                'lower_c': lower_c_percent,
            })
        elif prediction_d==0 and appendix_diameter==0:
            threshold_d=30

            prediction_prob_comp = modelComp.predict_proba(df_comp)[:, 1]
            prob_comp = prediction_prob_comp[0]
            print("Probability of complication:", prob_comp)
            print("prediction_comp:", prediction_prob_comp)
             # Confidence interval for complication
            n_comp = 538
            margin_of_error_comp = 1 / math.sqrt(n_comp)
            lower_c = max(0.0, prob_comp - margin_of_error_comp)
            upper_c = min(1.0, prob_comp + margin_of_error_comp)

            lower_c_percent = int(lower_c * 100)
            upper_c_percent = int(upper_c * 100)

            prediction_c = int(upper_c_percent >= threshold_c)

            if upper_d_percent >= threshold_d:
                
                return jsonify({
                'Dharma_Score': f'{lower_d_percent}% - {upper_d_percent}%',
                'probability_diag': round(prob_diag, 3),
                'messageDiag': 'Possible Acute Appendicitis',
                'messageComp': 'High Risk of Complications' if prediction_c else 'Low Risk of Complications',
                'upper_c': None,
                'lower_c': None,
            }) 
            else:
                return jsonify({
                'Dharma_Score': f'{lower_d_percent}% - {upper_d_percent}%',
                'probability_diag': round(prob_diag, 3),
                'messageDiag': 'Low Likelihood of Acute Appendicitis',
                'upper_c': None,
                'lower_c': None,
            })
        else:
            return jsonify({
                'Dharma_Score': f'{lower_d_percent}% - {upper_d_percent}%',
                'probability_diag': round(prob_diag, 3),
                'messageDiag': 'Low Likelihood of Acute Appendicitis',
                'upper_c': None,
                'lower_c': None,
            })

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal error', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
