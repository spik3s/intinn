---
paths:
  - "**/*.prompts.ts"
---

# AI prompts

- Prompts live in the repo, in the module that uses them: `modules/<feature>/<feature>.prompts.ts`. Never in an external prompt service.
- A prompt is a typed function: typed input (user context, locale) → the request content. No string concatenation spread across files.
- Structured output is parsed with Zod (`messages.parse` with a Zod output format). Treat parse failure as an error, not as text to show the user.
- Always pass the user's locale. Thai is the default.
- Never put secrets, tokens or other users' data into a prompt.
