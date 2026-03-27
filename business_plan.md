# Business Plan: Managed Custom Ghost CMS Platform

## 1. Executive Summary
This business plan outlines the strategy for launching a specialized Software-as-a-Service (SaaS) platform built on top of a highly customized fork of the open-source Ghost CMS. Instead of hosting a single site, the platform acts as a managed hosting provider and control plane. It enables users to instantly deploy, manage, and edit their own isolated instances of Ghost, enhanced with proprietary, platform-specific tools (such as native SEO, advanced analytics, and custom themes) that are not available in the official Ghost distribution or Ghost(Pro).

## 2. Value Proposition
* **Beyond Vanilla Ghost:** By maintaining a custom fork of Ghost (`slegiot/Ghost`), the platform can inject powerful built-in features (e.g., an "SEO Copilot", bespoke page builders, localized AI integrations) directly into the Ghost Admin UI. 
* **Zero Configuration for Users:** Customers do not need to worry about servers, databases, or Mailgun SMTP. The platform handles all infrastructure, updates, and maintenance automatically.
* **Niche Focused:** While Ghost(Pro) targets general publishers, this platform can cater to specific niches (e.g., e-commerce content marketing, digital agencies, or specific geographic regions) by curating the exact feature set those audiences need.

## 3. Technical Architecture Strategy
Because Ghost explicitly does not support multi-tenancy (multiple websites sharing a single Node.js process and database), the platform will utilize a **Container-per-Customer Orchestration Model**.

### A. The "Golden Image" (The Core CMS)
*   **The Repository:** All custom features and UI changes are committed to the `slegiot/Ghost` fork.
*   **CI/CD Pipeline:** A GitHub Actions workflow automatically builds the repository into a production-ready, highly optimized Docker image (`ghcr.io/slegiot/ghost:latest`) upon every merge to `main`.
*   **Updates:** When a new feature is added, the new Docker image is pushed to the registry, allowing all customer instances to be seamlessly upgraded to the new version.

### B. The Control Plane (The Dashboard)
*   A centralized web application (e.g., built with Next.js or React) separate from Ghost.
*   **Functions:** Handles user authentication, onboarding, custom domain mapping, and Stripe subscriptions.
*   **Orchestration API:** When a user pays and clicks "Create Site", the Control Plane communicates with a cloud provider's API (such as Railway, AWS ECS, or Kubernetes). It instructs the cloud to spin up a new container using the "Golden Image", allocates a database, injects the platform's central Mailgun credentials, and provisions an SSL certificate.

### C. Infrastructure & Data Isolation
*   **Databases:** Each customer gets a logically isolated database (either a dedicated SQLite file for lower tiers or a segregated logical database on a shared MySQL server for higher tiers).
*   **Storage:** Images and assets are stored in a centralized S3 bucket (e.g., AWS S3 or Cloudflare R2) segmented by customer ID.
*   **Email (Mailgun):** The platform maintains a master Mailgun account. Mailgun API keys are injected into customer containers at boot, allowing the platform to manage all transactional emails and domain verified sending centrally.

## 4. Product Roadmap

### Phase 1: The Core Asset (Current Phase)
*   Establish the custom fork of Ghost.
*   Finalize the CI/CD pipeline to produce the Golden Docker Image.
*   Successfully deploy a proof-of-concept container (validated via Railway).
*   Begin building the first proprietary feature (e.g., the `seo-copilot` app).

### Phase 2: The Control Plane MVP (Months 1-3)
*   Build the Next.js Control Plane for user sign-ups and basic billing.
*   Write the provisioning script (utilizing the Railway Public API) to programmatically deploy a new Ghost container and MySQL database when a user signs up.
*   Implement custom domain routing via a reverse proxy (like Caddy or Cloudflare) so users can map `theirwebsite.com` to their Ghost container.

### Phase 3: Premium Feature Injection (Months 3-6)
*   Roll out custom React/Ember Ghost Admin modules.
*   Integrate centralized analytics directly into the dashboard.
*   Develop curated, locked theme templates specific to the target market.

### Phase 4: Scale and Automate (Months 6+)
*   Transition infrastructure from Railway to a dedicated Kubernetes cluster (or AWS ECS) to lower per-container unit economics.
*   Implement automated backup and restore functionality for users.

## 5. Revenue & Monetization Model
The platform will operate on a tiered subscription model, heavily indexed on standard SaaS metrics:

*   **Tier 1 (Starter):** Designed for individual creators. Limited to X amount of traffic / members. Uses shared infrastructure. ($15 - $29/mo)
*   **Tier 2 (Pro):** Includes all proprietary features (SEO tools, advanced integrations), custom domains, and increased newsletter sending limits. ($49 - $99/mo)
*   **Tier 3 (Agency/High-Volume):** Dedicated high-performance containers, multi-seat admin access, and white-labeled dashboards. ($199+/mo)

## 6. Competitive Advantage
This business sidesteps competing with massive platforms like WordPress by offering the speed and elegance of Ghost, while simultaneously outperforming the official Ghost(Pro) offering by providing highly specialized, opinionated tools that a specific target market desperately needs but cannot easily install themselves.
