# Palantir Technologies: Comprehensive Research for Build Now Challenge

*Research compiled: March 27, 2026*

---

## 1. Palantir's Main Products

### Gotham (Intelligence & Defense)
- **Purpose**: Intelligence analysis and defense operations
- **Users**: Government agencies, intelligence community, military, law enforcement
- **Key capabilities**:
  - Connects previously siloed classified databases
  - Geospatial analysis, alerts, and prediction
  - Finds unknown connections across massive datasets (e.g., linking a terrorist financier to a bomb builder)
  - Used for counterterrorism, battlefield command, fraud detection
  - Powers the Maven Smart System (see section 6)

### Foundry (Commercial & Civil)
- **Purpose**: Enterprise data integration and operational decision-making platform
- **Users**: Commercial enterprises, healthcare, supply chain, financial services, manufacturing
- **Key capabilities**:
  - Centralizes all organizational data, cleans it, and enables analysis
  - Creates a **digital twin** of the organization via the Ontology layer
  - Connects digital assets to real-world assets (facilities, equipment, products)
  - Runs simulations, automates processes, builds custom applications
  - Low-code (Workshop) and pro-code (OSDK) application building
  - Data pipelines (Pipeline Builder) for ETL and transformation

### Apollo (Continuous Delivery)
- **Purpose**: Software deployment and lifecycle management
- **Users**: Internal (deploys Gotham/Foundry) + external customers
- **Key capabilities**:
  - Continuous software delivery system for remote installation and updates
  - Abstracts deployment complexity across environments: public cloud, private cloud, on-prem, edge, IoT, classified networks
  - External software companies can buy Apollo to autonomously deploy their own software
  - Enables Palantir to operate in air-gapped and disconnected environments

### AIP (Artificial Intelligence Platform)
- **Purpose**: Connect AI/LLMs to enterprise data and operations
- **Launched**: 2023, now the fastest-growing product
- **See detailed breakdown in Section 2**

---

## 2. AIP (Artificial Intelligence Platform) Deep Dive

### What AIP Is
AIP is an integrated layer that connects large language models (LLMs) and AI with an organization's data and operations. It sits on top of Foundry and uses the Ontology as its semantic backbone. AIP enables enterprises to "activate full spectrum AI in days and drive enterprise operations."

### Core Architecture Layers
1. **Semantic Data Layer**: Multi-modal data foundation (structured, unstructured, streaming, geospatial)
2. **Dynamic Logic Layer**: LLM-driven functions tested without coding
3. **Kinetic Action Layer**: Bounded, scoped AI automations
4. **Granular AI Guardrails**: Role and classification-based access controls with comprehensive auditing

### Key AIP Components

#### AIP Logic
- **No-code development environment** for building LLM-powered functions
- Block-based design with four core block types:
  - Variable creation blocks
  - Object property retrieval blocks
  - LLM invocation blocks
  - Data transformation blocks
- Supports branching and modular design
- Includes evaluation frameworks (AIP Evals) for testing

#### AIP Agent Studio
- Build interactive AI assistants (Agents) equipped with enterprise-specific information and tools
- Agents are powered by LLMs + Ontology + documents + custom tools
- Instructions, tool descriptions, and variable descriptions compile into the raw LLM system prompt
- Embeddings help identify relevant documents and context
- Context window includes: system prompt, conversation history, retrieval context, application state, and tools
- Deployable internally in platform AND externally through OSDK and APIs
- Built on Palantir's rigorous security model -- LLM gets access only to what's needed

#### AIP Evals
- Create evaluation suites and run experiments
- Measure AI performance systematically

#### AIP Analyst
- Configuration framework for analysis workflows

#### AIP Assist
- Documentation integration enabling custom content sources

#### AIP Automate
- Event-triggered, boundary-constrained automation
- Pre-execution analysis via AIP Scenarios

