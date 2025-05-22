function clearDefaultValue() {
    $("select").each(function () {
      const selectElement = $(this);
  
      selectElement.one("focus", function () {
        const firstOption = $(this).find("option:first");
        if (firstOption.val() === "") {
          firstOption.remove(); // remove the "Select option"
        }
      });
    });
  }
  
  // Call the function after DOM is ready
  clearDefaultValue();