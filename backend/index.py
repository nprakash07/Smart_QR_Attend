"""
Vercel serverless entry point.
Vercel executes this file and looks for the `app` variable.
"""
import sys
import os

# Add the project root to Python path so we can import app.py, db/, routes/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Vercel needs this `app` symbol to run the Flask server
from app import app
