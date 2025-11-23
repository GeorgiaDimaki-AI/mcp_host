# Function Calling Support in MCP Webview Host

## Overview

When using MCP servers with tools, the LLM needs to support **function calling** (also called tool use). Not all models have this capability, and some are better at it than others.

## ✅ Recommended Models for Function Calling

### **Best (Native Function Calling)**
These models are specifically trained for function calling and work excellently:

- **llama3.2:latest** - Meta's Llama 3.2, excellent function calling
- **llama3.1:8b** - Llama 3.1 series, very reliable
- **qwen2.5:7b** or **qwen2.5:14b** - Qwen 2.5 series, excellent tool use
- **mistral:latest** - Mistral models with function calling support
- **command-r:latest** - Cohere's Command R, designed for tool use

### **Good (Function Calling Capable)**
These work but may occasionally need guidance:

- **phi3:latest** - Microsoft's Phi-3, decent function calling
- **gemma2:9b** - Google's Gemma 2, supports tools

### **⚠️ Not Recommended (Limited/No Function Calling)**
These models may output function calls as text instead of actually calling them:

- **qwen:4b** - Earlier Qwen versions don't support function calling well
- **llama2:latest** - Llama 2 series lacks native function calling
- **codellama:latest** - Optimized for code, not function calling
- **phi:latest** - Older Phi models
- **tinyllama:latest** - Too small for reliable function calling

## 🔧 How to Install Recommended Models

```bash
# Install Llama 3.2 (highly recommended)
ollama pull llama3.2

# Install Qwen 2.5 (excellent for MCP)
ollama pull qwen2.5:7b

# Install Mistral
ollama pull mistral

# Install Command R (large but very good)
ollama pull command-r
```

## 🐛 Troubleshooting Function Calling Issues

### **Symptom: Model outputs JSON instead of calling tools**

Example bad output:
```json
{"type":"function","function":{"name":"restaurant_view_menu","parameters":{"category":"all"}}}
```

**Solutions:**
1. **Switch to a recommended model** (see list above)
2. **Clear conversation history** - old context might confuse the model
3. **Use specific language** - Try "Show me the menu" instead of "Display the restaurant menu with beautiful formatting..."
4. **Check model version** - Make sure you have the latest version:
   ```bash
   ollama pull llama3.2
   ```

### **Symptom: Model doesn't use tools even when they're available**

**Solutions:**
1. **Be explicit** - Try: "Use the view_menu tool to show me the menu"
2. **Simplify the request** - Complex requests may confuse the model
3. **Check MCP server is selected** - Verify the MCP server dropdown shows "restaurant" or whichever server you want

### **Symptom: Tools work sometimes but not always**

**Possible Causes:**
- Model temperature too high (try temperature: 0.3-0.5)
- Complex system prompts interfering
- Model hallucinating instead of using tools

**Solutions:**
1. Lower temperature in settings (Settings → Model Settings)
2. Use a better function-calling model
3. Provide clearer, more direct requests

## 📊 Function Calling Quality by Model

| Model | Function Calling | Notes |
|-------|-----------------|-------|
| llama3.2 | ⭐⭐⭐⭐⭐ | Excellent, highly recommended |
| qwen2.5 | ⭐⭐⭐⭐⭐ | Excellent, very reliable |
| mistral | ⭐⭐⭐⭐ | Good, solid choice |
| command-r | ⭐⭐⭐⭐⭐ | Excellent but large (35B) |
| llama3.1 | ⭐⭐⭐⭐ | Good, proven track record |
| phi3 | ⭐⭐⭐ | Decent, smaller footprint |
| gemma2 | ⭐⭐⭐ | Works but can be inconsistent |
| qwen (older) | ⭐ | Poor, upgrade to qwen2.5 |
| llama2 | ⭐ | No native support |

## 🎯 Best Practices

1. **Start with llama3.2** - It's the most reliable and well-tested
2. **Use lower temperatures** - 0.3-0.5 works best for function calling
3. **Be specific** - Clear, direct requests get better results
4. **Update regularly** - `ollama pull <model>` to get latest versions
5. **Test with simple requests first** - Build up to complex multi-tool scenarios

## 💡 Example Prompts That Work Well

With restaurant MCP server selected:

✅ **Good:**
- "Show me the menu"
- "Make a reservation"
- "View my reservation RES123ABC"
- "What's the chef's special?"

❌ **Less effective (too vague):**
- "Tell me about this restaurant"
- "Help me with dining"
- "I want food"

## 🔗 Resources

- [Ollama Function Calling Docs](https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-chat-completion)
- [Model Context Protocol Spec](https://modelcontextprotocol.io)
- [Ollama Models Library](https://ollama.com/library)
