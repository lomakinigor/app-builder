# Data Model

## Rules
1. Schema changes must follow this sequence: **data-model update → plan update → tasks for migrations and refactors → code**.
2. No entity field is added, removed, or renamed in code without a corresponding update to this document first.
3. All research inputs, whether generated inside the application or imported from external work, must be normalized into one active `ResearchBrief` before downstream use.

---

## Core entities

### Project
Fields:
- id: string
- name: string
- projectType: ProjectType  ← 'app' | 'website'; set at project creation; influences generated spec and architecture language
- createdAt: string (ISO)
- updatedAt: string (ISO)
- status: ProjectStatus
- currentStage: ProjectStage  ← tracks which Superpowers cycle stage is active

Relations:
- has one IdeaDraft                     (cycle: Brainstorm)
- has many ResearchRuns                 (cycle: Spec)
- has many ImportedResearchArtifacts    (cycle: Spec)
- has many ResearchSources              (cycle: Spec)
- has one active ResearchBrief          (cycle: Spec)
- has one active SpecPack               (cycle: Spec → Plan gateway)
- has one active ArchitectureDraft      (cycle: Plan)
- has many PromptIterations             (cycle: Tasks → Code+Tests → Review)

Used by: F-001, F-008, F-024, F-025 — US-001, US-013, US-014, US-015

---

### IdeaDraft
Fields:
- title: string
- rawIdea: string
- targetUser: string
- problem: string
- constraints: string
- notes: string

Relations:
- belongs to one Project

Used by: F-001 — US-001, US-002

---

### ResearchProvider
Fields:
- id: string
- name: string
- type: string
- supportsModelSelection: boolean
- supportsDeepResearch: boolean
- status: string

Relations:
- referenced by ResearchRun.providerId

Used by: F-002 — US-003

---

### ResearchRun
Fields:
- id: string
- providerId: string
- mode: ResearchMode
- status: RunStatus
- startedAt: string (ISO)
- finishedAt: string (ISO) | null
- inputSummary: string

Relations:
- belongs to one Project
- may produce one ResearchSource (kind=generated_in_app)

Used by: F-002 — US-003

---

### ImportedResearchArtifact
Fields:
- id: string
- projectId: string
- title: string
- sourceType: ResearchSourceType
- sourceLabel: string
- rawContent: string
- importedAt: string (ISO)
- notes: string

Relations:
- belongs to one Project
- may produce one ResearchSource (kind=perplexity_export | chat_export | pasted_summary | etc.)

Used by: F-003, F-013 — US-004, US-005

---

### ResearchSource
Fields:
- id: string
- kind: ResearchSourceType
- label: string
- origin: string
- linkedRunId: string | null
- linkedArtifactId: string | null

Relations:
- belongs to one Project
- linked to one ResearchRun or one ImportedResearchArtifact

Used by: F-003, F-004 — US-005

---

### ResearchBrief
Fields:
- problemSummary: string
- targetUsers: string[]
- valueHypothesis: string
- competitorNotes: string
- risks: string[]
- opportunities: string[]
- recommendedMVP: string
- openQuestions: string[]
- sourcesNote: string
- sourceIds: string[]
- briefSource: 'generated' | 'imported' | 'manual'

Relations:
- one active brief per Project (stored directly in project store)
- input to SpecPack generation

Used by: F-003, F-004, F-005, F-009 — US-005, US-006, US-007

---

### SpecPack
Fields:
- productSummary: string
- MVPScope: string
- featureList: SpecFeature[]
- assumptions: string[]
- constraints: string[]
- acceptanceNotes: string

Relations:
- one active SpecPack per Project
- input to ArchitectureDraft generation

Used by: F-005, F-006, F-009, F-010 — US-007, US-008, US-009

---

### SpecFeature (embedded in SpecPack)
Fields:
- id: string
- name: string
- description: string
- priority: 'must' | 'should' | 'could' | 'wont'

Relations:
- embedded array within SpecPack.featureList

Used by: F-005, F-009 — US-007, US-008

---

### ArchitectureDraft
Fields:
- recommendedStack: StackItem[]
- moduleArchitecture: string
- dataFlow: string
- roadmapPhases: RoadmapPhase[]
- technicalRisks: string[]

Relations:
- one active ArchitectureDraft per Project
- input to first PromptIteration generation

Used by: F-006, F-009, F-010 — US-009, US-010

---

### StackItem (embedded in ArchitectureDraft)
Fields:
- name: string
- role: string
- rationale: string

Relations:
- embedded array within ArchitectureDraft.recommendedStack

Used by: F-006 — US-009

---

### RoadmapPhase (embedded in ArchitectureDraft)
Fields:
- phase: number
- title: string
- goals: string[]
- estimatedComplexity: 'low' | 'medium' | 'high'

Relations:
- embedded array within ArchitectureDraft.roadmapPhases

Used by: F-006 — US-010

---

### PromptIteration
Fields:
- id: string
- iterationNumber: number
- promptText: string
- claudeResponseRaw: string
- parsedSummary: ParsedClaudeResponse | null
- recommendedNextStep: string
- status: PromptStatus
- createdAt: string (ISO)

Relations:
- belongs to one Project (many iterations per project)

Used by: F-007 — US-011, US-012, US-013

---

### ParsedClaudeResponse (embedded in PromptIteration)
Fields:
- analysis: string
- plan: string
- changedFiles: string[]
- implementationSummary: string
- nextStep: string
- warnings: string[]

Relations:
- embedded within PromptIteration.parsedSummary

Used by: F-007, F-015 — US-012

---

## Enums

### ProjectType
- app
- website

Maps to F-025. Used by all generation functions to tailor language in SpecPack, ArchitectureDraft, and PromptIterations.
Used by: F-025 — US-015

### ProjectStage
- idea
- research
- specification
- architecture
- first_prompt
- iterative_loop
- done

Used by: F-001, F-002, F-005, F-006, F-007, F-008

### ResearchMode
- quick
- pro
- deep
- manual
- imported

Used by: F-002, F-003

### RunStatus
- idle
- queued
- running
- completed
- failed

Used by: F-002

### ResearchSourceType
- generated_in_app
- perplexity_export
- chat_export
- markdown_notes
- pasted_summary
- uploaded_document
- other

Used by: F-003, F-013

### PromptStatus
- draft
- sent
- parsed
- failed

Used by: F-007
