let predictionData = null;
let explanationData = null;

// Feature names for SHAP values (aligned with formData)
const featureNames = [
  "Nausea",
  "Loss of Appetite",
  "Peritonitis",
  "WBC Count",
  "Body Temperature",
  "Neutrophil Percentage",
  "CRP",
  "Ketones in Urine",
  "Appendix Diameter",
  "Free Fluids",
  "Additional Feature", // Added for complication's extra SHAP value
];

$(document).ready(function () {
  // Info button modal functionality
  const docModal = document.getElementById("docModal");
  const infoBtn = document.getElementById("infoButton");
  const docCloseBtn = docModal?.getElementsByClassName("close-modal")[0];

  // Explanation modal functionality
  const explainModal = document.getElementById("explainModal");
  const explainBtn = document.getElementById("explainButton");
  const explainCloseBtn =
    explainModal?.getElementsByClassName("close-modal")[0];

  // Open documentation modal
  if (infoBtn && docModal) {
    infoBtn.onclick = function () {
      docModal.style.display = "block";
    };
  }

  // Close documentation modal
  if (docCloseBtn && docModal) {
    docCloseBtn.onclick = function () {
      docModal.style.display = "none";
    };
  }

  // Open explanation modal
  if (explainBtn) {
    explainBtn.onclick = function () {
      if (!explanationData) {
        alert("Please get a prediction first.");
        return;
      }

      const shapValues = {
        diagnosis: explanationData.diagnosis.shap_values,
        complication: explanationData.complication.shap_values,
      };

      // Render SHAP explanation for both
      renderShapTables(shapValues);
      if (explainModal) {
        explainModal.style.display = "block";
      }
    };
  }

  // Close explanation modal
  if (explainCloseBtn && explainModal) {
    explainCloseBtn.onclick = function () {
      explainModal.style.display = "none";
    };
  }

  // Close modals when clicking outside
  window.onclick = function (event) {
    if (event.target == docModal) {
      docModal.style.display = "none";
    }
    if (event.target == explainModal) {
      explainModal.style.display = "none";
    }
  };

  const backendUrl = ""; // Set your backend URL here
  // Form submission handler
  $("#prediction-form").on("submit", function (event) {
    event.preventDefault(); // Prevent page reload
    function parseOrNull(value, type = "float") {
      if (value === "" || value === null || value === undefined) return null;
      if (type === "int") return parseInt(value);
      if (type === "float") return parseFloat(value);
      return value;
    }
    const formData = {
      Nausea: parseInt($("#Nausea").val()) || 0,
      Loss_of_Appetite: parseInt($("#Loss_of_Appetite").val()) || 0,
      Peritonitis: parseInt($("#Peritonitis").val()) || 0,
      WBC_Count: parseFloat($("#WBC_Count").val()) || 0,
      Body_Temperature: parseFloat($("#Body_Temperature").val()) || 0,
      Neutrophil_Percentage: parseFloat($("#Neutrophil_Percentage").val()) || 0,
      CRP: parseOrNull($("#CRP").val(), "float"),
      Ketones_in_Urine: parseOrNull($("#Ketones_in_Urine").val(), "float"),
      Appendix_Diameter: parseOrNull($("#Appendix_Diameter").val(), "float"),
      Free_Fluids: parseOrNull($("#Free_Fluids").val(), "float"),
    };

    $.ajax({
      url: `${backendUrl}/predict`,
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(formData),
      success: function (response) {
        console.log("Server response:", response);

        // Store full response for report + explanation
        predictionData = response;
        explanationData = response; // both are now same response object

        const diagnosis = response.diagnosis;
        const complication = response.complication;

        // --- BUILD DIAGNOSIS RESULT HTML ---
        let html = `
          <div class="result-section diagnosis-section">
            <h4>Diagnosis</h4>
            <div class="result-row">
              <span class="result-label">Probability:</span>
              <span class="result-value">${diagnosis.probability.toFixed(
                2
              )}%</span>
            </div>
            <div class="result-row">
              <span class="result-label">95% Confidence Interval:</span>
              <span class="result-value">${diagnosis.confidence_interval[0].toFixed(
                2
              )}% - ${diagnosis.confidence_interval[1].toFixed(2)}%</span>
            </div>
            <div class="result-row">
              <span class="result-label">Result:</span>
              <span class="result-value high-risk">${diagnosis.result}</span>
            </div>
            <div class="clinical-note">Note: ${diagnosis.note}</div>
          </div>
        `;

        // --- BUILD COMPLICATION RESULT HTML ---
        html += `
          <div class="result-section complication-section mt-4">
            <h4>Complications</h4>
            <div class="result-row">
              <span class="result-label">Probability:</span>
              <span class="result-value">${complication.probability.toFixed(
                2
              )}%</span>
            </div>
            <div class="result-row">
              <span class="result-label">95% Confidence Interval:</span>
              <span class="result-value">${complication.confidence_interval[0].toFixed(
                2
              )}% - ${complication.confidence_interval[1].toFixed(2)}%</span>
            </div>
            <div class="result-row">
              <span class="result-label">Result:</span>
              <span class="result-value high-risk">${complication.result}</span>
            </div>
            <div class="clinical-note">Note: ${complication.note}</div>
          </div>
        `;

        $("#result").show().html(html);
        $("#explainButton").removeClass("hidden");
      },
      error: function (xhr, status, error) {
        console.error("Error:", error);
        $("#result").show().html(`<p style="color:red;">Error: ${error}</p>`);
      },
    });
  });

  // Section toggle functionality
  $(".section-btn").on("click", function () {
    $(".section-btn").removeClass("active");
    $(this).addClass("active");
    const sectionToShow = $(this).data("section");
    $(".section-content").hide();
    $("#" + sectionToShow).show();
  });
});