#### Other AIP Features
- **Vector Management**: Enterprise embedding and vector database capabilities
- **Tool Factory**: Convert existing data and processes into AI-accessible tools
- **Document Intelligence**: Extraction strategy deployment
- **AIP Threads**: Conversation management infrastructure

### LLM Integration
- Provider-agnostic interface supporting multiple LLMs
- Bring-your-own-model strategies supported
- User prompts processed securely through third-party-hosted LLM providers
- Palantir security protocols maintained for sensitive data

### How AIP Connects to the Ontology
The Ontology integrates three critical dimensions for AIP:
1. **Enterprise Data Connection**: Integrates real-time data from all sources into a semantic model, reducing hallucination risks
2. **Business Logic Integration**: Binds AI reasoning to traditional business logic, ML models, optimizers
3. **Systems of Action**: AI can safely synchronize decisions back to operational databases, edge platforms, etc., with human validation and audit trails

---

## 3. The Ontology (Palantir's Core Concept)

### What It Is
The Ontology is the **operational layer** that sits on top of all integrated digital assets (datasets, virtual tables, models) and connects them to their real-world counterparts. It serves as a **digital twin** of the organization.

### Semantic Elements (Structure)
- **Object Types**: Represent real-world entities (patients, orders, equipment, transactions). Mapped from existing datasources with rich metadata and granular security.
- **Properties**: Fields within object types. Support formatting, conditional display, and derived calculations.
- **Link Types**: Define relationships between objects (e.g., Patient -> Diagnosis, Order -> Product).
- **Interfaces**: Enable object type polymorphism -- consistent modeling of object types that share a common shape.

### Kinetic Elements (Behavior)
- **Action Types**: Capture operator data and orchestrate decision-making. Connect to existing systems. Examples: update order status, assign tasks, approve requests.
- **Functions**: Enable business logic with arbitrary complexity. Support TypeScript, Python, and other languages.
- **Dynamic Security**: Granular access controls at the object level.

### How Pipelines Fit In
- Data pipelines are built to prepare datasets that back Ontology object types
- Pipeline Builder is a visual tool for constructing ETL/transformation pipelines
- Pipelines ensure data freshness and quality for the Ontology
- Checks can be applied to ensure object types are resilient to upstream data changes

### How Workshop Fits In
- **Workshop** is a low-code application builder that reads from the Object Data Layer
- Uses the Ontology as its primary building block
- All data in Workshop comes from object types, properties, and links
- Enables building operational applications (dashboards, inboxes, COPs)
- Custom widgets allow pro-code extensions when needed
- Example patterns: task management inboxes, situational awareness dashboards, operational control centers

---

## 4. What Palantir Values

### Company Philosophy
- **Mission**: "Build software that solves problems and partner with the most important institutions in the world"
- **Operating mission**: Enable organizations to make sense of their data and solve complex, critical problems
- Seeks out the **most critical problems** that pose threats to public institutions, commercial enterprises, and the people they serve
- Founded on the conviction that privacy and civil liberties must be preserved while using data

### The Unconventional Palantir Principles (from Lenny's Newsletter)
1. **Forward-deploy your engineering** -- Engineers work directly on-site with customers 4-5 days/week
2. **Hire the absolute greatest people who exist** -- Extreme talent bar
3. **No salespeople -- engineers do sales** -- Technical people in the room, not traditional sales
4. **Solve the hardest problems first** -- Tackle complexity head-on
5. **Experiment with live products** -- Rapid iteration in production
6. **Build features that magnify value over time** -- Compounding platform value
7. **Think from first principles** -- Get to the core of what is true, multiple layers beneath the surface

### Values-Based Operations
- Refused business from authoritarian regimes
- Won't work with corporations misaligned with core beliefs
- Strong emphasis on ethics and privacy in product design
- Comprehensive civil liberties protections built into products

