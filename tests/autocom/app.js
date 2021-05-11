// Compiles a report.
exports.reporter = async page => {
  // Get an array of ElementHandles for autocomplete-eligible inputs.
  const inputTypes = ['date', 'email', 'password', 'tel', 'text', 'url'];
  const selectors = inputTypes.map(type => `input[type=${type}]`);
  const elements = await page.$$(selectors.join(', '));
  // Initialize a report.
  const report = [];
  let done = 0;
  // If there are any such inputs:
  if (elements.length) {
    // Limit the length of displayed labels.
    const labelTextMax = 100;
    // For each ElementHandle, in parallel in random order:
    elements.forEach(async (element, index) => {
      // Get a concatenation of the text contents of its labels.
      const labelText = await element.evaluate(
        (el, max) => {
          const labelTexts = Array.from(el.labels).map(label => label.textContent);
          if (el.hasAttribute('aria-labelledby')) {
            const byIDs = el.getAttribute('aria-labelledby').split(' ');
            labelTexts.push(byIDs.map(id => document.getElementById(id).textContent));
          }
          if (el.hasAttribute('aria-label')) {
            labelTexts.push(el.getAttribute('aria-label'));
          }
          return labelTexts.join('; ')
          .replace(/[<>]/g, '')
          .replace(/\s{2,}/g, ' ')
          .slice(0, max);
        },
        labelTextMax
      );
      // Get other properties of the element.
      const typeHandle = await element.getProperty('type');
      const type = await typeHandle.jsonValue() || 'text';
      const acHandle = await element.getAttribute('autocomplete') || '';
      const autocomplete = acHandle || '<strong>None</strong>';
      // Add the element to the report.
      report.push({
        index,
        type,
        autocomplete,
        labelText
      });
      // If this element is the last one processed:
      if (++done === elements.length) {
        // Sort the elements in the report by DOM order.
        report.sort((a, b) => a.index - b.index);
        // Return the report as JSON.
        return JSON.stringify(report, null, 2);
      }
    });
  }
  // Otherwise, i.e. if there are no autocomplete-eligible inputs:
  else {
    // Return a report.
    return '<strong>None</strong>';
  }
};
// Handles a form submission.
exports.formHandler = globals => {
  const {query} = globals;
  if (globals.queryIncludes(['actFileOrURL'])) {
    const debug = false;
    (async () => {
      // Perform the specified preparations.
      const page = await globals.perform(debug);
      // Compile an axe-core report.
      await globals.axe(page, ['autocomplete-valid']);
      // Compile an autocomplete report.
      query.report = await exports.reporter(page);
      // Render and serve a report.
      globals.render('autocom', true);
    })();
  }
  else {
    globals.serveMessage('ERROR: Some information missing or invalid.', globals.response);
  }
};
