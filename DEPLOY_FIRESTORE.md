# Deploy Firestore Rules & Composite Indexes

This guide covers **Firestore Security Rules** (`firestore.rules`) and **Composite Indexes** (`firestore.indexes.json`) for Enterprise and other collections.

---

## Option A: Firebase Console (no CLI)

### 1. Deploy Security Rules

1. Open [Firebase Console](https://console.firebase.google.com) → your project.
2. Go to **Firestore Database** → **Rules**.
3. Replace the entire rules editor content with the contents of **`firestore.rules`** in this project.
4. Click **Publish**.

### 2. Create Composite Indexes

1. In Firestore, go to **Indexes** → **Composite** tab.
2. Create **two** indexes. For each, click **Create index**, then:

**Index 1**
- **Collection ID**: `enterpriseInvites`
- **Add field**: path `email`, order **Ascending**
- **Add field**: path `status`, order **Ascending**
- **Query scope**: Collection
- Click **Create**

**Index 2**
- **Collection ID**: `enterpriseInvites`
- **Add field**: path `enterpriseId`, order **Ascending**
- **Add field**: path `status`, order **Ascending**
- **Query scope**: Collection
- Click **Create**

3. Building can take a few minutes.

**Single-field index (`userSettings.enterpriseId`)**  
Queries on `userSettings` by `enterpriseId` use a single field. Firebase usually auto-indexes this. If you get an error that an index is required, add it under **Indexes** → **Single field**: collection `userSettings`, field `enterpriseId`, indexing enabled.

---

## Option B: Firebase CLI

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login & select project

```bash
firebase login
firebase use <your-project-id>
```

Use the same **Project ID** as in your `.env` (`VITE_FIREBASE_PROJECT_ID`). To list projects:

```bash
firebase projects:list
```

### 3. Deploy rules and indexes

**Run from the project root** (the folder that contains `firebase.json`, `firestore.rules`, and `package.json`). If you see "Not in a Firebase app directory", you're in the wrong folder — `cd` there first.

```bash
cd path\to\Clock_in_app
# Deploy both rules and indexes
firebase deploy --only firestore

# Or deploy separately:
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Indexes may take a few minutes to build. Check status in **Firestore → Indexes** in the console.

---

## Verify

- **Rules**: In Firestore → Rules, confirm the updated rules are published.
- **Indexes**: In Firestore → Indexes → Composite, confirm the two `enterpriseInvites` indexes exist and show **Enabled**.

---

## Files

- **`firestore.rules`** – Security rules (sessions, userSettings, enterprises, enterpriseInvites, etc.).
- **`firestore.indexes.json`** – Composite index definitions for Enterprise.
- **`firebase.json`** – Firebase CLI config (rules + indexes paths).
