$(document).ready(function () {
  // Info button modal functionality
  const docModal = document.getElementById("docModal");
  const infoBtn = document.getElementById("infoButton");
  const docCloseBtn = docModal.getElementsByClassName("close-modal")[0];

  // Explanation modal functionality
  const explainModal = document.getElementById("explainModal");
  const explainBtn = document.getElementById("explainButton");
  const explainCloseBtn = explainModal.getElementsByClassName("close-modal")[0];

  // Open documentation modal
  infoBtn.onclick = function () {
    docModal.style.display = "block";
  };

  // Close documentation modal
  docCloseBtn.onclick = function () {
    docModal.style.display = "none";
  };

  // Open explanation modal
  explainBtn.onclick = function () {
    explainModal.style.display = "block";
  };

  // Close explanation modal
  explainCloseBtn.onclick = function () {
    explainModal.style.display = "none";
  };

  // Close modals when clicking outside
  window.onclick = function (event) {
    if (event.target == docModal) {
      docModal.style.display = "none";
    }
    if (event.target == explainModal) {
      explainModal.style.display = "none";
    }
  };

  // Form submission handler
  $("#prediction-form").on("submit", function (event) {
    event.preventDefault(); // Prevent page reload

    const action = $(document.activeElement).val(); // Get the value of the clicked submit button

    const formData = {
      Nausea: parseInt($("#Nausea").val()),
      Loss_of_Appetite: parseInt($("#Loss_of_Appetite").val()),
      Peritonitis: parseInt($("#Peritonitis").val()),
      WBC_Count: parseFloat($("#WBC_Count").val()),
      Body_Temperature: parseFloat($("#Body_Temperature").val()),
      Neutrophil_Percentage: parseFloat($("#Neutrophil_Percentage").val()),
      CRP: parseFloat($("#CRP").val()),
      Ketones_in_Urine: parseInt($("#Ketones_in_Urine").val()),
      Appendix_Diameter: parseFloat($("#Appendix_Diameter").val()),
      Free_Fluids: parseInt($("#Free_Fluids").val()),
    };
    const url =
      action === "predict"
        ? "http://127.0.0.1:8000/predict"
        : "http://127.0.0.1:8000/explanation";

    $.ajax({
      url: url,
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(formData),
      success: function (response) {
        console.log("Server response for", action, ":", response); // Log for debugging

        if (action === "predict") {
          const diagnosis = response.diagnosis;
          const complication = response.complication;

          const upper_ci_diag = diagnosis.confidence_interval[1]; // upper bound
          const threshold_diag = diagnosis.threshold_used;

          // Build the diagnosis HTML
          let html = `
        <div class="result-row">
            <strong class="highlighted-score">
              <span class="result-label">Dharma Score:</span>
              <span class="result-value score-value">${Math.round(
                diagnosis.dharma_score
              )}%</span>
            </strong>
          </div>
            <div class="result-row">
                <span class="result-value ${
                  diagnosis.prediction.includes("High") ? "high-risk" : ""
                }">
                    ${diagnosis.prediction}
                </span>
            </div>
  
            <div class="result-row">
                <span class="result-label">95% Confidence Interval:</span>
                <span class="result-value">${Math.round(
                  diagnosis.confidence_interval[0]
                )}% - ${Math.round(diagnosis.confidence_interval[1])}%</span>
            </div>
            <div class="result-row">
                <span class="result-label">Threshold:</span>
                <span class="result-value">${Math.round(
                  diagnosis.threshold_used
                )}%</span>
            </div>
            <div class="result-row">
                <span class="result-label">Diagnostic Certainty:</span>
                <span class="result-value certainty-${diagnosis.diagnostic_certainty
                  .toLowerCase()
                  .replace(" ", "-")}">
                    ${diagnosis.diagnostic_certainty}
                </span>
            </div>
            <div class="clinical-note">
                Clinical Note: ${diagnosis.note}
            </div>
        </div>`;

          // Only add the complication section if upper_ci_diag > threshold_diag
          if (upper_ci_diag > threshold_diag) {
            html += `
            <br>
            <h4>Severity Assessment:</h4>
        <div class="result-section complication-section">
            <div class="result-row">
                <span class="result-label">Risk of Complications:</span>
                <span class="result-value ${
                  complication.probability > 50 ? "high-risk" : "low-risk"
                }">
                    ${Math.round(complication.probability)}%
                </span>
            </div>
            <div class="result-row">
                <span class="result-label">95% Confidence Interval:</span>
                <span class="result-value">${Math.round(
                  complication.confidence_interval[0]
                )}% - ${Math.round(complication.confidence_interval[1])}%</span>
            </div>
            <div class="clinical-note">
                ${complication.note}
            </div>
        </div>`;
          }
          html += `</div>`; // close result-container

          $("#result").show().html(html);
          $("#explainButton").removeClass("hidden");
        } else if (action === "explaination") {
          renderShapTables(response.shap_values);
        }
      },
      error: function (xhr, status, error) {
        console.error("Error:", error);
        $("#result").show().html(`<p style="color:red;">Error: ${error}</p>`);
      },
    });
  });
});

// Function to render SHAP tables in the explanation modal
function renderShapTables(shapValues) {
  let html = '<div class="shap-tables-container">';

  for (const type of ["diagnosis", "complication"]) {
    const data = shapValues[type];
    let baseValue = null;
    let result = null;
    const features = [];

    // Separate base value, result, and features
    for (const item of data) {
      if (item.Feature === "Base Value") {
        baseValue = item["SHAP value"];
      } else if (item.Feature === "Result") {
        result = item["SHAP value"];
      } else {
        features.push(item);
      }
    }

    // Build HTML for each table
    html += `<div class="shap-table-wrapper">`;
    html += `<h3>${
      type.charAt(0).toUpperCase() + type.slice(1)
    } Explanation</h3>`;
    const resultClass = result > 0 ? "positive" : "negative";
    html += `<p class="base-value-row">
  <span class="base-value-label"><strong>Base Value:</strong></span>
  <span class="base-value-number">${baseValue.toFixed(2)}</span>
</p>`;
    html += '<table class="table table-striped">';
    html += "<thead><tr><th>Feature</th><th>SHAP Value</th></tr></thead>";
    html += "<tbody>";

    for (const feature of features) {
      const shapValue = feature["SHAP value"];
      const valueClass = shapValue > 0 ? "positive" : "negative";
      html += `<tr><td>${
        feature.Feature
      }</td><td class="${valueClass}">${shapValue.toFixed(4)}</td></tr>`;
    }

    // Determine class for final prediction
    html += `<tr "><td "><strong>Final Prediction</strong></td><td class="final-prediction">${result.toFixed(
      2
    )}</td></tr>`;

    html += "</tbody></table>";
    html += "</div>";
  }

  html += "</div>";
  $("#explainResult").html(html);
  $("#explainModal").show(); // Show the explanation modal
}

// Clear default value function
function clearDefaultValue(input) {
  if (input.dataset.cleared !== "true") {
    input.dataset.cleared = "true";
    input.value = "";
  }
}
$(document).ready(function () {
  $(".section-btn").on("click", function () {
    // Remove active from all buttons
    $(".section-btn").removeClass("active");

    // Add active to clicked button
    $(this).addClass("active");

    // Get the section to show
    const sectionToShow = $(this).data("section");

    // Hide all sections
    $(".section-content").hide();

    // Show selected section
    $("#" + sectionToShow).show();
  });
});
