# Directory Structure

## Proposed structure

src/
  app/
    router/
    providers/
    store/
    layout/
  pages/
    home/
    idea/
    research/
    spec/
    architecture/
    prompt-loop/
    history/
  features/
    idea-input/
    research-provider-selector/
    imported-research-input/
    research-brief/
    spec-builder/
    architecture-builder/
    prompt-generator/
    response-parser/
    prompt-history/
  entities/
    project/
    research/
    specification/
    architecture/
    prompt-iteration/
  shared/
    ui/
    lib/
    types/
    constants/
    utils/
    hooks/
  mocks/
    project/
    services/

## Notes
- pages define route-level composition
- features contain user-facing workflow units
- entities contain domain-centered models
- shared contains generic reusable code
- mocks contain fake repositories and fake services for MVP development

## Rule
Do not mix domain models directly into UI files if they belong in entities/shared/types.
Keep provider-specific logic out of page components.
Keep imported research parsing and normalization outside route components.