### Problems They Care About
- **Defense & Intelligence**: Counterterrorism, battlefield command, military logistics, targeting
- **Healthcare**: Hospital operations, drug interaction detection, clinical decision support, supply chain
- **Supply Chain**: Production optimization, inventory management, logistics
- **Financial Services**: Fraud detection, compliance, risk management
- **Energy & Manufacturing**: Asset optimization, predictive maintenance
- **Government**: Pandemic response, disaster management, immigration

### What They Look for in People
- Highly analytical approach
- Eagerness to solve technical problems with data structures, storage systems, cloud infra, frontend frameworks
- Experience or curiosity about using large-scale data to take on valuable business problems
- Ability to collaborate with technical and non-technical individuals
- Comfortable in dynamic environments with evolving objectives
- **Technical creativity** combined with **rapid delivery**

---

## 5. The "Build Now" Challenge

### What It Is
A recruiting competition where candidates build a functional workflow using Palantir Foundry and AIP. Successful submissions can **fast-track candidates** through the interview process.

### Submission Format
- Create a **<4 minute video** (unlisted YouTube link) demonstrating your build
- Email to your recruiter or build-now@palantir.com
- Subject line: `LASTNAME_FIRSTNAME_BUILDNOW_SUBMISSION`

### What to Show in the Video
1. **Why you chose your problem** -- What motivated this direction
2. **How you approached it** -- Technical decisions and data manipulation choices
3. **Who your users are** -- Who benefits from this workflow
4. **The impact you expect** -- What real-world value this drives

### Evaluation
- Reviewed by a team of **Forward Deployed Engineers** and **Deployment Strategists**
- They want to see: **creativity, ambition, and perspective**
- There is **no single right way** -- they want to see what direction YOU choose and why
- The intentional lack of direction is the point: "You might think you're lacking enough direction to confidently get started, but that's the point"

### Problem Options
You can either:
1. **Choose your own problem** -- Leverage AIP to solve a problem you face today
2. **Respond to provided prompts** -- Past examples include healthcare-focused challenges:
   - Extract diagnoses from patient notes and highlight concerns for clinicians
   - Predict hospital admission rates using ICD-10 code patterns
   - Use NLP to identify unsafe drug interactions from patient notes
   - Model healthcare costs by analyzing utilization patterns

### How to Get Platform Access
- Sign up for a **free Developer Tier account** at build.palantir.com or palantir.com/developers
- Requires: name, email, phone, address, photo ID, selfie, credit card (for identity verification only, not charged)
- Access to AIP Now platform (aip.palantir.com)

### Resources for Building
- **learn.palantir.com** -- Crash courses, "Speedrun: Your First End-to-End Workflow" (60 min)
- **Palantir Developer Community** (community.palantir.com) -- Forums, feedback, showcase
- **Foundry and AIP documentation** (palantir.com/docs/foundry)
- **AIP Community Registry** (github.com/palantir/aip-community-registry) -- 28+ community-built example apps
- **Examples library** on the platform -- Reference examples, tutorials, starter kits

### Past Build Now Submission Example (Hospitals)
- **Dataset provided**: Patient notes (PMC_Patient_clean.csv) and ICD-10 codes with vector embeddings
- **Deadline was**: October 18, 2024 (for that specific cohort)
- **Key insight**: Emphasis on exploratory problem-solving over prescribed solutions

### Tips for a Strong Submission
1. **Pick a real problem** that matters -- show you understand impact
2. **Use the Ontology** -- model real-world entities, not just raw data
3. **Integrate AIP/LLMs** meaningfully -- don't bolt on AI for show
4. **Think like an FDE** -- who is the user, what decision are they making, what workflow does this enable
5. **Show the "why"** -- your perspective on the problem matters more than technical polish
6. **Keep it functional** -- it needs to actually work, not just be a mockup
7. **Be ambitious** -- Palantir values tackling hard problems

---

## 6. Palantir's Public APIs and Developer Tools

