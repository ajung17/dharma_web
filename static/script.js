let predictionData = null;
let explanationData = null;
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
          predictionData = response;
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
          explanationData = response;
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
  $("#explainResult").append(`
      <div class="text-center mt-4">
        <button id="downloadReport" class="download-btn">Download Full Report</button>
      </div>
    `);

  $("#downloadReport").on("click", downloadReport);
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
// Add this new function outside document.ready
function downloadReport() {
  if (!predictionData) {
    alert("Please make a prediction first before downloading the report.");
    return;
  }

  // Create a formatted date string
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Extract diagnosis and complication data
  const diag = predictionData.diagnosis;
  const comp = predictionData.complication;

  // Create HTML content for the report
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>  
      <title>Dharma AI</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #0066cc;
          padding-bottom: 10px;
        }
        .header h1 {
          color: #0066cc;
          margin-bottom: 5px;
        }
        .patient-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          color: #0066cc;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .result-box {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
          margin-bottom: 15px;
          background-color: #f9f9f9;
        }
        .highlight {
          font-weight: bold;
          color: #0066cc;
        }
        .high-risk {
          color: #d9534f;
          font-weight: bold;
        }
        .low-risk {
          color: #5cb85c;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        .positive {
          color: #d9534f;
        }
        .negative {
          color: #5cb85c;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 0.9em;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Dharma: Appendicitis Model</h1>
        <p>Generated on ${dateStr}</p>
      </div>
      
      <div class="patient-info">
        <h3>Patient Assessment Summary</h3>
      </div>
      
      <div class="section">
        <h3 class="section-title">Diagnosis Results</h3>
        <div class="result-box">
          <p><strong>Dharma Score:</strong> <span class="highlight">${Math.round(
            diag.dharma_score
          )}%</span></p>
          <p><strong>Prediction:</strong> <span class="${
            diag.prediction.includes("High") ? "high-risk" : ""
          }">${diag.prediction}</span></p>
          <p><strong>Confidence Interval (95%):</strong> ${Math.round(
            diag.confidence_interval[0]
          )}% - ${Math.round(diag.confidence_interval[1])}%</p>
          <p><strong>Threshold:</strong> ${Math.round(diag.threshold_used)}%</p>
          <p><strong>Diagnostic Certainty:</strong> ${
            diag.diagnostic_certainty
          }</p>
          <p><strong>Clinical Note:</strong> ${diag.note}</p>
        </div>
      </div>`;

  // Add complication section if applicable
  if (diag.confidence_interval[1] > diag.threshold_used) {
    htmlContent += `
      <div class="section">
        <h3 class="section-title">Severity Assessments</h3>
        <div class="result-box">
          <p><strong>Risk of Complications:</strong> <span class="${
            comp.probability > 50 ? "high-risk" : "low-risk"
          }">${Math.round(comp.probability)}%</span></p>
          <p><strong>Confidence Interval (95%):</strong> ${Math.round(
            comp.confidence_interval[0]
          )}% - ${Math.round(comp.confidence_interval[1])}%</p>
          <p><strong>Clinical Note:</strong> ${comp.note}</p>
        </div>
      </div>`;
  }

  // Add explanation if available
  if (explanationData) {
    htmlContent += `
      <div class="section">
        <h3 class="section-title">Model Explanation</h3>
        <p>This section explains how each feature contributed to the model's prediction.</p>`;

    // Add diagnosis explanation
    htmlContent += `
        <h4>Diagnosis Explanation</h4>
        <p><strong>Base Value:</strong> ${explanationData.shap_values.diagnosis
          .find((item) => item.Feature === "Base Value")
          ["SHAP value"].toFixed(2)}</p>
        <table>
          <tr><th>Feature</th><th>SHAP Value</th></tr>`;

    explanationData.shap_values.diagnosis.forEach((item) => {
      if (item.Feature !== "Base Value" && item.Feature !== "Result") {
        const valueClass = item["SHAP value"] > 0 ? "positive" : "negative";
        htmlContent += `<tr><td>${
          item.Feature
        }</td><td class="${valueClass}">${item["SHAP value"].toFixed(
          4
        )}</td></tr>`;
      }
    });

    htmlContent += `
          <tr><td><strong>Final Prediction</strong></td><td>${explanationData.shap_values.diagnosis
            .find((item) => item.Feature === "Result")
            ["SHAP value"].toFixed(2)}</td></tr>
        </table>`;

    // Add complication explanation if available
    if (explanationData.shap_values.complication) {
      htmlContent += `
        <h4>Complication Risk Explanation</h4>
        <p><strong>Base Value:</strong> ${explanationData.shap_values.complication
          .find((item) => item.Feature === "Base Value")
          ["SHAP value"].toFixed(2)}</p>
        <table>
          <tr><th>Feature</th><th>SHAP Value</th></tr>`;

      explanationData.shap_values.complication.forEach((item) => {
        if (item.Feature !== "Base Value" && item.Feature !== "Result") {
          const valueClass = item["SHAP value"] > 0 ? "positive" : "negative";
          htmlContent += `<tr><td>${
            item.Feature
          }</td><td class="${valueClass}">${item["SHAP value"].toFixed(
            4
          )}</td></tr>`;
        }
      });

      htmlContent += `
          <tr><td><strong>Final Prediction</strong></td><td>${explanationData.shap_values.complication
            .find((item) => item.Feature === "Result")
            ["SHAP value"].toFixed(2)}</td></tr>
        </table>`;
    }

    htmlContent += `</div>`;
  }

  htmlContent += `
      <div class="footer">
        <p>This report was generated by the Appendicitis Diagnostic Tool.</p>
        <p>For clinical use only. Always correlate with clinical findings.</p>
      </div>
    </body>
    </html>`;

  // Create a Blob and download it
  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Appendicitis_Report_${now.getTime()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
