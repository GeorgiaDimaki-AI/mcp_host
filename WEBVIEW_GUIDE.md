# Webview Guide

## What are Webviews?

Webviews are small, sandboxed HTML views that the LLM can render as part of its responses. They enable:
- Interactive forms for collecting user input
- Data visualizations and charts
- Formatted result displays
- Custom UI components

## How to Use Webviews

The LLM can include webview content in its responses using a special markdown code block syntax:

````markdown
```webview:type
<html content here>
```
````

### Webview Types

1. **`html`** - General HTML content
2. **`form`** - Interactive forms
3. **`result`** - Result displays (like Jupyter notebook outputs)

## Examples

### 1. Simple HTML Display

````markdown
```webview:html
<div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
  <h2>Welcome!</h2>
  <p>This is a rendered HTML webview.</p>
</div>
```
````

### 2. Interactive Form

````markdown
```webview:form
<form id="userForm">
  <label>Name:</label>
  <input type="text" id="name" name="name" required />

  <label>Email:</label>
  <input type="email" id="email" name="email" required />

  <label>Favorite Color:</label>
  <select id="color" name="color">
    <option value="blue">Blue</option>
    <option value="red">Red</option>
    <option value="green">Green</option>
  </select>

  <button type="submit">Submit</button>
</form>

<script>
document.getElementById('userForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    color: document.getElementById('color').value,
  };
  window.sendToHost({
    type: 'form-submit',
    formData: formData
  });
});
</script>
```
````

### 3. Data Visualization

````markdown
```webview:result
<div style="padding: 20px;">
  <h3>Sales Data</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #f3f4f6;">
        <th style="padding: 8px; text-align: left;">Month</th>
        <th style="padding: 8px; text-align: right;">Sales</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px;">January</td>
        <td style="padding: 8px; text-align: right;">$12,500</td>
      </tr>
      <tr>
        <td style="padding: 8px;">February</td>
        <td style="padding: 8px; text-align: right;">$15,200</td>
      </tr>
      <tr>
        <td style="padding: 8px;">March</td>
        <td style="padding: 8px; text-align: right;">$18,700</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 20px; padding: 15px; background: #e0f2fe; border-radius: 6px;">
    <strong>Total Revenue:</strong> $46,400
  </div>
</div>
```
````

### 4. Interactive Calculator

````markdown
```webview:html
<div style="max-width: 300px; margin: 0 auto;">
  <h3 style="text-align: center;">Calculator</h3>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
    <div>
      <label>Number 1:</label>
      <input type="number" id="num1" value="0" style="width: 100%;" />
    </div>
    <div>
      <label>Number 2:</label>
      <input type="number" id="num2" value="0" style="width: 100%;" />
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
    <button onclick="calculate('+')" style="padding: 10px;">+</button>
    <button onclick="calculate('-')" style="padding: 10px;">-</button>
    <button onclick="calculate('*')" style="padding: 10px;">×</button>
    <button onclick="calculate('/')" style="padding: 10px;">÷</button>
  </div>
  <div id="result" style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 6px; text-align: center; font-size: 20px; font-weight: bold;">
    Result: 0
  </div>
</div>

<script>
function calculate(op) {
  const num1 = parseFloat(document.getElementById('num1').value);
  const num2 = parseFloat(document.getElementById('num2').value);
  let result;

  switch(op) {
    case '+': result = num1 + num2; break;
    case '-': result = num1 - num2; break;
    case '*': result = num1 * num2; break;
    case '/': result = num2 !== 0 ? num1 / num2 : 'Error'; break;
  }

  document.getElementById('result').textContent = 'Result: ' + result;
}
</script>
```
````

## Message Passing

Webviews can send messages back to the chat using the `window.sendToHost()` function:

```javascript
window.sendToHost({
  type: 'custom-event',
  data: { /* your data here */ }
});
```

Form submissions are automatically handled when using the format:

```javascript
window.sendToHost({
  type: 'form-submit',
  formData: { /* form data */ }
});
```

## Security

All webviews are rendered in sandboxed iframes with:
- Limited JavaScript capabilities
- No access to parent window
- Content Security Policy restrictions
- Isolated execution context

This ensures safe execution of user-generated or LLM-generated HTML content.

## Example Prompts to Try

1. "Create a form to collect user feedback with name, email, and rating fields"
2. "Show me a comparison table of different programming languages"
3. "Create an interactive color picker that shows the hex code"
4. "Display the Fibonacci sequence in a styled table with the first 10 numbers"
5. "Build a simple BMI calculator"

## Tips for LLM Usage

When instructing an LLM to use webviews, you can:
- Ask it to create forms for specific data collection needs
- Request visualizations of data or results
- Have it render formatted output similar to Jupyter notebooks
- Create interactive tools and calculators
