# Hosting Todd’s Lock Analytics on GitHub Pages

This project includes a static GitHub Pages build alongside the existing ChatGPT Sites build. The Pages version uses the same React dashboard and lock data.

## 1. Create the GitHub repository

1. Sign in to GitHub and select **New repository**.
2. Name it, for example, `todd-lock-analytics`.
3. Choose **Public**. GitHub Pages can also work with private repositories on plans that support it.
4. Do not add a README, `.gitignore`, or license when creating the repository because this project already contains files.
5. Select **Create repository**.

## 2. Push this project

From a terminal opened in this project folder, run:

```bash
git remote add github https://github.com/YOUR-USERNAME/todd-lock-analytics.git
git push -u github main
```

Replace `YOUR-USERNAME` and the repository name if you chose a different name. If a `github` remote already exists, update it with:

```bash
git remote set-url github https://github.com/YOUR-USERNAME/todd-lock-analytics.git
git push -u github main
```

GitHub may ask you to authenticate with GitHub CLI, a browser sign-in, or a personal access token.

## 3. Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and select **Deploy GitHub Pages**.
5. Open **Actions → Deploy GitHub Pages** and select **Run workflow**.
6. Wait for both the `build` and `deploy` jobs to finish successfully.

The published address will normally be:

```text
https://YOUR-USERNAME.github.io/todd-lock-analytics/
```

The workflow asks GitHub Pages for the exact published base path before building. This supports normal project repositories, `YOUR-USERNAME.github.io` repositories, and custom domains without source edits.

## 4. Update the site

Edit the project locally, then run:

```bash
npm ci
npm run build:pages
npm run lint
git add .
git commit -m "Update lock analytics"
git push github main
```

Every push starts `.github/workflows/pages.yml` and republishes the Pages site. This avoids a missed deployment if the repository's default branch is named something other than `main`.

## 5. Daily lock-data refresh

`.github/workflows/refresh-profile.yml` checks Todd’s public LPU profile every day at 8:00 AM in `America/New_York`. It runs at the correct local hour through Eastern daylight-saving changes.

The workflow reads the public LPU profile and catalog, regenerates `app/data.ts`, validates the static build, and commits only when the profile changed. The refresh workflow deploys its validated artifact directly; commits made with `GITHUB_TOKEN` do not start another push workflow. Both deployment workflows reject stale build artifacts.

After pushing the repository:

1. Open **Settings → Actions → General**.
2. Under **Workflow permissions**, choose **Read and write permissions**.
3. Select **Save**.
4. Open **Actions → Refresh LPU profile data → Run workflow** once to test it.
5. Confirm the run says either `Profile data is already current` or creates a `Refresh LPU profile data` commit.

To refresh manually on your computer, run:

```bash
npm run refresh:data
npm run format -- app/data.ts
npm run build:pages
```

## Local preview

Build the static version with:

```bash
npm run build:pages
```

The finished static files are written to `dist-pages/`. Do not commit that folder; GitHub Actions builds it during deployment.

## Troubleshooting

- **404 after deployment:** Confirm **Settings → Pages → Source** is set to **GitHub Actions**. Open **Actions → Deploy GitHub Pages**, select **Run workflow** on the default branch, and use the exact URL shown by the completed `deploy` job. The workflow verifies that `index.html` is at the root of the uploaded Pages artifact.
- **Blank page or missing styles:** Confirm the full repository was pushed, including `vite.github-pages.config.ts` and `github-pages/`.
- **Workflow fails during install:** Use Node.js 22 locally and commit `package-lock.json`.
- **Changes are not visible:** Check the latest workflow in the **Actions** tab and hard-refresh after it succeeds.
- **Custom domain:** Add the domain in **Settings → Pages**, then follow GitHub’s DNS instructions. Enable **Enforce HTTPS** after DNS verification succeeds.
