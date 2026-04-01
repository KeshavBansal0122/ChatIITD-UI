# ChatIITD Frontend

A React + TypeScript frontend for the IITD Chat Agent system with DevClub OAuth authentication.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   Update the environment variables as needed.

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```bash
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:3000

# DevClub OAuth Configuration
VITE_DEVCLUB_CLIENT_ID=your_client_id_here
VITE_DEVCLUB_REDIRECT_URI=http://localhost:5173/callback
VITE_DEVCLUB_OAUTH_BASE_URL=https://oauth.devclub.in

# Demo mode - bypasses authentication for presentations
VITE_DEMO_MODE=false
```

### DevClub OAuth Setup

1. **Register Application**: Visit https://oauth.devclub.in/
2. **Get Credentials**: Obtain your `client_id` after registration
3. **Configure Redirect URI**: Set to match your frontend callback URL
4. **Update Environment**: Add credentials to `.env` file

## 🔐 Authentication Flow

The application uses DevClub OAuth for authentication:

### User Flow
1. User clicks "Continue with DevClub"
2. Frontend gets OAuth URL from backend (`/auth/signin-url`)
3. User is redirected to DevClub OAuth
4. After authentication, user is redirected back with `code` and `state`
5. Frontend sends credentials to backend (`/auth/callback`)
6. Backend validates with DevClub and returns JWT token
7. Token is stored and used for all subsequent API calls

### Technical Implementation
- **Authentication Context**: Manages auth state and token storage
- **Auto-login**: Checks for stored tokens on app load
- **Token Management**: Automatic inclusion in API requests
- **Error Handling**: Comprehensive error states and fallbacks
- **Demo Mode**: Bypass authentication for presentations

## 🏗️ Project Structure

```
src/
├── components/
│   └── Login.tsx          # Authentication UI
├── contexts/
│   └── AuthContext.tsx    # Authentication state management
├── services/
│   └── api.ts            # API service with authentication
└── main.tsx              # App entry point
```

## 🔄 Recent Updates (DevClub OAuth Migration)

### What Changed
- **OAuth URL**: Updated from `oauthdevclub.vercel.app` → `oauth.devclub.in`
- **Enhanced Flow**: Now uses backend `/auth/signin-url` endpoint for URL generation
- **Fallback Support**: Maintains compatibility with direct OAuth URL construction
- **Improved Configuration**: Better environment variable documentation

### Migration Notes
- **Backward Compatible**: Existing tokens and flow remain functional
- **Enhanced Security**: Backend-generated OAuth URLs ensure consistency
- **Better Error Handling**: Improved fallback mechanisms
- **Updated Documentation**: Complete setup and configuration guide

### Environment Updates
```bash
# NEW: Explicit OAuth base URL configuration
VITE_DEVCLUB_OAUTH_BASE_URL=https://oauth.devclub.in

# UPDATED: Better documentation and examples
# See .env.example for complete configuration
```

## 🧪 Testing

### Local Development
1. Ensure backend is running on `http://localhost:3000`
2. Configure DevClub OAuth credentials
3. Start frontend: `npm run dev`
4. Visit `http://localhost:5173`

### Demo Mode
For presentations or testing without OAuth:
```bash
VITE_DEMO_MODE=true
```

### Build Testing
```bash
npm run build
npm run preview
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## 🔗 Integration

### Backend Requirements
- DevClub OAuth endpoints (`/auth/signin-url`, `/auth/callback`)
- Chat API endpoints (`/chats`, `/chats/new`, etc.)
- Bearer token authentication support

### API Endpoints Used
- `GET /auth/signin-url` - Get OAuth signin URL
- `POST /auth/callback` - Process OAuth callback
- `GET /chats` - List user chats
- `POST /chats/new` - Create chat with first message
- `POST /chats/{id}/messages` - Send message
- `GET /chats/{id}/messages` - Get chat history

## 🎯 Features

- **DevClub OAuth Integration**: Seamless IITD authentication
- **Real-time Chat**: Interactive messaging with AI agent
- **Persistent Sessions**: Automatic login state management
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: Comprehensive error states and recovery
- **TypeScript**: Full type safety and IDE support
- **Modern Stack**: React 18, Vite, Tailwind CSS

## 🚀 Production Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Configure Environment**
   - Update `VITE_API_BASE_URL` to production backend
   - Update `VITE_DEVCLUB_REDIRECT_URI` to production domain
   - Ensure DevClub OAuth is configured for production URLs

3. **Deploy Static Files**
   - Deploy `dist/` folder to your hosting provider
   - Ensure proper routing for SPA (Single Page Application)

## 📞 Support

For issues or questions:
- Check the backend API documentation
- Verify DevClub OAuth configuration
- Review environment variable setup
- Check browser console for detailed error messages

---

Built with ❤️ for IITD community