# KINÉTIKA - Redefining Fitness Education

A comprehensive Next.js application for fitness education and professional certification preparation, built with Firebase integration and AI-powered tutoring capabilities.

## Getting Started

### Prerequisites
- Node.js 20 or higher
- npm 10 or higher

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your Firebase credentials:
```bash
cp .env.example .env.local
```

3. Install dependencies:
```bash
npm install
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

## Build & Production

### Local Build
```bash
npm run build
npm start
```

### Deployment to Netlify

#### Option 1: Connect GitHub Repository (Recommended)

1. Push your code to GitHub
2. Go to [Netlify](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Select GitHub and authorize
5. Choose the repository and configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: 20

6. Add environment variables in Netlify:
   - Go to Site settings → Build & deploy → Environment
   - Add all `NEXT_PUBLIC_FIREBASE_*` variables from your `.env.local`

7. Deploy!

#### Option 2: Deploy via Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Deploy:
```bash
netlify deploy --prod
```

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # Reusable React components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and configurations
├── ai/              # AI/Genkit integration
└── ...
```

## Key Features

- 📚 Complete 26-chapter curriculum aligned with CSCS exam
- 🤖 AI-powered exam prep tutor
- 🔐 Firebase authentication
- 💾 Firestore database integration
- 📱 Responsive design with Tailwind CSS
- ♿ Accessible UI components

## Environment Variables

See `.env.example` for required Firebase configuration variables. These should be set in your Netlify environment variables for production deployment.

## Technologies Used

- **Framework**: Next.js 15
- **UI**: React 19 with Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **AI**: Google Genkit
- **Components**: Radix UI
- **Styling**: Tailwind CSS & PostCSS

## Build Notes for Netlify

- Uses standalone Next.js output for optimal Netlify performance
- TypeScript and ESLint errors are ignored during build (review code quality separately)
- Static images optimized with Next.js Image component
- Caching headers configured for static assets

## Troubleshooting

### Build fails on Netlify
- Check that all environment variables are set correctly
- Ensure Node version is 20 or higher
- Clear Netlify cache and redeploy

### Firebase not working
- Verify all `NEXT_PUBLIC_FIREBASE_*` environment variables are correct
- Check Firebase project settings and security rules

## License

Proprietary - All rights reserved
