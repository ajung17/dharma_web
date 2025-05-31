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
  const backendUrl = "";
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
        ? `${backendUrl}/predict`
        : `${backendUrl}/explanation`;

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
function downloadReport() {
  if (!predictionData) {
    alert("Please make a prediction first before downloading the report.");
    return;
  }

  // Load the logo image
  const logoImg = new Image();
  logoImg.src = "/static/images/dharma_aa.png";

  logoImg.onload = () => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const maxWidth = pageWidth - 2 * margin;
      let y = margin;

      if (!predictionData.diagnosis || !predictionData.complication) {
        throw new Error("Missing diagnosis or complication data in predictionData");
      }

      const diag = predictionData.diagnosis;
      const comp = predictionData.complication;

      // ==== Logo with blue background ====
      const imgWidth = 180; // Larger width
      const imgHeight = (logoImg.height / logoImg.width) * imgWidth;
      const imgX = (pageWidth - imgWidth) / 2;

      // Draw blue rectangle background behind logo
      doc.setFillColor(0, 102, 204); // Blue color
      doc.rect(imgX - 10, y - 10, imgWidth + 20, imgHeight + 20, "F");

      // Draw logo image
      doc.addImage(logoImg, 'PNG', imgX, y, imgWidth, imgHeight);
      y += imgHeight + 20;

      // Smaller "Generated on" date
      doc.setFont("Times New Roman", "normal");
      doc.setFontSize(10); // Smaller font size
      doc.setTextColor(100); // Lighter gray

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      doc.text(`Generated on ${dateStr}`, pageWidth / 2, y, { align: "center" });
      y += 25;

      // Patient Assessment Summary
      doc.setTextColor(0, 102, 204);
      doc.setFontSize(14);
      doc.text("Diagnosis Result:", margin, y);
      y += 10;
      doc.setLineWidth(1);
      doc.setDrawColor(221, 221, 221);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      doc.setFontSize(12);
      doc.setTextColor(51, 51, 51);
      doc.text(`Dharma Score: ${Math.round(diag.dharma_score)}%`, margin, y);
      y += 15;

      doc.setTextColor(
        diag.prediction.includes("High") ? 217 : 51,
        diag.prediction.includes("High") ? 83 : 51,
        diag.prediction.includes("High") ? 79 : 51
      );
      doc.text(`Prediction: ${diag.prediction}`, margin, y);
      y += 15;

      doc.setTextColor(51, 51, 51);
      doc.text(
        `Confidence Interval (95%): ${Math.round(diag.confidence_interval[0])}% - ${Math.round(diag.confidence_interval[1])}%`,
        margin,
        y
      );
      y += 15;
      doc.text(`Threshold: ${Math.round(diag.threshold_used)}%`, margin, y);
      y += 15;
      doc.text(`Diagnostic Certainty: ${diag.diagnostic_certainty}`, margin, y);
      y += 15;
      doc.text(`Clinical Note: ${diag.note}`, margin, y, { maxWidth });
      y += doc.getTextDimensions(`Clinical Note: ${diag.note}`, { maxWidth }).h + 15;

      if (diag.confidence_interval[1] > diag.threshold_used) {
        doc.setFontSize(14);
        doc.setTextColor(0, 102, 204);
        doc.text("Severity Assessment:", margin, y);
        y += 10;
        doc.setLineWidth(1);
        doc.line(margin, y, pageWidth - margin, y);
        y += 15;

        doc.setFontSize(12);
        doc.setTextColor(
          comp.probability > 50 ? 217 : 92,
          comp.probability > 50 ? 83 : 184,
          comp.probability > 50 ? 79 : 92
        );
        doc.text(`Risk of Complications: ${Math.round(comp.probability)}%`, margin, y);
        y += 15;
        doc.setTextColor(51, 51, 51);
        doc.text(
          `Confidence Interval (95%): ${Math.round(comp.confidence_interval[0])}% - ${Math.round(comp.confidence_interval[1])}%`,
          margin,
          y
        );
        y += 15;
        doc.text(`Clinical Note: ${comp.note}`, margin, y, { maxWidth });
        y += doc.getTextDimensions(`Clinical Note: ${comp.note}`, { maxWidth }).h + 15;
      }

      if (explanationData) {
        doc.setFontSize(14);
        doc.setTextColor(0, 102, 204);
        doc.text("Model Explanation", margin, y);
        y += 10;
        doc.line(margin, y, pageWidth - margin, y);
        y += 15;

        doc.setFontSize(12);
        doc.setTextColor(51, 51, 51);
        doc.text("This section explains how each feature contributed to the model's prediction.", margin, y, { maxWidth });
        y += doc.getTextDimensions("This section explains how each feature contributed to the model's prediction.", { maxWidth }).h + 15;

        doc.setFontSize(12);
        doc.text("Diagnosis Explanation", margin, y);
        y += 15;

        const baseValue = explanationData.shap_values.diagnosis.find(item => item.Feature === "Base Value")["SHAP value"].toFixed(2);
        doc.text(`Base Value: ${baseValue}`, margin, y);
        y += 20;

        doc.setFillColor(242, 242, 242);
        doc.rect(margin, y - 10, maxWidth, 20, "F");
        doc.text("Feature", margin + 5, y);
        doc.text("SHAP Value", pageWidth - margin - 100, y);
        y += 25;

        explanationData.shap_values.diagnosis.forEach(item => {
          if (item.Feature !== "Base Value" && item.Feature !== "Result") {
            doc.setTextColor(
              item["SHAP value"] > 0 ? 217 : 92,
              item["SHAP value"] > 0 ? 83 : 184,
              item["SHAP value"] > 0 ? 79 : 92
            );
            doc.text(item.Feature, margin + 5, y, { maxWidth: maxWidth - 100 });
            doc.text(item["SHAP value"].toFixed(4), pageWidth - margin - 100, y);
            y += 15;
          }
        });

        const finalPrediction = explanationData.shap_values.diagnosis.find(item => item.Feature === "Result")["SHAP value"].toFixed(2);
        doc.setTextColor(51, 51, 51);
        doc.text("Final Prediction", margin + 5, y);
        doc.text(finalPrediction, pageWidth - margin - 100, y);
        y += 20;

        if (explanationData.shap_values.complication) {
          doc.setFontSize(12);
          doc.text("Complication Risk Explanation", margin, y);
          y += 15;

          const compBaseValue = explanationData.shap_values.complication.find(item => item.Feature === "Base Value")["SHAP value"].toFixed(2);
          doc.text(`Base Value: ${compBaseValue}`, margin, y);
          y += 20;

          doc.setFillColor(242, 242, 242);
          doc.rect(margin, y - 10, maxWidth, 20, "F");
          doc.text("Feature", margin + 5, y);
          doc.text("SHAP Value", pageWidth - margin - 100, y);
          y += 25;

          explanationData.shap_values.complication.forEach(item => {
            if (item.Feature !== "Base Value" && item.Feature !== "Result") {
              doc.setTextColor(
                item["SHAP value"] > 0 ? 217 : 92,
                item["SHAP value"] > 0 ? 83 : 184,
                item["SHAP value"] > 0 ? 79 : 92
              );
              doc.text(item.Feature, margin + 5, y, { maxWidth: maxWidth - 100 });
              doc.text(item["SHAP value"].toFixed(4), pageWidth - margin - 100, y);
              y += 15;
            }
          });

          const compFinalPrediction = explanationData.shap_values.complication.find(item => item.Feature === "Result")["SHAP value"].toFixed(2);
          doc.setTextColor(51, 51, 51);
          doc.text("Final Prediction", margin + 5, y);
          doc.text(compFinalPrediction, pageWidth - margin - 100, y);
          y += 20;
        }
      }
      y += 15;
      // Footer
      doc.setFontSize(10);
      doc.setTextColor(119, 119, 119);
      doc.text("powered by DharmaAI: Appendicitis Model", pageWidth / 2, y, { align: "center" });
      y += 15;
      doc.text("To be used for clinical decision-support.", pageWidth / 2, y, { align: "center" });
      // Save PDF
      doc.save(`Appendicitis_Report_${now.getTime()}.pdf`);

    } catch (err) {
      console.error("Report generation error:", err.message);
      alert("Failed to generate report: " + err.message);
    }
  };

  logoImg.onerror = () => {
    alert("Failed to load the logo image.");
  };
}

