# Exchange Notes UI System

All new screens and UI redesigns should follow this system.

## Typography

- Page title: 28px, semibold, -0.02em
- Section title: 20px, semibold, -0.02em
- Card title: 18px, semibold, -0.02em
- Body: 15px, regular, 24px line height
- Caption: 11px, medium
- Label: 10px, semibold, uppercase, 0.26em tracking

Use the same sans-serif family throughout the app.

## Radius

- Cards and large surfaces: 24px
- Buttons, inputs and filter controls: full pill radius

Avoid introducing unrelated radius values.

## Spacing

Prefer this scale:

- 8px
- 12px
- 16px
- 24px
- 32px
- 48px

## Colors

- App background: #F6F5F2
- Main surface: #FFFFFF
- Muted/dashboard surface: #ECEAE4
- Standard border: rgba(0, 0, 0, 0.07)

## Shadows

Standard card:

    0 8px 22px rgba(0, 0, 0, 0.045)

Interactive hover:

    0 16px 36px rgba(0, 0, 0, 0.08)

## Components

Use components from:

    components/design-system

Available foundation components:

- Card
- Button
- Label
- PageHeader
- Pill

Do not duplicate these styles inside feature components unless the design genuinely requires a new reusable pattern.
