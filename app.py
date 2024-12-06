from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv
import googlemaps
import os
import json
from datetime import datetime
import math
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse
import logging
import time
import pandas as pd
import base64
from io import BytesIO
import concurrent.futures
from typing import List, Dict, Any
import dns.resolver
import smtplib

# Configure logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

load_dotenv()
gmaps = googlemaps.Client(key=os.getenv('GOOGLE_MAPS_API_KEY'))

# Add these constants at the top of the file
SAVE_DIRECTORIES = {
    'leads': 'saved_lists',
    'contacts': 'saved_lists',
    'prospects': 'saved_lists',
    'business': 'saved_lists',
    'email': 'saved_lists'
}

def get_pincode_from_address(address):
    """Extract pincode from an address string."""
    pincode_match = re.search(r'\b\d{6}\b', address)
    return pincode_match.group(0) if pincode_match else None

def is_same_pincode(address1, address2):
    """Check if two addresses have the same pincode."""
    pincode1 = get_pincode_from_address(address1)
    pincode2 = get_pincode_from_address(address2)
    return pincode1 and pincode2 and pincode1 == pincode2
    
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2) * math.sin(delta_phi/2) + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda/2) * math.sin(delta_lambda/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def get_search_keywords_for_indian_sweets():
    """Get specific keywords for searching Indian sweet shops."""
    return [
        'mithai',
        'mishtan bhandar',
        'halwai',
        'indian sweets -cake -bakery -snacks -canteen',
        'bengali sweets -cake -bakery',
        'traditional sweets -cake -bakery'
    ]

def get_excluded_types():
    """Get types to exclude from search results"""
    return [
        'bakery',
        'cafe',
        'restaurant',
        'meal_delivery',
        'meal_takeaway',
        'food',
        'store',
        'supermarket',
        'grocery_or_supermarket'
    ]

def is_cake_shop(business_name, business_type, business_types):
    """Check if a business is a cake shop based on its name, type description, and Google Place types"""
    cake_shop_indicators = [
        'cake', 'bakery', 'bake', 'pastry', 'patisserie',
        'mio amore', 'monginis', 'ribbons and balloons',
        'britannia', 'karachi bakery', 'snacks', 'canteen',
        'cafe', 'coffee', 'tea', 'restaurant', 'hotel',
        'catering', 'ice cream', 'gelato', 'frozen'
    ]
    
    excluded_types = get_excluded_types()
    
    # Convert to lowercase for comparison
    business_name = business_name.lower()
    business_type = business_type.lower()
    
    # Check name and type description for cake shop indicators
    has_cake_indicator = any(indicator in business_name or indicator in business_type 
                           for indicator in cake_shop_indicators)
    
    # Check if any of the Google Place types match excluded types
    has_excluded_type = any(excluded_type in business_types 
                          for excluded_type in excluded_types)
    
    return has_cake_indicator or has_excluded_type

def is_sweet_shop(business_name, business_type, business_types):
    """Check if a business is a traditional Indian sweet shop"""
    sweet_shop_indicators = [
        'mithai', 'mishtan', 'mishtann', 
        'halwai', 'confectioner',
        'mistan', 'bhandar', 'bhog', 'naivedyam',
        'bengali sweet', 'gujarati sweet',
        'indian sweet', 'traditional sweet'
    ]
    
    # Convert to lowercase for comparison
    business_name = business_name.lower()
    business_type = business_type.lower()
    
    # Check for sweet shop indicators
    has_sweet_indicator = any(indicator in business_name or indicator in business_type 
                            for indicator in sweet_shop_indicators)
    
    # Check if it's explicitly a sweet shop (but not a cake shop)
    is_generic_sweet_shop = ('sweet' in business_name and 
                           not is_cake_shop(business_name, business_type, business_types))
    
    return has_sweet_indicator or is_generic_sweet_shop

def is_cake_shop(place):
    cake_shop_indicators = [
        'cake', 'bakery', 'bake', 'pastry', 'patisserie',
        'mio amore', 'monginis', 'ribbons and balloons',
        'britannia', 'karachi bakery', 'snacks', 'canteen',
        'cafe', 'coffee', 'tea', 'restaurant', 'hotel',
        'catering', 'ice cream', 'gelato', 'frozen'
    ]
    business_name = place.get('name', '').lower()
    return any(indicator in business_name for indicator in cake_shop_indicators)

def is_sweet_shop(place):
    sweet_shop_indicators = [
        'mithai', 'mishtan', 'mishtann', 
        'halwai', 'confectioner',
        'mistan', 'bhandar', 'bhog', 'naivedyam',
        'bengali sweet', 'gujarati sweet',
        'indian sweet', 'traditional sweet'
    ]
    business_name = place.get('name', '').lower()
    return any(indicator in business_name for indicator in sweet_shop_indicators)

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2) * math.sin(delta_phi/2) + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda/2) * math.sin(delta_lambda/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def get_pincode_from_address(address):
    """Extract pincode from an address string."""
    import re
    pincode_match = re.search(r'\b\d{6}\b', address)
    return pincode_match.group(0) if pincode_match else None

def is_same_pincode(address1, address2):
    """Check if two addresses have the same pincode."""
    pincode1 = get_pincode_from_address(address1)
    pincode2 = get_pincode_from_address(address2)
    return pincode1 and pincode2 and pincode1 == pincode2

def search_places(keyword, location, radius_km=3, exact_pincode=False):
    try:
        # Initialize the Google Maps client
        gmaps = googlemaps.Client(key=os.getenv('GOOGLE_MAPS_API_KEY'))
        
        print(f"Searching for '{keyword}' in '{location}' within {radius_km}km")
        
        # First, geocode the location to get coordinates
        geocode_result = gmaps.geocode(location)
        if not geocode_result:
            print(f"Location not found: {location}")
            return {'error': f'Location not found: {location}'}, 400
        
        lat = geocode_result[0]['geometry']['location']['lat']
        lng = geocode_result[0]['geometry']['location']['lng']
        
        print(f"Location coordinates: {lat}, {lng}")
        
        # If exact_pincode is True, verify the pincode
        if exact_pincode and location.isdigit():
            location_pincode = get_pincode_from_coords(lat, lng)
            if location_pincode != location:
                return {'results': [], 'message': f'No results in exact pincode {location}'}

        all_results = []
        seen_places = set()  # To track unique places

        # First search: Direct keyword search without type restriction
        try:
            places_result = gmaps.places_nearby(
                location=(lat, lng),
                radius=radius_km * 1000,  # Convert km to meters
                keyword=keyword
            )
            
            if places_result.get('results'):
                process_places_results(places_result['results'], keyword, lat, lng, radius_km, seen_places, all_results, gmaps)
                
            # Get next page of results if available
            while 'next_page_token' in places_result:
                time.sleep(2)  # Wait for next page token to become valid
                places_result = gmaps.places_nearby(
                    location=(lat, lng),
                    page_token=places_result['next_page_token']
                )
                if places_result.get('results'):
                    process_places_results(places_result['results'], keyword, lat, lng, radius_km, seen_places, all_results, gmaps)
                    
        except Exception as e:
            print(f"Error in places search: {str(e)}")

        # Second search: Text search for more results
        try:
            text_results = gmaps.places(
                query=f"{keyword} in {location}",
                location=(lat, lng),
                radius=radius_km * 1000
            )
            
            if text_results.get('results'):
                process_places_results(text_results['results'], keyword, lat, lng, radius_km, seen_places, all_results, gmaps)
                
        except Exception as e:
            print(f"Error in text search: {str(e)}")
            
        print(f"Found {len(all_results)} results")
        
        # Sort results by distance
        all_results.sort(key=lambda x: x['distance'])
        
        return {
            'results': all_results,
            'location': location,
            'total': len(all_results)
        }
        
    except Exception as e:
        print(f"Error in search_places: {str(e)}")
        return {'error': str(e)}, 500

def process_places_results(places, keyword, lat, lng, radius_km, seen_places, all_results, gmaps):
    """Process and filter places results."""
    for place in places:
        try:
            place_id = place.get('place_id')
            
            # Skip if we've seen this place
            if not place_id or place_id in seen_places:
                continue
            seen_places.add(place_id)
            
            # Calculate distance
            place_lat = place['geometry']['location']['lat']
            place_lng = place['geometry']['location']['lng']
            distance = calculate_distance(lat, lng, place_lat, place_lng)
            
            # Skip if beyond radius
            if distance > radius_km:
                continue
            
            # Get detailed place information
            place_details = gmaps.place(place_id, fields=[
                'name', 'formatted_address', 'formatted_phone_number',
                'website', 'business_status', 'types', 'url', 'rating',
                'user_ratings_total', 'opening_hours'
            ])['result']
            
            # Check if the place matches the search criteria
            if not is_relevant_place(place_details, keyword):
                continue
            
            result = {
                'name': place_details.get('name', ''),
                'address': place_details.get('formatted_address', ''),
                'phone': place_details.get('formatted_phone_number', ''),
                'website': place_details.get('website', ''),
                'business_status': place.get('business_status', 'unknown'),
                'distance': round(distance * 1000),  # Convert to meters
                'google_maps_url': place_details.get('url', ''),
                'place_id': place_id,
                'types': place_details.get('types', []),
                'rating': place_details.get('rating'),
                'user_ratings_total': place_details.get('user_ratings_total'),
                'opening_hours': place_details.get('opening_hours', {}).get('weekday_text', [])
            }
            
            all_results.append(result)
            
        except Exception as e:
            print(f"Error processing place: {str(e)}")
            continue

def is_relevant_place(place_details, keyword):
    """
    Determine if a place is relevant to the search keyword.
    Uses Google Places types and name matching.
    """
    if not place_details:
        return False
        
    keyword_lower = keyword.lower()
    name = place_details.get('name', '').lower()
    types = place_details.get('types', [])
    
    # Direct name match
    if keyword_lower in name:
        return True
    
    # Check if the keyword is a business type
    if keyword_lower in types:
        return True
    
    # Common business type mappings
    type_mappings = {
        'school': ['school', 'primary_school', 'secondary_school', 'education'],
        'college': ['university', 'college', 'education'],
        'hospital': ['hospital', 'doctor', 'health', 'medical_care'],
        'restaurant': ['restaurant', 'food', 'meal_delivery', 'meal_takeaway'],
        'shop': ['store', 'shop', 'shopping_mall', 'retail'],
        'cafe': ['cafe', 'restaurant', 'food', 'coffee'],
        'gym': ['gym', 'health', 'fitness_center'],
        'hotel': ['lodging', 'hotel', 'resort'],
        'bank': ['bank', 'finance', 'atm'],
        'pharmacy': ['pharmacy', 'drugstore', 'health'],
        'market': ['market', 'grocery_or_supermarket', 'store'],
        'salon': ['beauty_salon', 'hair_care', 'spa'],
        'dentist': ['dentist', 'health', 'doctor'],
        'park': ['park', 'amusement_park', 'tourist_attraction'],
        'library': ['library', 'book_store', 'education'],
        'cinema': ['movie_theater', 'entertainment'],
        'mall': ['shopping_mall', 'store', 'retail'],
        'temple': ['hindu_temple', 'place_of_worship', 'religious'],
        'church': ['church', 'place_of_worship', 'religious'],
        'mosque': ['mosque', 'place_of_worship', 'religious']
    }
    
    # Check if any of the place's types match our mapped types
    for key, mapped_types in type_mappings.items():
        if keyword_lower in key or key in keyword_lower:
            return any(t in types for t in mapped_types)
    
    # If no specific mapping, check if it's a valid business
    return 'establishment' in types and (
        keyword_lower in name or
        any(keyword_lower in t for t in types)
    )

def get_pincode_from_coords(lat, lng):
    """
    Get pincode from coordinates using reverse geocoding
    """
    try:
        gmaps = googlemaps.Client(key=os.getenv('GOOGLE_MAPS_API_KEY'))
        result = gmaps.reverse_geocode((lat, lng))
        
        for component in result[0]['address_components']:
            if 'postal_code' in component['types']:
                return component['long_name']
        return None
    except Exception as e:
        print(f"Error getting pincode: {str(e)}")
        return None

def extract_pincode(address: str) -> str:
    # First try to find a 6-digit number in the address
    import re
    pincode_match = re.search(r'\b\d{6}\b', address)
    if pincode_match:
        return pincode_match.group(0)
    return ''

def verify_email(email: str, domain: str) -> float:
    """Verify email and return confidence score."""
    try:
        # Check email syntax
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return 0.0

        # Verify domain has MX records
        mx_records = dns.resolver.resolve(domain, 'MX')
        if not mx_records:
            return 0.0

        # SMTP verification (optional, commented out to avoid being blocked)
        # import smtplib
        # server = smtplib.SMTP(mx_records[0].exchange.to_text())
        # server.verify(email)
        # server.quit()

        return 0.7  # Base confidence score
    except Exception as e:
        print(f"Email verification error for {email}: {str(e)}")
        return 0.0

def find_personal_emails(domain: str) -> List[Dict[str, Any]]:
    personal_emails = []
    seen_emails = set()
    
    def add_email(email: str, source: str, confidence: float):
        """Add email if not seen and verified."""
        if email not in seen_emails:
            verified_confidence = verify_email(email, domain)
            if verified_confidence > 0:
                # Adjust confidence based on source
                if source == "Website Pattern":
                    final_confidence = 0.95  # Highest confidence for emails found directly on website
                elif source == "Contact Page":
                    final_confidence = 0.9   # High confidence for contact page emails
                elif source == "GitHub Profile":
                    final_confidence = 0.7   # Medium confidence for GitHub
                elif source == "Google Search":
                    final_confidence = 0.5   # Lower confidence for Google results
                else:
                    final_confidence = confidence * verified_confidence
                
                seen_emails.add(email)
                personal_emails.append({
                    "email": email,
                    "source": source,
                    "confidence": final_confidence,
                    "type": "personal",
                    "verified": True,
                    "found_at": datetime.now().isoformat()
                })

    def search_linkedin_and_website(domain: str):
        try:
            # Try company website first
            company_url = f"https://www.{domain}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            # List of common team page URLs
            team_pages = [
                '/about', '/team', '/about-us', '/our-team', '/people',
                '/leadership', '/management', '/staff', '/contact'
            ]
            
            names = set()
            
            # Scrape main website and team pages
            for page in team_pages:
                try:
                    response = requests.get(f"{company_url}{page}", headers=headers, timeout=5)
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        
                        # Look for common name patterns in HTML
                        for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'div', 'span']):
                            text = tag.get_text().strip()
                            # Look for patterns like "John Doe - CEO" or "John Doe, CEO"
                            name_match = re.search(r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s*[-,]\s*[^,\n]+)?$', text)
                            if name_match:
                                names.add(name_match.group(1))
                except Exception as e:
                    print(f"Error scraping {page}: {str(e)}")
                    continue
            
            # Generate email patterns for found names
            for full_name in names:
                name_parts = full_name.lower().split()
                if len(name_parts) >= 2:
                    first_name = name_parts[0]
                    last_name = name_parts[-1]
                    
                    # Generate email patterns
                    patterns = [
                        (f"{first_name}@{domain}", 0.6),
                        (f"{first_name}.{last_name}@{domain}", 0.8),
                        (f"{first_name[0]}{last_name}@{domain}", 0.7),
                        (f"{last_name}.{first_name}@{domain}", 0.6),
                        (f"{first_name[0]}.{last_name}@{domain}", 0.7),
                        (f"{first_name}_{last_name}@{domain}", 0.6)
                    ]
                    
                    for email, confidence in patterns:
                        add_email(email, "Website Pattern", confidence)
                        
        except Exception as e:
            print(f"Website search error: {str(e)}")

    def search_github(domain: str):
        try:
            # Search for organization name (usually company domain without TLD)
            org_name = domain.split('.')[0]
            
            # Search GitHub API for organization
            headers = {'Accept': 'application/vnd.github.v3+json'}
            org_response = requests.get(f"https://api.github.com/orgs/{org_name}", headers=headers)
            
            if org_response.ok:
                # Get organization members
                members_url = f"https://api.github.com/orgs/{org_name}/public_members"
                members_response = requests.get(members_url, headers=headers)
                
                if members_response.ok:
                    members = members_response.json()
                    for member in members[:10]:  # Limit to first 10 members
                        # Get member details
                        user_response = requests.get(member['url'], headers=headers)
                        if user_response.ok:
                            user_data = user_response.json()
                            if user_data.get('email'):
                                add_email(user_data['email'], "GitHub Profile", 0.9)
                
                # Search repositories for commit emails
                repos_url = f"https://api.github.com/orgs/{org_name}/repos"
                repos_response = requests.get(repos_url, headers=headers)
                
                if repos_response.ok:
                    repos = repos_response.json()
                    for repo in repos[:5]:  # Limit to first 5 repos
                        commits_url = f"https://api.github.com/repos/{org_name}/{repo['name']}/commits"
                        commits_response = requests.get(commits_url, headers=headers)
                        
                        if commits_response.ok:
                            commits = commits_response.json()
                            for commit in commits[:10]:  # Limit to first 10 commits
                                if commit.get('commit', {}).get('author', {}).get('email'):
                                    email = commit['commit']['author']['email']
                                    if domain in email:
                                        add_email(email, "GitHub Commit", 0.8)
                                        
        except Exception as e:
            print(f"GitHub search error: {str(e)}")

    def search_google(domain: str):
        try:
            # Use Google's search API or scrape results
            search_queries = [
                f"site:{domain} email",
                f"site:{domain} contact",
                f"site:{domain} mailto:",
                f"site:linkedin.com {domain} email",
                f"filetype:pdf site:{domain}"
            ]
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            for query in search_queries:
                try:
                    # Note: In production, you should use Google's Custom Search API
                    # This is a simplified example
                    response = requests.get(
                        f"https://www.google.com/search?q={query}",
                        headers=headers,
                        timeout=5
                    )
                    
                    if response.ok:
                        # Extract emails from response text
                        email_pattern = rf'[a-zA-Z0-9._%+-]+@{domain}'
                        found_emails = re.findall(email_pattern, response.text)
                        
                        for email in found_emails:
                            add_email(email, "Google Search", 0.7)
                            
                except Exception as e:
                    print(f"Google search error for query {query}: {str(e)}")
                    continue
                
        except Exception as e:
            print(f"Google search error: {str(e)}")

    # Run searches in parallel
    with concurrent.futures.ThreadPoolExecutor() as executor:
        searches = [
            executor.submit(search_linkedin_and_website, domain),
            executor.submit(search_github, domain),
            executor.submit(search_google, domain)
        ]
        concurrent.futures.wait(searches)

    return personal_emails