### Ontology SDK (OSDK) -- The Core Developer Tool
- **What**: Auto-generated, type-safe SDK from your Ontology
- **Languages**: TypeScript (NPM), Python (Pip/Conda), Java (Maven), any language (via OpenAPI spec)
- **Capabilities**:
  - Read/write data to the Ontology
  - Apply actions to update data
  - Call functions and AIP Logic functions
  - Type-safe with auto-generated types from your Ontology schema
  - Scoped security tokens (secure by design)
- **GitHub repos**:
  - TypeScript: github.com/palantir/osdk-ts (Node 18+, 20, 22, 24)
  - Python: github.com/palantir/foundry-platform-python (Python 3.9 - 3.12)
  - TypeScript Platform SDK: github.com/palantir/foundry-platform-typescript

### Foundry REST API
- Developer-friendly REST API for interacting with Foundry
- Uses OAuth 2.0 for authentication
- Manage datasets, users, groups, builds, schedules programmatically

### Developer Console
- Central hub for creating applications, generating OSDKs, managing API keys
- Enforces API-level security for scoped applications (as of Spring 2025)

### Code Workspaces
- VS Code-like IDE integrated with the Palantir platform
- Build React applications while accessing platform capabilities
- Connects directly to Developer Console

### Palantir MCP (Model Context Protocol)
- Allows AI IDEs and AI agents to autonomously build end-to-end applications
- Covers data integration, ontology configuration, and application development

### Compute Modules
- Containerized environments for deploying custom code
- Any language supported
- Run ML models within Foundry workflows
- Deploy interactive containers on the platform

### Custom Endpoints
- Configure and deploy user-defined API endpoints
- Customized URL patterns and specifications
- Backed by ontology actions and functions

### AIP Community Registry (github.com/palantir/aip-community-registry)
- 28+ community-built applications and projects
- Primarily TypeScript (87.6%), Python (4.7%), JavaScript (3.5%)
- Example projects:
  - MetroCycle (bike-sharing management)
  - Fashion Assistant (Computer Vision outfit recommendations)
  - Meal Planning (recipe generation from fridge photos)
  - Trip Planner (LLM-powered itinerary generation)
  - Expense Reporting, Small Business Connector
  - OSDK and Compute Module tutorials
  - Geocoding integrations, Gmail modules
  - Disaster response applications

---

## 7. Recent Palantir News (2025-2026) -- What's Hot

### Pentagon Maven AI -- Core Military System (March 2026)
- Pentagon formally designated Maven Smart System as an **official program of record across all five military branches**
- Investment grew from $480M (2024) to **$13 billion** program
- Maven ingests data from 150+ sources (satellite, drone, radar, IR, SIGINT, geolocation)
- Can generate **1,000 targeting recommendations per hour**
- 20,000+ active users (quadrupled since March 2024)
- Used in 2021 Kabul airlift, Ukraine 2022, Operation Epic Fury against Iran 2026
- NATO acquired a version in March 2025

### $10 Billion Army Contract (August 2025)
- Enterprise agreement to consolidate data and software systems across the U.S. Army
- Decade-long commitment

### TITAN Platform
- Army's next-gen intelligence ground station with AI/ML
- First-of-its-kind modernization: mobile ground station harnessing AI for space sensor data
- Assists soldiers with warfare strategy and targeting

### ShipOS with U.S. Navy (March 2026)
- Strategic collaboration with Keel Holdings and the Navy
- Up to $448 million to modernize the maritime defense industrial base

### Airbus Skywise Expansion (February 2026)
- Multi-year agreement extended for aviation data platform
- Now serves 50,000+ daily users

### Financial Performance
- **Q4 2025**: 70% year-over-year revenue growth, 41% operating margins
- **U.S. commercial revenue**: Up 71% YoY, broke $1B annual run rate in Q1 2025
- **FY 2026 forecast**: 60-61% revenue growth, targeting ~$7.19B revenue
- AIP bootcamps: 1,300+ completed, ~75% conversion rate

