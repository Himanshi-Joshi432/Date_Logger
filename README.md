# 📸 Date Logger – Your Life, One Memory at a Time.

**Date Logger** is a personal memory-journaling platform available as a website and mobile application. It helps users capture, organize, and revisit their memorable experiences in one place.

From special occasions and trips to everyday moments, Date Logger allows users to preserve their memories with photos, dates, locations, and personal experiences.

The idea is simple: **Capture moments today. Relive them tomorrow.**

---

## ✨ Features

### 📅 Memory Management
- Create and save personal memories.
- Add dates and venue information.
- Organize experiences in one place.
- Revisit previously saved memories.

### 🖼️ Photo Memories
- Upload images with personal memories.
- Store and manage media using ImageKit.
- Preserve memorable moments visually.

### 🎵 Background Music
- Add music to individual memories. 
- Make personal moments more expressive. 

### 🔐 Authentication & User Management
- User registration and login.
- User-specific memory management.
- Secure access to personal data.

### 🌐 Cross-Platform Experience
- Access Date Logger through its web application.
- Use the mobile application to manage and revisit memories.
- Shared backend infrastructure for data management.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | REST API |
| MongoDB | Database |
| Mongoose | Database modeling |
| ImageKit | Image storage and management |
| JavaScript | Application development |
| JWT | Authentication (if implemented) |

*The frontend and mobile technologies can be documented separately based on their implementation.*

---

## 🏗️ System Architecture

Date Logger follows a client-server architecture.

```text
       ┌─────────────────────┐
       │                     │
       │    Web Application  │
       │                     │
       └──────────┬──────────┘
                  │
                  │
       ┌──────────▼──────────┐
       │                     │
       │   Mobile Application│
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │                     │
       │    Express Server   │
       │     (Node.js)       │
       │                     │
       └──────────┬──────────┘
                  │
          ┌───────┴────────┐
          │                │
          ▼                ▼
   ┌─────────────┐  ┌─────────────┐
   │             │  │             │
   │   MongoDB   │  │   ImageKit  │
   │             │  │             │
   └─────────────┘  └─────────────┘
```

---

## 📂 Project Structure

```text
Date-Logger/
│
├── Backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── Frontend/
│   ├── public/
│   ├── src/
│   └── package.json
│
├── Mobile-App/
│   └── ...
│
├── .gitignore
└── README.md
```

*Folder structure is illustrative. Update it to match your actual repository.*

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- MongoDB or a MongoDB Atlas account
- Git

### 1. Clone the Repository

```bash
git clone (https://github.com/Himanshi-Joshi432/Date_Logger.git)
cd Date-Logger
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

### 3. Environment Configuration

Create a `.env` file inside the Backend directory.

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
```

Replace the placeholder values with your actual credentials.

**Security:** Never commit your `.env` file or expose private API keys and database credentials.

### 4. Start Backend

```bash
npm run dev
```

If a development script is not configured:

```bash
node server.js
```

### 5. Frontend Setup

Open another terminal:

```bash
cd Frontend
npm install
npm run dev
```

Open the local URL provided by your development server.

### 6. Mobile Application Setup

Navigate to the mobile application directory and follow its platform-specific installation instructions.

Make sure the mobile application is configured to communicate with your backend API.

---

## 🗄️ Database Structure

Date Logger uses MongoDB to store application data.

Memory records can include:

| Field | Description |
|---|---|
| Date | Date of the memory |
| Venue | Location associated with the memory |
| Image | Uploaded memory photograph |
| Created By | User who created the memory |
| Saved By | Users who saved the memory |

---

## 🔌 Backend API

The backend provides REST APIs for communication between the applications and database.

Main API modules include:

- Authentication
- User Management
- Memory / Post Management
- Saved Memories
- Image Upload

---

## 📸 Screenshots & Preview

Add screenshots of your website and mobile application here to showcase the interface.

```text
screenshots/
├── website-home.png
├── website-dashboard.png
├── mobile-home.png
└── mobile-memory-view.png
```

---

## 🔮 Future Enhancements

- [ ] Background music integration for memories.
- [ ] Interactive memory timeline.
- [ ] Calendar-based memory organization.
- [ ] Advanced search and filtering.
- [ ] Improved mobile experience.
- [ ] Memory sharing functionality.
- [ ] Enhanced media management.
- [ ] Push notifications and memory reminders.

---

## 🎯 Project Vision

Date Logger is built around the idea that memories deserve more than a place in a camera gallery.

It aims to create a personal digital space where users can document their experiences, attach photographs, organize important dates, and revisit meaningful moments.

**Because every moment has a story worth remembering.**

---

## 👩‍💻 Developer

**Himanshi Joshi**

- GitHub: [@Himanshi-Joshi432](https://github.com/Himanshi-Joshi432)

---

## ⭐ Support

If you find this project interesting, consider giving the repository a ⭐ on GitHub.

**Date Logger – Your Life, One Memory at a Time.**
