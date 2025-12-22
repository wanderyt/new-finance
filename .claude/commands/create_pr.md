---
description: Bump version, update changelog, commit, and create PR
---

# Create Pull Request

Automate the complete PR workflow: version bump, changelog update, commit, and PR creation.

## Instructions

1. **Get the current branch name** by running `git branch --show-current`
   - If on `main` or `master`, stop and warn the user

2. **Analyze changes** on this branch vs `main`:
   - Run `git log main..HEAD --oneline --no-merges`
   - Run `git diff main --stat`
   - Determine appropriate version bump (patch/minor/major)

3. **Read current CHANGELOG.md** to understand format and current version

4. **Ask user for version bump type** if not obvious:
   - Use AskUserQuestion tool to confirm patch/minor/major
   - Provide context about what changed to help them decide

5. **Bump the version**:
   - Run `yarn version:patch`, `yarn version:minor`, or `yarn version:major` based on decision
   - This updates package.json

6. **Update CHANGELOG.md**:
   - Read the updated package.json to get the new version number
   - Add new changelog entry with today's date (YYYY-MM-DD format)
   - Group changes by type (Added, Changed, Fixed, Removed)
   - Write clear, concise descriptions

7. **Commit the changes**:
   - Add CHANGELOG.md and package.json
   - Create commit with message: `chore: prepare release v{version}`
   - Include Claude Code footer

8. **Push to remote**:
   - Run `git push -u origin {branch-name}`

9. **Create pull request**:
   - Use `gh pr create` with title and body
   - Title format: `chore: {brief summary of changes}`
   - Body should include:
     - Summary section with bullet points of changes
     - Test plan checklist
     - Claude Code footer

10. **Report the PR URL** to the user in the chat

## Example PR Body Format

```markdown
## Summary
- Added new feature X
- Fixed bug in Y component
- Updated documentation

## Test plan
- [x] Manual testing completed
- [x] No console errors
- [x] Builds successfully

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Error Handling

- If on main/master branch, warn user and exit
- If no changes detected, inform user and exit
- If gh CLI fails, provide the GitHub URL for manual PR creation
- If git push fails, check if branch already exists and provide guidance