### AIP Adoption Highlights
- Walgreens deployed AI-powered workflows to 4,000 stores in 8 months
- Construction company developed production-ready use case providing $10M savings in a 2-day bootcamp
- Healthcare division now 15% of commercial revenue (~$702M in 2024)

### DevCon History
- **DevCon 1** (Nov 2024): First developer conference, 150 attendees, launched OSDK 2.0, Platform APIs, Workflow Builder, Agent Studio beta
- **DevCon 2** (Feb 2025, Palo Alto): Showcased Foundry at the edge
- **DevCon 3**: Announced/planned
- **AIPCon 8** (Sep 2025): 70+ speakers, commercial customer showcase

### Key Themes for 2025-2026
1. **AI Agents in production** -- Not demos, real operational agents in enterprises
2. **Defense AI dominance** -- Maven, TITAN, NATO expansion
3. **Developer ecosystem growth** -- OSDK, MCP, community registry, DevCon
4. **AIP bootcamp GTM strategy** -- Fastest-growing sales channel
5. **Edge deployment** -- Running AI at the edge, disconnected environments
6. **Autonomous operations** -- AI agents compressing decision timelines
7. **Healthcare and supply chain** -- Expanding commercial verticals

---

## 8. Key Terminology Glossary

| Term | Definition |
|------|-----------|
| **Ontology** | Semantic layer mapping digital data to real-world entities; Palantir's "digital twin" concept |
| **Object Type** | A category of real-world entity (e.g., Patient, Order, Equipment) |
| **Property** | An attribute of an object type (e.g., Patient.name, Order.status) |
| **Link Type** | A relationship between object types (e.g., Patient has Diagnosis) |
| **Action** | An operation that modifies the Ontology (e.g., update status, assign task) |
| **Function** | Business logic written in TypeScript/Python that runs against the Ontology |
| **Pipeline** | Data transformation flow that prepares raw data for the Ontology |
| **Workshop** | Low-code application builder for operational UIs |
| **OSDK** | Ontology Software Development Kit -- type-safe SDK generated from your Ontology |
| **AIP Logic** | No-code block-based builder for LLM-powered functions |
| **AIP Agent Studio** | Builder for AI agents with tools, context, and Ontology access |
| **AIP Evals** | Testing and evaluation framework for AI functions |
| **Compute Module** | Containerized custom code running on the Palantir platform |
| **FDE/FDSE** | Forward Deployed (Software) Engineer -- Palantir's on-site problem solvers |
| **Deployment Strategist** | Bridge between technology and operational priorities |
| **Apollo** | Continuous delivery system for deploying software across any environment |
| **Maven** | Pentagon's AI system for military intelligence, built on Palantir |
| **TITAN** | Army's AI-powered mobile intelligence ground station |

---

## Sources

