#!/bin/bash

# Firebase Functions Deployment Script

echo "Deploying Firebase Functions..."

# Navigate to functions directory
cd functions

# Install dependencies
echo "Installing dependencies..."
npm install

# Compile TypeScript (firebase.json also has a predeploy hook, but building
# here keeps direct runs of this script from shipping a stale lib/ output)
echo "Building functions..."
npm run build

# Deploy functions
# NOTE: the FIRST deployment of onCourseDelete (retry-enabled) requires
# --force in non-interactive shells to acknowledge the failure policy:
#   firebase deploy --only functions --force
echo "Deploying functions to Firebase..."
firebase deploy --only functions

echo "Deployment complete!"