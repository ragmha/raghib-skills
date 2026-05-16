# Contributing

Thanks for your interest! This is primarily a personal collection of skills I use day-to-day, but improvements are welcome.

## Adding or improving a skill

- One pull request per skill change.
- Each skill lives in `resources/<kebab-case-name>/` with a `SKILL.md` at the root.
- `SKILL.md` must start with YAML frontmatter containing at least `name:` and `description:`.
- The `description:` field is what the agent reads to decide when to invoke the skill — make it specific. Include trigger phrases ("Use when user says...") so model-side invocation works.
- If a skill bundles scripts, place them in a `scripts/` subdirectory.
- Update `README.md` to add the skill under the right category, using the format:
  ```
  - [`skill-name`](resources/skill-name/SKILL.md) - One-sentence description ending with a period.
  ```

## Quality bar

Skills should:

- Be actively used (not aspirational).
- Have a clear `SKILL.md` describing the workflow, not just a single prompt.
- Have a sharp invocation trigger so the agent knows when to load them.
- Avoid overlap with existing skills — if there's overlap, prefer extending the existing skill.

## Adding a new category

If your skill doesn't fit an existing category in the README, propose a new one in your PR description. New categories should have at least 2 skills.

