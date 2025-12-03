#!/bin/bash

# Script to push code to two GitHub accounts
# Usage: ./push-to-both.sh

# First remote (already configured)
REMOTE1="origin"
REMOTE1_URL="https://github.com/txlcodes/csmr-fullstack.git"

# Second remote - UPDATE THIS WITH YOUR SECOND GITHUB REPOSITORY URL
REMOTE2="origin2"
REMOTE2_URL="https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

echo "Pushing to first remote: $REMOTE1"
git push $REMOTE1 $CURRENT_BRANCH

# Check if second remote exists, if not add it
if git remote get-url $REMOTE2 &>/dev/null; then
    echo "Pushing to second remote: $REMOTE2"
    git push $REMOTE2 $CURRENT_BRANCH
else
    echo ""
    echo "Second remote not configured yet."
    echo "To add second remote, run:"
    echo "  git remote add $REMOTE2 $REMOTE2_URL"
    echo ""
    echo "Or update REMOTE2_URL in this script and run it again."
fi

