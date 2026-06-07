#!/bin/bash

# Firebase Functions Deployment Script

echo "Deploying Firebase Functions..."

# Navigate to functions directory
cd functions

# Install dependencies
echo "Installing dependencies..."
npm install

# Deploy functions
echo "Deploying functions to Firebase..."
firebase deploy --only functions

echo "Deployment complete!"