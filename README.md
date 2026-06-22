# Road Planner 🗺️

Plan, organize and share your journeys with ease.

Road Planner is a route planning application that helps users create, manage, and explore travel routes. Whether you're preparing for a road trip, discovering new places, or organizing waypoints for future adventures, Road Planner keeps everything in one place.

<img width="854" height="480" alt="clideo_editor_24bdcdeaefa3433f972368068762873a" src="https://github.com/user-attachments/assets/63db0398-5e8e-4eed-bcbe-2c204160e3bf" />


## ✨ Features

- 🛣️ Create and manage travel routes
- 📍 Add, edit, and organize waypoints
- ⭐ Save favorite routes and locations
- 👤 User authentication and profile management
- 🔍 Discover and explore routes
- 📱 Mobile-first experience
- ☁️ Backend API with secure data storage


## 🏗️ Architecture

```text
Road Planner
│
├── Mobile App (React Native + Expo)
│
├── Backend API (NestJS)
```

## 🛠️ Tech Stack

### Mobile

- React Native
- Expo SDK 54
- TypeScript
- Redux Toolkit
- RTK Query
- React Navigation

### Backend

- NestJS
- TypeScript
- PostgreSQL
- JWT Authentication

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- npm or yarn
- Expo CLI

### Installation

#### Clone the repository

```bash
git clone https://github.com/your-username/road-planner.git

cd road-planner
```

#### Install dependencies

```bash
npm install
```

#### Configure environment variables

Create a `.env` file:

```env
DATABASE_URL=
JWT_SECRET=
```

#### Run backend

```bash
npm run start:dev
```

#### Run mobile application

```bash
npx expo start
```

## 📂 Project Structure

```text
src/
├── authentication/
├── profile/
├── roads/
├── favorites/
├── waypoints/
└── common/
```

## 🎯 Use Cases

- Road trip planning
- Travel route organization
- Saving favorite destinations
- Managing travel checkpoints

## 🔮 Future Plans

- Route sharing
- Public route discovery
- Map integrations
- AI-powered trip suggestions
- Offline support
- Social features

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

## 📄 License

This project is licensed under the MIT License.
