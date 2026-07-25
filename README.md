# Labeller

This project is a browser-based annotation tool for comment-level labeling. It is built for a two-branch scheme that separates slang or profanity from cyberbullying or toxicity, with enough structure to support consistent manual review on a local machine.

The app keeps the dataset and annotations in the browser using IndexedDB, so labeling can continue without a backend. A checkpoint is stored locally as well, which lets the session resume from the last position when the app is reopened.

## What it does

- Loads a JSON array of objects from disk.
- Uses the `text` field from each object as the comment to label.
- Walks through the dataset one comment at a time.
- Saves annotations locally as they are entered.
- Exports the completed labels as JSON.
- Supports clearing the local dataset and annotation store.

## Annotation scheme

Each record is labeled through two branches:

Branch A: Slang / Profanity

- `hasSlang`
- `slangExpressionType`: `explicit` or `masked_obfuscated`
- `slangIntent`: `expressive_casual` or `directed_malicious`
- Optional token-level selection of slang words from the comment text

Branch B: Cyberbullying / Toxicity

- `hasCyberbullying`
- `bullyingStyle`: `explicit` or `implicit_sarcastic`
- `targetEntity`: `individual`, `group_community`, or `organization`
- `toxicVectors`: `body_shaming`, `gender_based_sexual`, `religious_communal`, `intellectual_status`, `threat_violence`
- `severityLevel`: `low`, `medium`, or `high`

Records can also be skipped. Skipped items stay in the local store but are omitted from export.

## Requirements

- Node.js 18 or newer
- npm

## Setup

Install dependencies from the `Labeller` directory:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in the browser.

## How to use it

1. Load a dataset from the sidebar using `Load JSON`.
2. Provide a JSON array where each object contains a non-empty `text` field.
3. Read the comment shown in the main panel.
4. Fill the applicable branch fields and choose any slang tokens if needed.
5. Use `Save & Next` to store the annotation and move forward.
6. Use `Skip` when the item should not be labeled.
7. Use `Previous` to move back if a correction is needed.
8. Export the finished set from the sidebar.

## Input format

The loader accepts an array of objects such as:

```json
[
	{ "text": "Example comment one" },
	{ "text": "Example comment two" }
]
```

Only the `text` field is used by the annotator. Rows without valid text are ignored.

## Output format

Exported files contain the saved annotations in JSON with a serial number, the dataset `id`, the original `text`, and both branch payloads.

## Notes

- Data is stored locally in the browser database named `LabellerDB`.
- Reloading a new dataset clears the current local dataset and annotations.
- The app restores the last visited position when the loaded dataset matches the saved checkpoint.

## Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm start` - run the production build
- `npm run lint` - run ESLint
