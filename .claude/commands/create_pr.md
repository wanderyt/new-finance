---
description: Bump version, update changelog, commit, and create PR
---

# Create Pull Request

Automate the complete PR workflow: version bump, changelog update, commit, and PR creation.

## Instructions

1. **Get the current branch name** by running `git branch --show-current`
   - If on `main` or `master`, stop and warn the user

2. **Verify the build passes**:
   - Run `yarn build` to ensure the project builds successfully
   - If the build fails, stop immediately and report the errors to the user
   - Do NOT proceed with version bump, changelog, or PR creation if build fails
   - User must fix build issues before creating a PR

3. **Check for uncommitted changes**:
   - Run `git status --porcelain` to check for any unstaged or uncommitted changes
   - If there are uncommitted changes, commit them in reasonable, logical groups:
     - Review the changes with `git diff` and `git diff --cached`
     - Group related changes together (e.g., all changes for one feature)
     - Create meaningful commit messages following conventional commit format
     - Use `git add` selectively for each logical group
     - Create commits with proper messages including Claude Code footer
   - If no uncommitted changes, proceed to next step

4. **Analyze changes** on this branch vs `main`:
   - Run `git log main..HEAD --oneline --no-merges`
   - Run `git diff main --stat`
   - Determine appropriate version bump (patch/minor/major)

5. **Read current CHANGELOG.md** to understand format and current version

6. **Ask user for version bump type** if not obvious:
   - Use AskUserQuestion tool to confirm patch/minor/major
   - Provide context about what changed to help them decide

7. **Bump the version**:
   - Run `yarn version:patch`, `yarn version:minor`, or `yarn version:major` based on decision
   - This updates package.json

8. **Update CHANGELOG.md**:
   - Read the updated package.json to get the new version number
   - Add new changelog entry with today's date (YYYY-MM-DD format)
   - Group changes by type (Added, Changed, Fixed, Removed)
   - Write clear, concise descriptions

9. **Commit the version bump and changelog**:
   - Add CHANGELOG.md and package.json
   - Create commit with message: `chore: prepare release v{version}`
   - Include Claude Code footer

10. **Push to remote**:
   - Run `git push -u origin {branch-name}`

11. **Generate PR markdown**:
   - Create a markdown-formatted PR title and body
   - Title format: `chore: {brief summary of changes}`
   - Body should include:
     - Summary section with bullet points of changes
     - Test plan checklist
     - Claude Code footer
   - Generate the GitHub PR creation URL in format:
     `https://github.com/{owner}/{repo}/compare/main...{branch-name}`

12. **Output the PR information** to the user:
   - Display the PR title
   - Display the PR body in a code block
   - Provide the GitHub URL link to create the PR manually
   - Instruct user to click the link, paste the body, and submit

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

## Example Output to User

After completing all steps, output something like:

```
## Pull Request Ready! 🚀

**Title:** `chore: add scheduled transaction features`

**Body:**
```markdown
## Summary
- Added schedule action dialog for update/delete scheduled transactions
- Extended scheduled record generation timeframes
- Fixed monthly schedule date calculation
- Filter dashboard to show only records up to end of current month

## Test plan
- [ ] Create a monthly scheduled transaction
- [ ] Verify dates are calculated correctly
- [ ] Test update single vs all occurrences
- [ ] Test delete single vs all occurrences
- [ ] Verify dashboard only shows current month records

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Create your PR here:**
👉 https://github.com/wanderyt/new-finance-fin-editor/compare/main...fin-editor

Instructions:
1. Click the link above
2. GitHub will auto-fill the title
3. Copy the body from above and paste it into the PR description
4. Click "Create pull request"
```

## Error Handling

- If on main/master branch, warn user and exit
- If no changes detected, inform user and exit
- If git push fails, check if branch already exists and provide guidance
- Always output the PR information even if automated creation isn't possible