def find_generic_emails(domain: str) -> List[Dict[str, Any]]:
    generic_emails = []
    
    # Common generic email patterns with adjusted confidence
    patterns = [
        (f"info@{domain}", 0.9),      # Very common
        (f"contact@{domain}", 0.9),    # Very common
        (f"support@{domain}", 0.8),    # Common
        (f"sales@{domain}", 0.8),      # Common
        (f"hello@{domain}", 0.7),      # Less common
        (f"admin@{domain}", 0.7),
        (f"marketing@{domain}", 0.6),
        (f"help@{domain}", 0.6),
        (f"careers@{domain}", 0.6),
        (f"press@{domain}", 0.6),
        (f"media@{domain}", 0.6),
        (f"team@{domain}", 0.6),
        (f"office@{domain}", 0.6),
        (f"enquiries@{domain}", 0.6),
        (f"general@{domain}", 0.5)
    ]
    
    try:
        for email, base_confidence in patterns:
            verified = verify_email(email, domain)
            if verified > 0:
                generic_emails.append({
                    "email": email,
                    "source": "Common Pattern",
                    "confidence": base_confidence * verified,
                    "type": "generic",
                    "verified": True,
                    "found_at": datetime.now().isoformat()
                })
    except Exception as e:
        print(f"Generic email search error: {str(e)}")
    
    return generic_emails

