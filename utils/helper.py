
import numpy as np
import shap


def CI95(model, x_predict):

    tree_preds = np.array([tree.predict_proba(x_predict)[0, 1] for tree in model.estimators_])
    mean_prob = np.mean(tree_preds)
    std_prob = np.std(tree_preds, ddof=1)
    n_trees = len(model.estimators_)
    se = std_prob / np.sqrt(n_trees)
    lower_ci = max(0, mean_prob - 1.96 * se)
    upper_ci = min(1, mean_prob + 1.96 * se)

    return upper_ci, lower_ci



def shap_explanation(model, x_predict):

    explainer = shap.TreeExplainer(model)

    shap_values = explainer.shap_values(x_predict)
    shap_values_1 = shap_values[0, :, 1]

    base_value = explainer.expected_value[1]

    return shap_values_1, base_value