// Function to render SHAP tables in the explanation modal
function renderShapTables(data) {
  const explainContent = document.getElementById("explainContent");
  if (!explainContent) {
    console.error("Element with ID 'explainContent' not found.");
    return;
  }

  let html = '<div class="shap-tables-container">';

  for (const type of ["diagnosis", "complication"]) {
    const shap = data[type];

    if (!shap || !Array.isArray(shap)) {
      html += `<p style="color:red;">No SHAP data found for ${type}.</p>`;
      continue;
    }

    const baseValue = explanationData[type].base_value ?? 0;
    const shapValues = shap;
    const totalImpact = shapValues.reduce((sum, v) => sum + v, 0);
    const finalValue = baseValue + totalImpact;

    html += `
      <div class="shap-table-wrapper">
        <h3>${type.charAt(0).toUpperCase() + type.slice(1)} Explanation</h3>
        <p class="base-value-row">
          <span class="base-value-label"><strong>Base Value:</strong></span>
          <span class="base-value-number">${baseValue.toFixed(4)}</span>
        </p>
        <p class="final-value-row">
          <span class="final-value-label"><strong>Final Model Output:</strong></span>
          <span class="final-value-number">${finalValue.toFixed(4)}</span>
        </p>
        <table class="shap-table">
          <thead>
            <tr><th>Feature</th><th>SHAP Value</th></tr>
          </thead>
          <tbody>
    `;

    shapValues.forEach((v, i) => {
      const featureName = featureNames[i] || `Feature ${i + 1}`;
      const signClass = v >= 0 ? "positive" : "negative";
      html += `
        <tr>
          <td>${featureName}</td>
          <td class="${signClass}">${v.toFixed(4)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  html += "</div>";
  explainContent.innerHTML = html;
}

// Clear default value function
function clearDefaultValue(input) {
  if (input.dataset.cleared !== "true") {
    input.dataset.cleared = "true";
    input.value = "";
  }
}

// function downloadReport() {
//   if (!predictionData) {
//     alert("Please make a prediction first before downloading the report.");
//     return;
//   }

//   const logoImg = new Image();
//   logoImg.src = "/static/images/dharma_aa.png";

//   logoImg.onload = () => {
//     try {
//       const { jsPDF } = window.jspdf;
//       const doc = new jsPDF({
//         orientation: "portrait",
//         unit: "pt",
//         format: "a4",
//       });

//       const pageWidth = doc.internal.pageSize.getWidth();
//       const margin = 40;
//       const maxWidth = pageWidth - 2 * margin;
//       let y = margin;

//       const diag = predictionData.diagnosis;
//       const comp = predictionData.complication;

//       // Logo with blue background
//       const imgWidth = 180;
//       const imgHeight = (logoImg.height / logoImg.width) * imgWidth;
//       const imgX = (pageWidth - imgWidth) / 2;

//       doc.setFillColor(0, 102, 204);
//       doc.rect(imgX - 10, y - 10, imgWidth + 20, imgHeight + 20, "F");
//       doc.addImage(logoImg, "PNG", imgX, y, imgWidth, imgHeight);
//       y += imgHeight + 20;

//       // Generated on date
//       doc.setFont("Times New Roman", "normal");
//       doc.setFontSize(10);
//       doc.setTextColor(100);
//       const now = new Date();
//       const dateStr = now.toLocaleDateString("en-US", {
//         year: "numeric",
//         month: "long",
//         day: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       });
//       doc.text(`Generated on ${dateStr}`, pageWidth / 2, y, {
//         align: "center",
//       });
//       y += 25;

//       // Diagnosis Result
//       doc.setTextColor(0, 102, 204);
//       doc.setFontSize(14);
//       doc.text("Diagnosis Result:", margin, y);
//       y += 10;
//       doc.setLineWidth(1);
//       doc.setDrawColor(221, 221, 221);
//       doc.line(margin, y, pageWidth - margin, y);
//       y += 15;

//       doc.setFontSize(12);
//       doc.setTextColor(51, 51, 51);
//       doc.text(`Probability: ${diag.probability.toFixed(2)}%`, margin, y);
//       y += 15;
//       doc.text(
//         `Confidence Interval (95%): ${diag.confidence_interval[0].toFixed(
//           2
//         )}% - ${diag.confidence_interval[1].toFixed(2)}%`,
//         margin,
//         y
//       );
//       y += 15;
//       doc.setTextColor(
//         diag.result.includes("High") ? 217 : 51,
//         diag.result.includes("High") ? 83 : 51,
//         diag.result.includes("High") ? 79 : 51
//       );
//       doc.text(`Result: ${diag.result}`, margin, y);
//       y += 15;
//       doc.setTextColor(51, 51, 51);
//       doc.text(`Clinical Note: ${diag.note}`, margin, y, { maxWidth });
//       y +=
//         doc.getTextDimensions(`Clinical Note: ${diag.note}`, { maxWidth }).h +
//         15;

//       // Complications
//       doc.setTextColor(0, 102, 204);
//       doc.setFontSize(14);
//       doc.text("Complications:", margin, y);
//       y += 10;
//       doc.line(margin, y, pageWidth - margin, y);
//       y += 15;

//       doc.setFontSize(12);
//       doc.setTextColor(
//         comp.probability > 50 ? 217 : 92,
//         comp.probability > 50 ? 83 : 184,
//         comp.probability > 50 ? 79 : 92
//       );
//       doc.text(
//         `Risk of Complications: ${comp.probability.toFixed(2)}%`,
//         margin,
//         y
//       );
//       y += 15;
//       doc.setTextColor(51, 51, 51);
//       doc.text(
//         `Confidence Interval (95%): ${comp.confidence_interval[0].toFixed(
//           2
//         )}% - ${comp.confidence_interval[1].toFixed(2)}%`,
//         margin,
//         y
//       );
//       y += 15;
//       doc.text(`Clinical Note: ${comp.note}`, margin, y, { maxWidth });
//       y +=
//         doc.getTextDimensions(`Clinical Note: ${comp.note}`, { maxWidth }).h +
//         15;

//       // Model Explanation
//       if (explanationData) {
//         doc.setTextColor(0, 102, 204);
//         doc.setFontSize(14);
//         doc.text("Model Explanation", margin, y);
//         y += 10;
//         doc.line(margin, y, pageWidth - margin, y);
//         y += 15;

//         doc.setFontSize(12);
//         doc.setTextColor(51, 51, 51);
//         doc.text(
//           "This section explains how each feature contributed to the model's prediction.",
//           margin,
//           y,
//           { maxWidth }
//         );
//         y +=
//           doc.getTextDimensions(
//             "This section explains how each feature contributed to the model's prediction.",
//             { maxWidth }
//           ).h + 15;

//         // Diagnosis Explanation
//         doc.text("Diagnosis Explanation", margin, y);
//         y += 15;
//         doc.text(
//           `Base Value: ${explanationData.diagnosis.base_value.toFixed(2)}`,
//           margin,
//           y
//         );
//         y += 20;

//         doc.setFillColor(242, 242, 242);
//         doc.rect(margin, y - 10, maxWidth, 20, "F");
//         doc.text("Feature", margin + 5, y);
//         doc.text("SHAP Value", pageWidth - margin - 100, y);
//         y += 25;

//         explanationData.diagnosis.shap_values.forEach((value, i) => {
//           const featureName = featureNames[i] || `Feature ${i + 1}`;
//           doc.setTextColor(
//             value > 0 ? 217 : 92,
//             value > 0 ? 83 : 184,
//             value > 0 ? 79 : 92
//           );
//           doc.text(featureName, margin + 5, y, { maxWidth: maxWidth - 100 });
//           doc.text(value.toFixed(4), pageWidth - margin - 100, y);
//           y += 15;
//         });

//         const diagFinal = (
//           explanationData.diagnosis.base_value +
//           explanationData.diagnosis.shap_values.reduce((sum, v) => sum + v, 0)
//         ).toFixed(2);
//         doc.setTextColor(51, 51, 51);
//         doc.text("Final Prediction", margin + 5, y);
//         doc.text(diagFinal, pageWidth - margin - 100, y);
//         y += 20;

//         // Complication Explanation
//         doc.text("Complication Risk Explanation", margin, y);
//         y += 15;
//         doc.text(
//           `Base Value: ${explanationData.complication.base_value.toFixed(2)}`,
//           margin,
//           y
//         );
//         y += 20;

//         doc.setFillColor(242, 242, 242);
//         doc.rect(margin, y - 10, maxWidth, 20, "F");
//         doc.text("Feature", margin + 5, y);
//         doc.text("SHAP Value", pageWidth - margin - 100, y);
//         y += 25;

//         explanationData.complication.shap_values.forEach((value, i) => {
//           const featureName = featureNames[i] || `Feature ${i + 1}`;
//           doc.setTextColor(
//             value > 0 ? 217 : 92,
//             value > 0 ? 83 : 184,
//             value > 0 ? 79 : 92
//           );
//           doc.text(featureName, margin + 5, y, { maxWidth: maxWidth - 100 });
//           doc.text(value.toFixed(4), pageWidth - margin - 100, y);
//           y += 15;
//         });

//         const compFinal = (
//           explanationData.complication.base_value +
//           explanationData.complication.shap_values.reduce(
//             (sum, v) => sum + v,
//             0
//           )
//         ).toFixed(2);
//         doc.setTextColor(51, 51, 51);
//         doc.text("Final Prediction", margin + 5, y);
//         doc.text(compFinal, pageWidth - margin - 100, y);
//         y += 20;
//       }

//       // Footer
//       doc.setFontSize(10);
//       doc.setTextColor(119, 119, 119);
//       doc.text("powered by DharmaAI: Appendicitis Model", pageWidth / 2, y, {
//         align: "center",
//       });
//       y += 15;
//       doc.text("To be used for clinical decision-support.", pageWidth / 2, y, {
//         align: "center",
//       });

//       // Save PDF
//       doc.save(`Appendicitis_Report_${now.getTime()}.pdf`);
//     } catch (err) {
//       console.error("Report generation error:", err.message);
//       alert("Failed to generate report: " + err.message);
//     }
//   };

//   logoImg.onerror = () => {
//     alert("Failed to load the logo image.");
//   };
// }
