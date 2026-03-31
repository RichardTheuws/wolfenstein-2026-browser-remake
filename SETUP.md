# Infernal Assault - Setup Guide

This document provides detailed instructions for setting up the Infernal Assault development environment.

## Prerequisites

- **Node.js**: v14.x or higher
- **npm**: v6.x or higher
- **Modern web browser** with WebGL support (Chrome, Firefox, Safari, Edge)
- **Git**: For version control

## Development Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/infernal-assault.git
cd infernal-assault
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- Three.js for 3D rendering
- Jest for testing
- ESLint for code quality
- JSDoc for documentation generation

### 3. Development Server

Start the development server:

```bash
npm run dev
```

This will:
- Start a local development server
- Watch for file changes and automatically reload
- Open your default browser to http://localhost:3000

### 4. Building for Production

```bash
npm run build
```

This creates an optimized production build in the `/dist` directory.

### 5. Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

## Project Structure

The project follows a Domain-Driven Design approach with these main directories:

- `/src/Domain`: Core game domain models and business logic
- `/src/Application`: Application services and use cases
- `/src/Infrastructure`: External services and technical implementations
- `/src/Interface`: User interfaces and controllers

## Editor Configuration

### Recommended VSCode Extensions

- ESLint
- Prettier
- JavaScript and TypeScript Nightly
- Three.js Snippets
- Live Server

### VSCode Settings

Create or update `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["javascript"],
  "javascript.updateImportsOnFileMove.enabled": "always"
}
```

## Troubleshooting

### Common Issues

1. **WebGL not supported**
   - Check if your browser supports WebGL at [WebGL Report](https://webglreport.com)
   - Update your graphics drivers
   - Enable hardware acceleration in your browser

2. **Dependencies installation fails**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`

3. **Development server doesn't start**
   - Check if port 3000 is already in use
   - Try changing the port in the dev script configuration

## Getting Help

If you encounter any issues not covered in this guide:

1. Check the project issues on GitHub
2. Consult the documentation in the `/docs` directory
3. Contact the development team

## Next Steps

After setting up your environment, we recommend:

1. Read through the [README.md](./README.md) for project overview
2. Review the [ROADMAP.md](./ROADMAP.md) to understand future development plans
3. Check [CHANGELOG.md](./CHANGELOG.md) for recent updates