- [Palantir AIP Overview](https://www.palantir.com/platforms/aip/)
- [AIP Documentation](https://www.palantir.com/docs/foundry/aip/overview)
- [AIP Features](https://www.palantir.com/docs/foundry/aip/aip-features)
- [AIP Capabilities](https://www.palantir.com/docs/foundry/platform-overview/aip-capabilities)
- [Palantir Ontology](https://www.palantir.com/platforms/ontology/)
- [Ontology Documentation](https://www.palantir.com/docs/foundry/ontology/overview)
- [Ontology SDK Overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)
- [Developer Toolchain](https://www.palantir.com/docs/foundry/dev-toolchain/overview)
- [AIP Agent Studio](https://www.palantir.com/docs/foundry/agent-studio/overview)
- [AIP Logic](https://www.palantir.com/docs/foundry/logic/overview)
- [Workshop Overview](https://www.palantir.com/docs/foundry/workshop/overview)
- [Palantir Platforms](https://www.palantir.com/platforms/)
- [Palantir About](https://www.palantir.com/about/)
- [Build Challenge](https://palantir.events/buildingchallenge)
- [Build with AIP](https://build.palantir.com/)
- [AIP Now](https://aip.palantir.com/)
- [Palantir Learn](https://learn.palantir.com/)
- [AIP Community Registry (GitHub)](https://github.com/palantir/aip-community-registry)
- [OSDK TypeScript (GitHub)](https://github.com/palantir/osdk-ts)
- [Foundry Platform Python SDK (GitHub)](https://github.com/palantir/foundry-platform-python)
- [Foundry Platform TypeScript SDK (GitHub)](https://github.com/palantir/foundry-platform-typescript)
- [Palantir for Developers](https://www.palantir.com/developers/)
- [AIP for Developers](https://www.palantir.com/aip/developers/)
- [Palantir Developer Community](https://community.palantir.com/)
- [What Does Palantir Actually Do? (Financhle)](https://financhle.com/articles/what-does-palantir-actually-do)
- [Unconventional Palantir Principles (Lenny's Newsletter)](https://www.lennysnewsletter.com/p/the-unconventional-palantir-principles)
- [Inside Palantir (Lenny's Newsletter)](https://www.lennysnewsletter.com/p/inside-palantir-nabeel-qureshi)
- [Forward Deployed Engineers (Pragmatic Engineer)](https://newsletter.pragmaticengineer.com/p/forward-deployed-engineers)
- [Palantir FDE Blog Post](https://blog.palantir.com/a-day-in-the-life-of-a-palantir-forward-deployed-software-engineer-45ef2de257b1)
- [Build Now Hospitals Example](https://joshweiner.github.io/zelus-palantir-hospitals/)
- [Ontology and Pipeline Design Principles](https://community.palantir.com/t/ontology-and-pipeline-design-principles/5481)
- [AIP Architecture Overview](https://www.palantir.com/docs/foundry/architecture-center/aip-architecture)
- [Pentagon Maven AI (Tom's Hardware)](https://www.tomshardware.com/tech-industry/artificial-intelligence/pentagon-formalizes-palantirs-maven-ai-as-a-core-military-system-with-multi-year-funding-platforms-investment-grows-to-usd13-billion-from-usd480-million-in-2024)
- [Pentagon Expands Palantir (Military.com)](https://www.military.com/feature/2026/03/22/pentagon-expands-palantirs-role-ai-contract.html)
- [$10B Army Contract (CNBC)](https://www.cnbc.com/2025/08/01/palantir-lands-10-billion-army-software-and-data-contract.html)
- [TITAN Platform](https://www.palantir.com/titan/)
- [Palantir Defense Army](https://www.palantir.com/offerings/defense/army/)
- [DevCon Launch](https://investors.palantir.com/news-details/2024/Palantir-Launches-AIP-for-Developers-at-DevCon/)
- [AIPCon 8](https://www.businesswire.com/news/home/20250904025905/en/A-New-Set-of-Palantir-Customers-Takes-the-Spotlight-at-AIPCon-8)
- [AIP Bootcamps Blog](https://blog.palantir.com/deploying-full-spectrum-ai-in-days-how-aip-bootcamps-work-21829ec8d560)
- [Palantir and NVIDIA Partnership](https://nvidianews.nvidia.com/news/nvidia-palantir-ai-enterprise-data-intelligence)
- [AIP Adoption (Nasdaq)](https://www.nasdaq.com/articles/palantirs-aip-platform-sees-soaring-adoption-across-enterprises-revised)
- [Palantir Healthcare - Option Care Health](https://investors.optioncarehealth.com/news-releases/news-release-details/option-care-health-selects-palantirs-artificial-intelligence)
- [Cardinal Health + Palantir](https://newsroom.cardinalhealth.com/2023-01-26-Cardinal-Health-Teams-Up-with-Palantir-to-Deliver-a-Clinically-Integrated-Supply-Chain-Solution)
- [Palantir Privacy Principles](https://www.palantir.com/pcl/principles/)
- [Palantir Connecting AI to Decisions (Blog)](https://blog.palantir.com/connecting-ai-to-decisions-with-the-palantir-ontology-c73f7b0a1a72)
