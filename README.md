# SciLedger

**Status: Under Development** 🚧

SciLedger is an online platform for scientific publication and peer review that uses modern technologies to facilitate the peer review process and academic collaboration.

## 🛠️ Technologies Used

### Frontend
- **SvelteKit** - Full-stack web development framework
- **TypeScript** - Typed language for JavaScript
- **Skeleton UI** - UI component library
- **Tailwind CSS** - Utility-first CSS framework

### Backend
- **Node.js** - JavaScript runtime
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Nodemailer** - Email sending service

### Authentication & Integration
- **ORCID** - Academic authentication
- **JWT** - Authentication tokens
- **Sessions** - Session management

### Deploy & Infrastructure
- **PM2** - Node.js process manager
- **Nginx** - Reverse proxy web server

## 🏗️ Design Patterns

- **MVC Pattern** - Separation of concerns
- **Repository Pattern** - Data layer abstraction
- **Component-Based Architecture** - Reusable Svelte components
- **RESTful API** - Standardized endpoints

## 🚀 Setup and Configuration

### Prerequisites
- Node.js (version 18+)
- MongoDB
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd sciledger-online
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit the `.env` file with your configurations:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/sciledger

# JWT Secrets
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# ORCID Configuration
ORCID_CLIENT_ID=your-orcid-client-id
ORCID_CLIENT_SECRET=your-orcid-client-secret
ORCID_REDIRECT_URI=http://localhost:5173/orcid/callback
ORCID_SANDBOX=true

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Application
SITE_URL=http://localhost:5173
NODE_ENV=development
```

4. **Configure MongoDB**
```bash
# Start MongoDB locally
mongod

# Or use MongoDB Atlas (cloud)
# Configure MONGODB_URI with your connection string
```

5. **Run the project**

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

### Deploy with PM2

```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Monitor logs
pm2 logs sciledger
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable components
│   ├── db/            # MongoDB models and connection
│   ├── Pages/         # Main pages
│   └── stores/        # Svelte stores
├── routes/
│   ├── (app)/         # Application routes
│   ├── (auth)/        # Authentication routes
│   └── api/           # API endpoints
└── app.html          # Main HTML template
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run linting
- `npm run format` - Format code with Prettier

## 🤝 Contributing

This project is under active development. To contribute:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📄 License

All rights reserved. See the `LICENSE` file for more details.

---

**Developed with ❤️ for the scientific community.**
