# Release Guide

Use this process for every new release: feature releases, bug-fix releases, or releases that include both.

## 1. Choose the version bump

This project uses SemVer: `MAJOR.MINOR.PATCH`.

- Bug fix: bump `PATCH`
  - `0.0.2` → `0.0.3`
- New backward-compatible feature: bump `MINOR`
  - `0.0.2` → `0.1.0`
- Breaking change: bump `MAJOR`
  - `1.2.3` → `2.0.0`

While the extension is still `0.x`, use `MINOR` for new features and `PATCH` for bug fixes.

## 2. Create a working branch

Feature:

```bash
git checkout main
git pull origin main
git checkout -b feature/<short-name>
```

Bug fix:

```bash
git checkout main
git pull origin main
git checkout -b fix/<short-name>
```

Feature and bug fix in the same release:

```bash
git checkout main
git pull origin main
git checkout -b release/<version>
```

Example:

```bash
git checkout -b fix/marketplace-runtime-bundle
```

## 3. Code and test locally

Run before committing:

```bash
npm run compile
npm run package
```

If VS Code behavior changes:

1. Press `F5` to open an Extension Development Host.
2. Test the command palette.
3. Test the status bar item.
4. Test server start and stop.
5. Test Markdown live reload.
6. Test Mermaid blocks if relevant.

## 4. Update documentation

If behavior changes, update:

- `README.md`
- `CHANGELOG.md`
- `sample.md` if the demo changes

`CHANGELOG.md` should include the new version:

```markdown
## 0.0.3

- Fixed ...
- Added ...
```

## 5. Commit the branch

```bash
git status
git diff
```

Stage the relevant files:

```bash
git add <files>
```

Bug-fix commit:

```bash
git commit -m "Fix <short description>"
```

Feature commit:

```bash
git commit -m "Add <short description>"
```

Release-prep commit:

```bash
git commit -m "Prepare <version> release"
```

## 6. Push the branch and open a pull request

```bash
git push -u origin <branch-name>
```

Example PR title:

```text
Fix Marketplace runtime package
```

Example PR body:

```markdown
## Summary
- ...
- ...

## Test plan
- npm run compile
- npm run package
- Manual test in Extension Development Host
```

Wait for CI to pass, then merge the PR into `main`.

## 7. Sync local main after merge

```bash
git checkout main
git pull origin main
```

## 8. Bump the version

Bug fix:

```bash
npm version patch
```

Feature:

```bash
npm version minor
```

Breaking change:

```bash
npm version major
```

`npm version` will:

- update `package.json`
- update `package-lock.json`
- create a version commit
- create a git tag such as `v0.0.3`

If you already changed the version in `package.json` manually, do not run `npm version`. Create the tag manually instead:

```bash
git tag v0.0.3
```

## 9. Push main and the tag

If you used `npm version`:

```bash
git push origin main --follow-tags
```

If you created the tag manually:

```bash
git push origin main
git push origin v0.0.3
```

Pushing a `v*.*.*` tag triggers `.github/workflows/release.yml`.

## 10. Publish to the Visual Studio Marketplace

### Option A: GitHub Actions publish

Required GitHub repository secret:

```text
VSCE_PAT
```

The secret must be an Azure DevOps PAT with Marketplace `Manage` scope.

When a `v*.*.*` tag is pushed, the release workflow will:

1. install dependencies
2. compile the extension
3. package the `.vsix`
4. publish to the Visual Studio Marketplace if `VSCE_PAT` exists
5. create a GitHub Release with the `.vsix` file attached

### Option B: Manual upload

Build locally:

```bash
npm run package
```

Upload this file:

```text
md-live-server-<version>.vsix
```

Publisher page:

```text
https://marketplace.visualstudio.com/manage/publishers/tuld01061
```

Select the existing extension, choose `Update`, upload the `.vsix`, and submit.

## 11. Verify after publish

After the Marketplace version is live:

1. Uninstall the old extension in VS Code.
2. Reload VS Code.
3. Install or update the new version from the Marketplace.
4. Open the Command Palette.
5. Search for:

```text
Start Markdown Live Server
```

6. Confirm the status bar shows:

```text
Start MD Live Server
```

7. Start the server with `sample.md`.
8. Edit the file and confirm the browser updates.

## 12. Fast hotfix process

Use this when the live Marketplace version has a serious bug.

```bash
git checkout main
git pull origin main
git checkout -b fix/<bug-name>
# fix code
npm run compile
npm run package
git add <files>
git commit -m "Fix <bug-name>"
git push -u origin fix/<bug-name>
```

Open a PR, merge it, then run:

```bash
git checkout main
git pull origin main
npm version patch
git push origin main --follow-tags
```

If you do not use `VSCE_PAT`, upload the `.vsix` manually.

## 13. Pre-release checklist

- [ ] Version has not been published to the Marketplace before.
- [ ] `CHANGELOG.md` includes the new version.
- [ ] `npm run compile` passes.
- [ ] `npm run package` passes.
- [ ] VSIX installs locally.
- [ ] Commands register correctly.
- [ ] Status bar appears correctly.
- [ ] Markdown preview works.
- [ ] Live reload works.
- [ ] PR is merged into `main`.
- [ ] Tag `vX.Y.Z` is pushed.
- [ ] Marketplace update is live.
- [ ] GitHub Release includes the `.vsix` file.
