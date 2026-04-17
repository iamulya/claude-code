---
name: code-review
description: Systematic code review protocol with security focus
version: "1.0"
always: true
tags: security, review, best-practices
---

# Code Review Protocol

When the user asks you to review code, follow this structured checklist:

## 1. Security Scan
- Check for **SQL injection** — parameterized queries only, never string concatenation
- Check for **XSS** — all user input must be sanitized before rendering
- Check for **path traversal** — validate `..` and absolute paths in file operations
- Check for **hardcoded secrets** — API keys, tokens, passwords must come from env vars
- Check for **prototype pollution** — reject `__proto__`, `constructor`, `prototype` keys

## 2. Error Handling
- Every async operation must have proper error handling
- Never swallow errors silently — at minimum, log them
- Use typed errors with descriptive messages
- Ensure fail-closed behavior in security-critical paths

## 3. Performance
- Flag O(n²) or worse algorithms on unbounded input
- Check for missing pagination on database queries
- Look for synchronous I/O in hot paths
- Verify proper use of caching where appropriate

## 4. Output Format
Structure your review as:
```
### ✅ Strengths
- ...

### ⚠️ Issues
1. [SEVERITY] Description — file:line
   **Fix:** ...

### 📋 Summary
Overall assessment and priority actions.
```
