# GeoSearch SEO Analyzer

## Overview
GeoSearch SEO Analyzer is a real-time keyword research tool powered by **Google Gemini 2.5 Flash**. It provides accurate, location-based search volume estimates, competition analysis, and strategic recommendations without requiring a Google Ads account.

## Search Volume Methodology

We prioritize accuracy and transparency. Here is how our data is sourced and calculated:

### 1. Live Google Search Grounding
Unlike standard AI responses which rely on pre-trained data, this application uses the **Google Search Tool** (Grounding). 
*   **Process**: When you enter a keyword, the model executes live Google searches (e.g., *"[keyword] search volume 2024 New York"*).
*   **Source**: It scans top search results, including public SEO databases, forums, and market reports, to find the most recent volume data.

### 2. Data Synthesis & Ranges
*   **Ranges**: Because exact volume data is often proprietary, the tool often returns ranges (e.g., "1K - 10K"). These are standard brackets used in the SEO industry.
*   **Context**: The tool correlates volume with "Competition" and "Difficulty" metrics found in search snippets to provide a comprehensive view.

### 3. "Why Better" Algorithms
For alternative keywords, the AI analyzes the **Search Intent** (Informational vs. Transactional) and **Long-tail opportunities** to suggest keywords that might have lower volume but higher conversion potential.

### 4. Accuracy & Limitations
*   **Public Index**: This tool finds data that is publicly indexed. It does not access private Google Ads Keyword Planner APIs.
*   **Estimates**: All numbers are estimates based on available public information.
*   **Verification**: The "Data Verified From Sources" section in the app lists the exact URLs used to generate the report, allowing you to verify the data yourself.

## Features
*   **Geo-Location Support**: Get volume estimates specific to cities or regions.
*   **Bulk Analysis**: Drag & Drop .txt or .csv files to analyze keywords in bulk.
*   **Search History**: Automatically saves recent queries to LocalStorage.
*   **Export**: One-click CSV export for external reporting.
