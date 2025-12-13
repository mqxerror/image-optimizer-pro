#!/bin/bash

echo "Setting up GitHub remote..."
git remote add origin https://github.com/mqxerror/image-optimizer-pro.git

echo "Pushing to GitHub..."
git push -u origin main

echo "Done! Your repository is now at:"
echo "https://github.com/mqxerror/image-optimizer-pro"