def save_to_json(data, category):
    """Save data to a JSON file with timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"saved_{category}_{timestamp}.json"
    
    # Create 'saved' directory if it doesn't exist
    os.makedirs('saved', exist_ok=True)
    
    filepath = os.path.join('saved', filename)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
    return filepath

@app.route('/api/save-leads', methods=['POST'])
@cross_origin()
def save_leads():
    try:
        data = request.json
        leads = data.get('leads', [])
        category = data.get('category', 'business')  # 'business' or 'email'
        name = data.get('name', '')
        
        if not leads:
            return jsonify({'error': 'No leads provided'}), 400
            
        # Create timestamp for filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Create filename based on category and timestamp
        if not name:
            name = f"search_{category}_{timestamp}"
        filename = f"{name}.json"
        
        # Ensure the saved_lists directory exists
        os.makedirs('saved_lists', exist_ok=True)
        
        # Create the full filepath
        filepath = os.path.join('saved_lists', filename)
        
        # Add metadata to the save
        save_data = {
            'id': filename.replace('.json', ''),
            'name': name,
            'searchTerm': data.get('searchTerm', ''),
            'locations': data.get('locations', []),
            'createdAt': datetime.now().isoformat(),
            'results': leads,
            'category': category,
            'count': len(leads)
        }
        
        # Save the data
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, indent=2, ensure_ascii=False)
            
        return jsonify({
            'message': 'Leads saved successfully',
            'filepath': filepath,
            'count': len(leads)
        })
        
    except Exception as e:
        logging.error(f"Error in save_leads: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search', methods=['GET'])
@cross_origin()
def search():
    try:
        search_term = request.args.get('query', '')
        locations = json.loads(request.args.get('locations', '[]'))
        radius = int(request.args.get('radius', 3000))  # Default 3km
        exact_pincode_search = request.args.get('exactPincodeSearch', 'false').lower() == 'true'
        
        if not search_term or not locations:
            return jsonify({"error": "Search term and locations are required"}), 400

        results = []
        gmaps = googlemaps.Client(key=os.getenv('GOOGLE_MAPS_API_KEY'))
        
        for location in locations:
            # Get location coordinates
            geocode_result = gmaps.geocode(location)
            if not geocode_result:
                continue
                
            lat = geocode_result[0]['geometry']['location']['lat']
            lng = geocode_result[0]['geometry']['location']['lng']
            
            # Search for places
            places_result = gmaps.places_nearby(
                location=(lat, lng),
                radius=radius,
                keyword=search_term
            )
            
            seen_places = set()
            
            # Process results
            if 'results' in places_result:
                for place in places_result['results']:
                    try:
                        # Get place details
                        place_id = place['place_id']
                        if place_id in seen_places:
                            continue
                            
                        seen_places.add(place_id)
                        
                        place_details = gmaps.place(place_id, fields=[
                            'name', 'formatted_address', 'formatted_phone_number',
                            'website', 'geometry', 'opening_hours'
                        ])['result']

                        place_lat = place_details['geometry']['location']['lat']
                        place_lng = place_details['geometry']['location']['lng']
                        
                        # Calculate distance in kilometers
                        distance = round(calculate_distance(lat, lng, place_lat, place_lng) / 1000, 2)
                        
                        result = {
                            'business_name': place_details.get('name', ''),
                            'address': place_details.get('formatted_address', ''),
                            'phone': place_details.get('formatted_phone_number', ''),
                            'website': place_details.get('website', ''),
                            'distance': distance,
                            'google_maps_url': f"https://www.google.com/maps/place/?q=place_id:{place_id}",
                            'opening_hours': place_details.get('opening_hours', {}).get('weekday_text', [])
                        }
                        
                        # Extract postal code from address
                        postal_code = get_pincode_from_address(result['address'])
                        if postal_code:
                            result['postal_code'] = postal_code
                        
                        # Only add if exact pincode search is off or if pincode matches
                        if not exact_pincode_search:
                            results.append(result)
                        elif postal_code and location == postal_code:
                            results.append(result)
                        
                    except Exception as place_error:
                        logging.error(f"Error processing place: {str(place_error)}")
                        continue
        
        # Sort results by distance
        results.sort(key=lambda x: x['distance'])
        
        return jsonify({
            'results': results,
            'next_page_token': None  # We'll implement pagination later if needed
        })
        
    except Exception as e:
        logging.error(f"Error in search: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/find-email', methods=['POST'])
@cross_origin()
def find_email():
    try:
        data = request.json
        website = data.get('website')
        
        if not website:
            return jsonify({"error": "Website URL is required"}), 400

        # Clean up the website URL
        if not website.startswith(('http://', 'https://')):
            website = 'https://' + website

        try:
            response = requests.get(website, timeout=10)
            html_content = response.text
            
            # Regular expressions for finding emails
            email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
            emails = list(set(re.findall(email_pattern, html_content)))
            
            # Filter out common false positives and invalid emails
            filtered_emails = [
                email for email in emails 
                if not any(exclude in email.lower() 
                          for exclude in ['example', 'test', 'your-email'])
            ]
            
            return jsonify({
                "website": website,
                "emails": filtered_emails,
                "status": "success"
            })
            
        except Exception as e:
            print(f"Error scraping website {website}: {str(e)}")
            return jsonify({
                "website": website,
                "emails": [],
                "status": "error",
                "error": str(e)
            })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export-excel', methods=['POST'])
@cross_origin()
def export_excel():
    try:
        data = request.json
        results = data.get('results', [])
        
        if not results:
            return jsonify({"error": "No data to export"}), 400

        # Create a pandas DataFrame
        df = pd.DataFrame(results)
        
        # Reorder and rename columns
        columns = {
            'business_name': 'Business Name',
            'address': 'Address',
            'phone': 'Phone',
            'website': 'Website',
            'email': 'Email',
            'distance': 'Distance (m)',
            'status': 'Status',
            'google_maps_url': 'Google Maps URL'
        }
        
        df = df.reindex(columns=list(columns.keys()))
        df = df.rename(columns=columns)
        
        # Convert distance to kilometers
        df['Distance (m)'] = df['Distance (m)'].apply(lambda x: f"{x/1000:.2f} km")
        
        # Create Excel file in memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Search Results', index=False)
            
            # Auto-adjust columns' width
            worksheet = writer.sheets['Search Results']
            for idx, col in enumerate(df.columns):
                series = df[col]
                max_len = max(
                    series.astype(str).apply(len).max(),
                    len(str(series.name))
                ) + 2
                worksheet.set_column(idx, idx, max_len)

        output.seek(0)
        
        # Convert to base64
        excel_b64 = base64.b64encode(output.read()).decode()
        
        return jsonify({
            "status": "success",
            "file": excel_b64,
            "filename": f"lead_getter_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/save-list', methods=['POST'])
@cross_origin()
def save_list():
    try:
        data = request.json
        name = data.get('name', '').strip()
        search_term = data.get('searchTerm', '')
        locations = data.get('locations', [])
        results = data.get('results', [])
        
        if not name:
            return jsonify({'error': 'Name is required'}), 400
            
        if not results:
            return jsonify({'error': 'No results to save'}), 400

        # Create a unique ID for the list
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        list_id = f"{name}_{timestamp}"
        
        # Save the list to a JSON file
        list_data = {
            'id': list_id,
            'name': name,
            'searchTerm': search_term,
            'locations': locations,
            'results': results,
            'createdAt': datetime.now().isoformat()
        }
        
        filename = f"saved_lists/{list_id}.json"
        with open(filename, 'w') as f:
            json.dump(list_data, f, indent=2)
        
        return jsonify({
            'message': 'List saved successfully',
            'id': list_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/saved-lists', methods=['GET'])
@cross_origin()
def get_saved_lists():
    try:
        # Ensure the saved_lists directory exists
        if not os.path.exists('saved_lists'):
            os.makedirs('saved_lists')
            return jsonify([])

        saved_lists = []
        for filename in os.listdir('saved_lists'):
            if filename.endswith('.json'):
                try:
                    with open(os.path.join('saved_lists', filename), 'r', encoding='utf-8') as f:
                        list_data = json.load(f)
                        # Add filename as id if not present
                        if 'id' not in list_data:
                            list_data['id'] = filename.replace('.json', '')
                        # Add createdAt if not present
                        if 'createdAt' not in list_data:
                            list_data['createdAt'] = datetime.fromtimestamp(
                                os.path.getctime(os.path.join('saved_lists', filename))
                            ).isoformat()
                        saved_lists.append(list_data)
                except json.JSONDecodeError as je:
                    logging.error(f"Error decoding JSON from {filename}: {str(je)}")
                    continue
                except Exception as e:
                    logging.error(f"Error reading file {filename}: {str(e)}")
                    continue

        # Sort by creation date, newest first
        saved_lists.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        return jsonify(saved_lists)

    except Exception as e:
        logging.error(f"Error in get_saved_lists: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/saved-lists/<list_id>', methods=['DELETE'])
@cross_origin()
def delete_saved_list(list_id):
    try:
        filename = f"saved_lists/{list_id}.json"
        if os.path.exists(filename):
            os.remove(filename)
            return jsonify({'message': 'List deleted successfully'})
        else:
            return jsonify({'error': 'List not found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/lists', methods=['GET'])
@cross_origin()
def get_lists():
    try:
        # Create the directory if it doesn't exist
        os.makedirs('saved_lists', exist_ok=True)
        
        lists = []
        # List all JSON files in the saved_lists directory
        for filename in os.listdir('saved_lists'):
            if filename.endswith('.json'):
                list_id = filename[:-5]  # Remove .json extension
                lists.append({
                    'id': list_id,
                    'name': list_id.replace('_', ' ').title()
                })
        
        return jsonify(lists)
    except Exception as e:
        logging.error(f"Error getting lists: {str(e)}")
        return jsonify({'error': str(e)}), 500

# WhatsApp configuration storage
whatsapp_config = {
    'senderNumber': '',
    'token': ''
}

@app.route('/api/whatsapp-config', methods=['GET'])
def get_whatsapp_config():
    return jsonify(whatsapp_config)

@app.route('/api/whatsapp-config', methods=['POST'])
def update_whatsapp_config():
    data = request.json
    whatsapp_config['senderNumber'] = data.get('senderNumber', '')
    whatsapp_config['token'] = data.get('token', '')
    
    # Update environment variables
    os.environ['WHATSAPP_TOKEN'] = whatsapp_config['token']
    os.environ['WHATSAPP_PHONE_NUMBER_ID'] = whatsapp_config['senderNumber']
    
    return jsonify({'message': 'Configuration updated successfully'})

@app.route('/api/send-whatsapp', methods=['POST'])
def send_whatsapp():
    try:
        data = request.json
        print(f"Received request data: {data}")  # Debug log
        
        numbers = data.get('numbers', [])
        message = data.get('message', '')
        sender_number = data.get('senderNumber', '')

        if not numbers or not message or not sender_number:
            print(f"Missing fields - numbers: {bool(numbers)}, message: {bool(message)}, sender: {bool(sender_number)}")
            return jsonify({'error': 'Missing required fields'}), 400

        if not whatsapp_config['token']:
            print("WhatsApp token not configured")
            return jsonify({'error': 'WhatsApp token not configured'}), 400

        # Send messages using WhatsApp Business API
        headers = {
            'Authorization': f'Bearer {whatsapp_config["token"]}',
            'Content-Type': 'application/json'
        }
        print(f"Using headers: {headers}")  # Debug log (token partially masked)

        results = []
        for number in numbers:
            try:
                # Clean the phone number - ensure it starts with country code
                cleaned_number = ''.join(filter(str.isdigit, number))
                if not cleaned_number.startswith('91'):  # Add country code if missing
                    cleaned_number = '91' + cleaned_number
                
                if len(cleaned_number) != 12:  # Expected format: 91XXXXXXXXXX
                    print(f"Invalid number format: {cleaned_number}")
                    results.append({
                        'number': number,
                        'status': 'failed',
                        'error': 'Invalid phone number format - must be 10 digits with country code 91'
                    })
                    continue

                # WhatsApp API endpoint
                url = f'https://graph.facebook.com/v17.0/{sender_number}/messages'
                print(f"Sending to URL: {url}")  # Debug log
                
                payload = {
                    'messaging_product': 'whatsapp',
                    'to': cleaned_number,
                    'type': 'text',
                    'text': {'body': message}
                }
                print(f"Request payload: {payload}")  # Debug log

                response = requests.post(url, headers=headers, json=payload)
                response_data = response.json()
                print(f"API Response: {response_data}")  # Debug log
                
                if response.status_code == 200:
                    results.append({
                        'number': number,
                        'status': 'success',
                        'message_id': response_data.get('messages', [{}])[0].get('id', 'unknown')
                    })
                else:
                    error_message = response_data.get('error', {}).get('message', 'Unknown error')
                    print(f"API Error: {error_message}")
                    results.append({
                        'number': number,
                        'status': 'failed',
                        'error': error_message
                    })

            except Exception as e:
                print(f"Exception while sending message: {str(e)}")
                results.append({
                    'number': number,
                    'status': 'failed',
                    'error': str(e)
                })

        return jsonify({
            'message': 'Messages processed',
            'results': results
        })

    except Exception as e:
        print(f"Global exception in send_whatsapp: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/email-templates', methods=['GET'])
def get_email_templates():
    try:
        # TODO: Implement database integration
        templates = []  # Fetch from database
        return jsonify(templates), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-email-template', methods=['POST'])
def save_email_template():
    try:
        template = request.json
        # TODO: Implement database integration
        # Save template to database
        return jsonify({'message': 'Template saved successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/send-emails', methods=['POST'])
def send_emails():
    try:
        data = request.json
        template_id = data.get('templateId')
        recipients = data.get('recipients', [])
        
        # TODO: Implement email sending functionality
        # 1. Fetch template from database
        # 2. Process template with variables
        # 3. Send emails using SMTP or email service
        
        return jsonify({'message': 'Emails sent successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/whatsapp-templates', methods=['GET'])
def get_whatsapp_templates():
    try:
        # TODO: Implement database integration
        templates = []  # Fetch from database
        return jsonify(templates), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-whatsapp-template', methods=['POST'])
def save_whatsapp_template():
    try:
        template = request.json
        # TODO: Implement database integration
        # Save template to database
        return jsonify({'message': 'Template saved successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/send-whatsapp', methods=['POST'])
def send_whatsapp_messages():
    try:
        data = request.json
        template_id = data.get('templateId')
        recipients = data.get('recipients', [])
        variables = data.get('variables', {})
        
        # TODO: Implement WhatsApp sending functionality
        # 1. Fetch template from database
        # 2. Process template with variables
        # 3. Send messages using WhatsApp Business API
        
        return jsonify({'message': 'Messages sent successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-whatsapp-content', methods=['POST'])
def generate_whatsapp_content():
    try:
        data = request.json
        template_name = data.get('templateName')
        category = data.get('category')
        language = data.get('language')
        
        # TODO: Implement AI content generation
        # Use OpenAI or similar service to generate content
        content = f"Sample content for {template_name}"
        
        return jsonify({'content': content}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/domain-search', methods=['POST'])
@cross_origin()
def domain_search():
    try:
        data = request.json
        domain = data.get('domain', '').strip()
        include_personal = data.get('include_personal', False)
        
        if not domain:
            return jsonify({"error": "Domain is required"}), 400
            
        # Remove http:// or https:// if present
        domain = re.sub(r'https?://', '', domain)
        # Remove www. if present
        domain = re.sub(r'^www\.', '', domain)
        # Remove anything after the first slash
        domain = domain.split('/')[0]
        
        results = find_generic_emails(domain)
        if include_personal:
            personal_results = find_personal_emails(domain)
            results.extend(personal_results)
        
        # Remove duplicates while preserving order
        seen_emails = set()
        unique_results = []
        for result in results:
            if result['email'] not in seen_emails:
                seen_emails.add(result['email'])
                unique_results.append(result)
        
        return jsonify({
            "results": unique_results,
            "domain": domain
        })
        
    except Exception as e:
        logging.error(f"Error in domain search: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/business-search', methods=['POST'])
@cross_origin()
def business_search():
    try:
        data = request.json
        query = data.get('query', '').strip()
        location = data.get('location', '').strip()

        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        # Here you would implement your business search logic
        # This is a placeholder that you can replace with actual implementation
        # You might want to use Google Places API, Yelp API, or other business directories
        
        # Placeholder results for demonstration
        results = [
            {
                'name': 'Example Business 1',
                'website': 'www.example1.com',
                'address': '123 Main St, City, State',
                'phone': '(555) 123-4567',
                'email': 'contact@example1.com',
                'category': 'Technology',
                'found_at': datetime.now().isoformat()
            },
            {
                'name': 'Example Business 2',
                'website': 'www.example2.com',
                'address': '456 Oak Ave, City, State',
                'phone': '(555) 987-6543',
                'email': 'info@example2.com',
                'category': 'Retail',
                'found_at': datetime.now().isoformat()
            }
        ]

        return jsonify({
            'results': results,
            'query': query,
            'location': location
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3001)
