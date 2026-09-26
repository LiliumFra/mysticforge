<div align="center">

<img src="./docs/readme-banner.svg" alt="MysticForge — security-aware AI agent resource discovery" width="100%" />

</div>

<div align="center">

# MysticForge

**A curated hub for Agent Skills, MCP prompts and editor rules — with security-aware discovery and ready-to-use packs.**

[Live site](https://mysticforge-six.vercel.app) · [Catalog](https://mysticforge-six.vercel.app/catalog) · [Architecture](#architecture) · [Security](#security-model)

</div>

---

## What it is

MysticForge helps developers discover, evaluate and reuse resources for AI-agent workflows without digging through scattered repositories.

The platform indexes resources such as **Agent Skills**, **MCP prompts** and **Cursor/editor rules**, adds structured metadata and security signals, and exposes them through a searchable catalog and curated packs.

## Product highlights

| Area | What MysticForge provides |
| --- | --- |
| **Discovery** | Searchable catalog with categories, tags and popularity signals |
| **Security context** | Automated security scoring and quarantine support for suspicious resources |
| **Curated packs** | Thematic collections that group compatible resources |
| **Resource pages** | Dedicated pages with metadata, source information and download actions |
| **Internationalization** | Locale-aware UI powered by `next-intl` |
| **Fresh data** | Server-rendered data with short revalidation windows |
| **Administration** | Internal publishing and curation workflows |

## Stack

- **Next.js 16** with the App Router
- **React 19**
- **TypeScript**
- **Supabase**
- **Tailwind CSS 4**
- **Radix UI / shadcn**
- **Framer Motion**
- **next-intl**
- **Octokit**
- **Zod**
- **Shiki**

## Architecture

```text
src/
├── app/
│   ├── admin/        # curation and administration
│   ├── api/          # server endpoints
│   ├── catalog/      # discovery and resource detail pages
│   ├── packs/        # curated collections
│   └── page.tsx      # landing page
├── components/       # product UI
├── i18n/             # localization
└── lib/              # Supabase and shared application logic

supabase/              # database-side resources and migrations
messages/              # locale message catalogs
scripts/               # repository utilities
```

## Local development

Requirements: a recent Node.js release and the environment variables required by the Supabase integration.

```bash
git clone https://github.com/LiliumFra/mysticforge.git
cd mysticforge
npm install
npm run dev
```

Then open `http://localhost:3000`.

Useful checks:

```bash
npm run lint
npm run build
```

## Security model

MysticForge treats third-party agent resources as **untrusted input**. The product includes security scoring and quarantine concepts so discovery does not imply trust.

Before using any downloaded resource in a privileged environment, review its source, permissions, instructions and external dependencies.

## Repository status

MysticForge is under active development. The public repository contains the web application; production data and deployment credentials are intentionally kept outside source control.

---

<div align="center">

Built as a practical directory for the rapidly growing AI-agent ecosystem.

</div>
