

def interpret (flag, upper_ci, lower_ci, task):
    result = ""
    note = ""

    if task == 'diagnosis':

        if flag == 0:
            if lower_ci >= 0.5:
                if lower_ci - 0.5 < 0.01:
                    result = "High likelihood of acute appendicitis."
                    note = "Close to threshold, further evaluation is recommended."
                else:
                    result = "Very high likelihood of acute appendicitis."
                    note = "Management in line with acute appendicitis is recommended."
            elif upper_ci <= 0.5:
                if 0.5 - upper_ci < 0.01:
                    result = "Low likelihood of acute appendicitis."
                    note = "Close to threshold, further evaluation is recommended."
                else:
                    result = "Very low likelihood of acute appendicitis."
                    note = "Exploration of alternative diagnoses is recommended."
            else:
                result = "Uncertain diagnosis."
                note = "Close monitoring with serial examination is recommended."

        else:
            if lower_ci >= 0.44:
                if lower_ci - 0.44 < 0.01:
                    result = "High likelihood of acute appendicitis."
                    note = "Close to threshold, further evaluation is recommended."
                else:
                    result = "Very high likelihood of acute appendicitis."
                    note = "Management in line with acute appendicitis is recommended."
            elif upper_ci <= 0.25:
                if 0.25 - upper_ci < 0.01:
                    result = "Low likelihood of acute appendicitis."
                    note = "Close to threshold, further evaluation is recommended."
                else:
                        result = "Very low likelihood of acute appendicitis."
                        note = "Exploration of alternative diagnoses is recommended."
            else:
                result = "Uncertain diagnosis."
                note = "Close monitoring with serial examination and imaging studies is recommended."

    else:
        if upper_ci<= 0.44:
            result = "Low likelihood of developing complications."
            note = "Conservative management can be considered."
        else:
            result = "Likelihood of developing complications."
            note = "Close monitoring and preparedness for surgical intervention is recommended."

    return result, note

