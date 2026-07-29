# Inhavo CRM

Inhavo CRM is a modern, multi-store Customer Relationship Management (CRM) application built with **React**, **Vite**, **Tailwind CSS**, and **Firebase**. It provides comprehensive tools for lead management, customizable sales pipelines, task tracking, quotation generation, and role-based data isolation.

---

## 🚀 Tech Stack

- **Frontend Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router DOM (v7)
- **Backend & Database**: Firebase (Authentication, Cloud Firestore, Firebase Storage)
- **UI & Utilities**: `@dnd-kit` (drag-and-drop), `@react-pdf/renderer` & `pdf-lib` (PDF generation), `lucide-react` (icons)
- **PWA Support**: `vite-plugin-pwa`

---

## 📋 Prerequisites

Ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A [Firebase Project](https://console.firebase.google.com/) with **Authentication**, **Cloud Firestore**, and **Firebase Storage** enabled.

---

## 🛠️ Basic Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Inhavo_CRM
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory by copying the template file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and replace the placeholder values with your actual Firebase project configuration credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 🏃 Available Scripts

In the project directory, you can run:

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the development server with HMR at `http://localhost:5173` |
| `npm run build` | Bundles the app into static files for production in `dist/` |
| `npm run preview` | Serves the production build locally for previewing |
| `npm run lint` | Runs Oxlint to check for code quality and linting issues |

---

## ✨ Features

- **Multi-Store Segregation**: Isolated data access based on user store assignment.
- **Lead & Sales Pipeline**: Interactive Kanban board with drag-and-drop stage updates.
- **Task Management**: Assign tasks, track progress states, and filter deadlines.
- **Quotation Generator**: Build dynamic quotes, calculate totals, export PDF documents, and save to cloud storage.
- **Admin Dashboard**: Comprehensive administration panel to manage users, stores, and custom pipeline stages.
